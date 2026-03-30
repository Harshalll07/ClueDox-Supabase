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

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const { messages, fileIds } = await req.json();
    if (!messages || !Array.isArray(messages)) throw new Error("Missing messages");

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    let fileContext = "";
    if (fileIds && fileIds.length > 0) {
      const { data: files } = await serviceClient
        .from("files")
        .select("file_name, ai_summary, extracted_text, entities, expiry_date, semantic_keywords")
        .in("id", fileIds)
        .eq("user_id", user.id);

      if (files) {
        fileContext = files.map(f =>
          `--- FILE: ${f.file_name} ---\nSummary: ${f.ai_summary || 'N/A'}\nExtracted Text: ${(f.extracted_text || '').substring(0, 3000)}\nEntities: ${JSON.stringify(f.entities || [])}\nExpiry: ${f.expiry_date || 'None'}\nKeywords: ${f.semantic_keywords || 'N/A'}`
        ).join("\n\n");
      }
    } else {
      const { data: files } = await serviceClient
        .from("files")
        .select("file_name, ai_summary, extracted_text, entities, expiry_date")
        .eq("user_id", user.id)
        .order("upload_date", { ascending: false })
        .limit(20);

      if (files) {
        fileContext = files.map(f =>
          `--- FILE: ${f.file_name} ---\nSummary: ${f.ai_summary || 'N/A'}\nExtracted Text: ${(f.extracted_text || '').substring(0, 1500)}\nEntities: ${JSON.stringify(f.entities || [])}\nExpiry: ${f.expiry_date || 'None'}`
        ).join("\n\n");
      }
    }

    const systemPrompt = `You are Cluedox AI, a smart document assistant. Help users find information across their uploaded documents.

You have access to the user's documents below. Answer questions accurately based on the document content. Citations are encouraged.
Be concise but thorough. Cite which document the information is from.

USER'S DOCUMENTS:
${fileContext || "No documents uploaded yet."}`;

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${geminiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini error:", response.status, errText);
      throw new Error(`AI error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("doc-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
