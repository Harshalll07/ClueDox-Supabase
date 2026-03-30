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

    const { folderName, subfolderName, fileIds } = await req.json();
    if (!fileIds || fileIds.length === 0) throw new Error("No files to categorize");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY not configured");

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: files } = await serviceClient
      .from("files")
      .select("id, file_name, file_type, ai_summary")
      .in("id", fileIds)
      .eq("user_id", user.id);

    if (!files) throw new Error("Files not found");

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
            content: `Organize files in "${subfolderName}" (${folderName}). Create 2-3 specific sub-categories.`,
          },
          {
            role: "user",
            content: `Categorize these files:\n${files.map(f => `[${f.id}] ${f.file_name} - ${f.ai_summary}`).join("\n")}`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "deep_categorize",
            description: "Break files into deeper sub-categories",
            parameters: {
              type: "object",
              properties: {
                subfolders: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      fileIds: { type: "array", items: { type: "string" } },
                    },
                    required: ["name", "fileIds"],
                  },
                },
              },
              required: ["subfolders"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "deep_categorize" } },
      }),
    });

    if (!response.ok) throw new Error(`AI error: ${response.status}`);

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    const organized = toolCall ? JSON.parse(toolCall.function.arguments) : { subfolders: [] };

    return new Response(JSON.stringify(organized), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("deep-categorize error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
