import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY not configured");

    // Authenticate user
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const { query, fileSummaries } = await req.json();
    if (!query) throw new Error("Missing query");

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${geminiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a smart document search assistant for Cluedox. The user searched for something but no exact matches were found. Given their query and a list of their files with summaries, find files that could be RELATED to what they're looking for. Rank by relevance and provide a brief reason.`,
          },
          {
            role: "user",
            content: `User searched for: "${query}"

Their files:
${fileSummaries.map((f: any) => `ID: ${f.id} | Name: ${f.name} | Summary: ${f.summary} | Tags: ${f.tags}`).join("\n")}

Which files might be related?`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_related_files",
              description: "Return file IDs that might be related to the user's search",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        fileId: { type: "string" },
                        reason: { type: "string" },
                        confidence: { type: "number" },
                      },
                      required: ["fileId", "reason", "confidence"],
                    },
                  },
                },
                required: ["suggestions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "suggest_related_files" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini error:", response.status, errText);
      throw new Error(`AI error: ${response.status}`);
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    const { suggestions } = toolCall ? JSON.parse(toolCall.function.arguments) : { suggestions: [] };

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("smart-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", suggestions: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
