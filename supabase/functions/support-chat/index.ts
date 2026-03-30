import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SYSTEM_PROMPT = `You are Cluedox's friendly support assistant. Help users with questions about Cluedox, an AI-powered file management app.

Key features:
- AI auto-tagging, summaries, entity extraction on every upload
- 10+ search methods: keyword, natural language, semantic, entity, date, tag, summary search
- Smart reminders with AI-detected expiry dates
- WhatsApp integration (paid plans): upload, search, retrieve docs via WhatsApp
- File sharing with expiry links
- AI document chat for Q&A on uploaded files
- Smart folders with auto-categorization

Pricing (INR):
- Free (₹0/mo): 100MB storage, 25 uploads, AI features, web only
- Starter (₹299/mo): 1GB, unlimited uploads, WhatsApp alerts
- Pro (₹799/mo): 50GB, full WhatsApp chatbot, 5 team members
- Business (₹2,499/mo): 1TB, unlimited team, SSO, integrations
- Enterprise (custom): unlimited, on-premise, custom AI

Be concise, helpful, and friendly. If users ask about something not yet available, say it's coming soon.`;

    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      return new Response(JSON.stringify({ reply: "AI is currently being configured. Please try again later!" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${geminiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages.slice(-10),
        ],
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", errText);
      return new Response(JSON.stringify({ reply: "I'm having a brief hiccup. Please try again!" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Could you rephrase that?";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Support chat error:", e);
    return new Response(JSON.stringify({ reply: "Something went wrong. Please try again!" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
