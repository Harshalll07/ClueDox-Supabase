import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_IMAGE_BASE64_SIZE = 8 * 1024 * 1024; // 8MB
const MAX_PDF_BASE64_SIZE = 10 * 1024 * 1024; // 10MB

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) throw new Error("GEMINI_API_KEY is not configured");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !user) throw new Error("Unauthorized");

    const { fileId, fileName, fileType } = await req.json();
    if (!fileId || !fileName) throw new Error("Missing fileId or fileName");

    // Set file status to 'analysing'
    await supabase.from("files").update({ file_status: "analysing" }).eq("id", fileId);

    // Download the file from storage
    const filePath = `${user.id}/${fileName}`;
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("files")
      .download(filePath);

    if (downloadError) throw downloadError;

    const isImage = fileType?.startsWith("image/");
    const isPdf = fileType === "application/pdf";
    const isDoc = fileType?.includes("word") || fileType?.includes("document") || fileType?.includes("msword");
    const isSpreadsheet = fileType?.includes("sheet") || fileType?.includes("excel") || fileType?.includes("csv");
    const isTextBased = fileType?.includes("text") || fileType?.includes("json") || fileType?.includes("xml") || fileType?.includes("csv");

    let fileContent = "";
    let fileBase64 = "";
    let useVisionModel = false;
    let fileTooLarge = false;

    if (fileData) {
      const arrayBuffer = await fileData.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const fileSize = bytes.length;

      if (isImage) {
        useVisionModel = true;
        if (fileSize > MAX_IMAGE_BASE64_SIZE) {
          fileTooLarge = true;
          fileContent = `[Large image file: ${fileName}, ${(fileSize / 1e6).toFixed(1)}MB]`;
          useVisionModel = false;
        } else {
          let binary = "";
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          fileBase64 = btoa(binary);
        }
      } else if (isPdf) {
        useVisionModel = true;
        if (fileSize > MAX_PDF_BASE64_SIZE) {
          fileTooLarge = true;
          useVisionModel = false;
          try {
            const textDecoder = new TextDecoder("utf-8", { fatal: false });
            fileContent = textDecoder.decode(bytes).substring(0, 20000);
          } catch { /* ignore */ }
        } else {
          let binary = "";
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          fileBase64 = btoa(binary);
        }
      } else if (isTextBased) {
        const textDecoder = new TextDecoder("utf-8", { fatal: false });
        fileContent = textDecoder.decode(bytes).substring(0, 15000);
      } else if (isDoc || isSpreadsheet) {
        useVisionModel = true;
        if (fileSize > MAX_PDF_BASE64_SIZE) {
          fileTooLarge = true;
          useVisionModel = false;
        } else {
          let binary = "";
          for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
          fileBase64 = btoa(binary);
        }
      } else {
        try {
          const textDecoder = new TextDecoder("utf-8", { fatal: false });
          fileContent = textDecoder.decode(bytes).substring(0, 8000);
        } catch {
          fileContent = `[Binary file: ${fileName}]`;
        }
      }
    }

    const systemPrompt = `You are an expert document analysis AI for Cluedox. Extract MAXIMUM useful metadata.

CRITICAL RULES:
1. Generate a COMPREHENSIVE summary (5-8 sentences) with ALL key info: numbers, names, dates, amounts.
2. Summary must be searchable - include synonyms and related terms.
3. Extract EVERY entity: person names, companies, dates, amounts, ID numbers, phones, emails, addresses.
4. AI description: natural language search query someone would use to find this.
5. Detect expiry/renewal/due dates.
6. extracted_text is MOST CRITICAL: Every readable word, line, number. For images, thorough OCR.
7. Support multiple languages: Detect language and set original_language code. If non-English, translate to English in translated_text.`;

    const userMessages: any[] = [];
    const visionMime = isPdf ? "application/pdf" : fileType;

    if (useVisionModel && fileBase64) {
      userMessages.push({
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this ${isPdf ? "PDF" : isImage ? "image" : "document"} thoroughly. Name: ${fileName}. OCR everything including dates and numbers.`,
          },
          {
            type: "image_url",
            image_url: { url: `data:${visionMime};base64,${fileBase64}` },
          },
        ],
      });
    } else {
      userMessages.push({
        role: "user",
        content: `Analyze this file thoroughly:
Name: ${fileName}
Content: ${fileContent || "[No text content available]"}`,
      });
    }

    const aiEndpoint = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
    const aiModel = useVisionModel ? "gemini-2.5-flash" : "gemini-2.5-flash";

    const requestBody = {
      model: aiModel,
      messages: [
        { role: "system", content: systemPrompt },
        ...userMessages,
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_metadata",
            description: "Extract comprehensive structured metadata",
            parameters: {
              type: "object",
              properties: {
                tags: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      confidence: { type: "number" },
                    },
                    required: ["name", "confidence"],
                  },
                },
                summary: { type: "string" },
                ai_description: { type: "string" },
                expiry_date: { type: "string", nullable: true },
                extracted_text: { type: "string" },
                semantic_keywords: { type: "string" },
                entities: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      value: { type: "string" },
                      label: { type: "string" },
                    },
                    required: ["type", "value", "label"],
                  },
                },
                original_language: { type: "string" },
                translated_text: { type: "string", nullable: true },
              },
              required: ["tags", "summary", "ai_description", "expiry_date", "extracted_text", "semantic_keywords", "entities", "original_language", "translated_text"],
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_metadata" } },
    };

    // Retry with exponential backoff
    let aiResponse: Response | null = null;
    for (let attempt = 0; attempt <= 3; attempt++) {
      aiResponse = await fetch(aiEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${geminiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      if (aiResponse.ok) break;
      if ((aiResponse.status === 429 || aiResponse.status === 503) && attempt < 3) {
        const wait = Math.pow(2, attempt + 1) * 1000 + Math.random() * 1000;
        console.warn(`Rate limited (${aiResponse.status}), retry ${attempt + 1}/3 in ${(wait / 1000).toFixed(1)}s`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      break;
    }

    if (!aiResponse || !aiResponse.ok) {
      const errorText = aiResponse ? await aiResponse.text() : "No response";
      console.error("Gemini API error:", aiResponse?.status, errorText);
      await supabase.from("files").update({ file_status: "error" }).eq("id", fileId);
      throw new Error(`Gemini error ${aiResponse?.status}: ${errorText.substring(0, 200)}`);
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      await supabase.from("files").update({ file_status: "error" }).eq("id", fileId);
      throw new Error("No tool call in AI response");
    }

    const metadata = JSON.parse(toolCall.function.arguments);

    // Update the file record
    const { error: updateError } = await supabase
      .from("files")
      .update({
        ai_summary: metadata.summary,
        ai_description: metadata.ai_description,
        extracted_text: metadata.extracted_text,
        expiry_date: metadata.expiry_date || null,
        entities: metadata.entities || [],
        semantic_keywords: metadata.semantic_keywords || "",
        original_language: metadata.original_language || "en",
        translated_text: metadata.translated_text || null,
        file_status: "ready",
      })
      .eq("id", fileId);

    if (updateError) throw updateError;

    // Insert tags
    for (const tag of metadata.tags) {
      const { data: tagData, error: tagError } = await supabase
        .from("tags")
        .upsert({ name: tag.name }, { onConflict: "name" })
        .select("id")
        .single();

      if (tagError || !tagData) continue;

      await supabase.from("file_tags").upsert(
        { file_id: fileId, tag_id: tagData.id, confidence: tag.confidence },
        { onConflict: "file_id,tag_id" }
      );
    }

    return new Response(JSON.stringify({ success: true, metadata }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("analyze-file error details:", e);
    // Return standard 500 error but with JSON body so frontend can read it
    return new Response(JSON.stringify({
      error: "Analysis Failed",
      details: e?.message || String(e)
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
