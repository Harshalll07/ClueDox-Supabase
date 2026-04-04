import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ID_PATTERNS = [
  { type: "pan", regex: /\b([A-Z]{5}\d{4}[A-Z])\b/ },
  { type: "aadhaar", regex: /\b(\d{4}\s?\d{4}\s?\d{4})\b/ },
  { type: "gst", regex: /\b(\d{2}[A-Z]{5}\d{4}[A-Z]\d[A-Z\d]{2})\b/ },
  { type: "invoice", regex: /\b(INV[\-\/]?\d{4,})\b/i },
  { type: "date", regex: /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/ },
];

function detectIntent(query: string) {
  for (const { type, regex } of ID_PATTERNS) {
    const match = query.match(regex);
    if (match) return { type, value: match[1].replace(/\s/g, "") };
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY not configured");

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const supabase = createClient(supabaseUrl, serviceKey);
    const { query } = await req.json();
    if (!query?.trim()) throw new Error("Missing query");

    const intent = detectIntent(query);
    let entityResults: any[] = [];
    if (intent) {
      const { data } = await supabase.rpc("search_files_by_entity", {
        _user_id: user.id, _entity_value: intent.value, _limit: 10,
      });
      entityResults = data || [];
    }

    // --- STEP 1: Multilingual Normalization & Embedding (OpenAI) ---
    let normalizedQuery = query;
    let queryEmbedding: number[] | null = null;
    let semanticResults: any[] = [];

    if (openaiApiKey) {
      try {
        console.log(`Normalizing query via OpenAI: ${query}`);
        const normalizeResp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: "Translate and normalize this search query into English. Return ONLY the translated query text." },
              { role: "user", content: query },
            ],
          }),
        });

        if (normalizeResp.ok) {
          const normData = await normalizeResp.json();
          normalizedQuery = normData.choices?.[0]?.message?.content?.trim() || query;
        }

        console.log(`Generating query embedding: ${normalizedQuery}`);
        const embeddingResp = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${openaiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: normalizedQuery,
          }),
        });

        if (embeddingResp.ok) {
          const embData = await embeddingResp.json();
          queryEmbedding = embData.data?.[0]?.embedding;
          
          if (queryEmbedding) {
            const { data: semData, error: semErr } = await supabase.rpc("search_files_multilingual", {
              _user_id: user.id,
              _query_text: normalizedQuery,
              _query_embedding: queryEmbedding,
              _match_threshold: 0.3,
              _limit: 20
            });
            if (semErr) console.error("Vector Search RPC error:", semErr);
            semanticResults = semData || [];
          }
        }
      } catch (err) {
        console.error("OpenAI processing error:", err);
      }
    }

    // --- STEP 2: Query Expansion & FTS (Gemini) ---
    let expandedTerms = "";
    try {
      const expandResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${geminiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gemini-2.5-flash",
          messages: [
            { role: "system", content: `Expand query into 10 synonyms/related terms (inc. Hindi). Return comma-separated.` },
            { role: "user", content: query },
          ],
          tools: [{
            type: "function",
            function: {
              name: "return_terms",
              parameters: { type: "object", properties: { terms: { type: "array", items: { type: "string" } } }, required: ["terms"] },
            },
          }],
          tool_choice: { type: "function", function: { name: "return_terms" } },
        }),
      });

      if (expandResp.ok) {
        const expandData = await expandResp.json();
        const toolCall = expandData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall) {
          const { terms } = JSON.parse(toolCall.function.arguments);
          expandedTerms = (terms || []).join(" ");
        }
      }
    } catch (e) { console.error("Expansion error:", e); }

    const { data: ftsResults, error: ftsError } = await supabase.rpc("search_files_hybrid", {
      _user_id: user.id, _query: query, _expanded_terms: expandedTerms, _limit: 20,
    });
    if (ftsError) console.error("FTS error:", ftsError);

    // --- STEP 3: Merge Results (RRF) ---
    const scoreMap = new Map<string, { file: any; rrf_score: number; source: string[] }>();
    
    // Entity matches (High priority)
    entityResults.forEach((file, i) => {
      scoreMap.set(file.id, { file, rrf_score: 1.0, source: ["entity"] });
    });

    // Semantic results
    semanticResults.forEach((res, i) => {
      const rrf = 1 / (i + 1);
      const semanticBoost = res.semantic_score > 0.6 ? 2.0 : 1.2;
      const existing = scoreMap.get(res.id);
      if (existing) {
        existing.rrf_score += rrf * semanticBoost;
        existing.source.push("semantic");
      } else {
        scoreMap.set(res.id, { file: res, rrf_score: rrf * semanticBoost, source: ["semantic"] });
      }
    });

    // FTS Results
    (ftsResults || []).forEach((file: any, i: number) => {
      const rrf = 1 / (i + 1 + 60);
      const ftsBoost = file.fts_rank > 0 ? 1 + file.fts_rank : 1;
      const existing = scoreMap.get(file.id);
      if (existing) {
        existing.rrf_score += rrf * ftsBoost;
        existing.source.push("keyword");
      } else {
        scoreMap.set(file.id, { file, rrf_score: rrf * ftsBoost, source: ["keyword"] });
      }
    });

    let mergedResults = Array.from(scoreMap.values())
      .sort((a, b) => b.rrf_score - a.rrf_score)
      .slice(0, 15);

    // --- STEP 4: AI Re-ranking (Gemini) ---
    if (mergedResults.length > 1) {
      try {
        const rerankResp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${geminiApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gemini-2.5-flash",
            messages: [
              { role: "system", content: "Rank documents by relevance to query. Return IDs and confidence. Account for multilingual query intent." },
              { role: "user", content: `Query: "${query}"\nDocuments:\n${mergedResults.map(({ file }) => `ID: ${file.id} | Name: ${file.file_name} | Summary: ${file.ai_summary}`).join("\n")}` },
            ],
            tools: [{
              type: "function",
              function: {
                name: "rank_results",
                parameters: {
                  type: "object",
                  properties: {
                    ranked: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: { fileId: { type: "string" }, confidence: { type: "number" }, reason: { type: "string" } },
                        required: ["fileId", "confidence", "reason"],
                      },
                    },
                  },
                  required: ["ranked"],
                },
              },
            }],
            tool_choice: { type: "function", function: { name: "rank_results" } },
          }),
        });

        if (rerankResp.ok) {
          const rerankData = await rerankResp.json();
          const toolCall = rerankData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall) {
            const { ranked } = JSON.parse(toolCall.function.arguments);
            if (ranked?.length > 0) {
              const rankMap = new Map<string, { index: number; confidence: number; reason: string }>(
                ranked.map((r: any, i: number) => [r.fileId, { index: i, confidence: r.confidence, reason: r.reason }])
              );
              mergedResults = mergedResults.map((item: any) => {
                const rank = rankMap.get(item.file.id);
                return { 
                  ...item, 
                  ai_confidence: rank?.confidence ?? 0.3, 
                  ai_reason: rank?.reason ?? "", 
                  ai_rank: rank?.index ?? 999 
                };
              }).sort((a: any, b: any) => (a.ai_rank ?? 999) - (b.ai_rank ?? 999) || b.rrf_score - a.rrf_score);
            }
          }
        }
      } catch (e) { console.error("Reranking error:", e); }
    }

    const results = mergedResults.map((item: any) => ({
      id: item.file.id, file_name: item.file.file_name, file_url: item.file.file_url,
      file_type: item.file.file_type, file_size: item.file.file_size,
      ai_summary: item.file.ai_summary, ai_description: item.file.ai_description,
      entities: item.file.entities, expiry_date: item.file.expiry_date,
      upload_date: item.file.upload_date, confidence: item.ai_confidence ?? Math.min(0.95, item.rrf_score * 2),
      reason: item.ai_reason ?? `Found via ${item.source.join(" & ")} search`, rrf_score: item.rrf_score,
    }));

    return new Response(JSON.stringify({
      results, intent, expandedTerms: expandedTerms.split(" ").filter(Boolean).slice(0, 10), totalFound: results.length,
      normalizedQuery,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("hybrid-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", results: [] }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
