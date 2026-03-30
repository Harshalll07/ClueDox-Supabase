import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY not configured");

    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ expanded: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
            content: "Expand the user's search query into related terms, synonyms, and translations (including Hindi). Return 10-20 terms.",
          },
          {
            role: "user",
            content: query,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_expanded_terms",
              description: "Return expanded search terms",
              parameters: {
                type: "object",
                properties: {
                  terms: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
                required: ["terms"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_expanded_terms" } },
      }),
    });

    if (!response.ok) throw new Error(`AI error: ${response.status}`);

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    const { terms } = toolCall ? JSON.parse(toolCall.function.arguments) : { terms: [] };

    return new Response(JSON.stringify({ expanded: terms || [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("semantic-search error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error", expanded: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
