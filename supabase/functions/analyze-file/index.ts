import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Size limits
const MAX_INLINE_SIZE = 15 * 1024 * 1024; // 15MB for most
const MAX_IMAGE_BASE64_SIZE = 8 * 1024 * 1024;
const MAX_PDF_BASE64_SIZE = 12 * 1024 * 1024;

// --------------------------------------------------
// HELPERS
// --------------------------------------------------
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function isVisionQuotaError(status: number, responseText: string): boolean {
  const text = responseText.toLowerCase();
  return (
    status === 429 || status === 403 ||
    text.includes("quota") || text.includes("resource_exhausted") ||
    text.includes("rate limit") || text.includes("billing") ||
    text.includes("exceeded") || text.includes("usage limit")
  );
}

function normalizeDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    const cleaned = dateStr.split("(")[0].trim();
    // Handle "Month YYYY"
    const monthYearMatch = cleaned.match(/^([A-Za-z]+)\s+(\d{4})$/);
    if (monthYearMatch) {
      const parsed = new Date(`${monthYearMatch[1]} 1, ${monthYearMatch[2]}`);
      if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
    }
    // Handle "MM/YYYY" or "MM-YYYY"
    const monthNumYearMatch = cleaned.match(/^(\d{1,2})[\/\-](\d{4})$/);
    if (monthNumYearMatch) {
      const parsed = new Date(`${monthNumYearMatch[2]}-${monthNumYearMatch[1].padStart(2, "0")}-01`);
      if (!isNaN(parsed.getTime())) return parsed.toISOString().split("T")[0];
    }
    const parsed = new Date(cleaned);
    if (isNaN(parsed.getTime())) return null;
    return parsed.toISOString().split("T")[0];
  } catch { return null; }
}

// --------------------------------------------------
// GOOGLE VISION OCR
// --------------------------------------------------
async function extractTextWithGoogleVisionPDF(base64Content: string, visionApiKey: string): Promise<string> {
  const endpoint = `https://vision.googleapis.com/v1/files:annotate?key=${visionApiKey}`;
  const requestBody = {
    requests: [{
      inputConfig: { content: base64Content, mimeType: "application/pdf" },
      features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
    }],
  };
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody) });
  const result = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(result));
  let fullText = "";
  const fileResponses = result?.responses?.[0]?.responses || [];
  for (const page of fileResponses) { if (page.fullTextAnnotation?.text) fullText += page.fullTextAnnotation.text + "\n"; }
  return fullText.trim();
}

async function extractTextWithGoogleVisionImage(base64Content: string, visionApiKey: string): Promise<string> {
  const endpoint = `https://vision.googleapis.com/v1/images:annotate?key=${visionApiKey}`;
  const requestBody = {
    requests: [{
      image: { content: base64Content },
      features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
    }],
  };
  const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody) });
  const responseText = await response.text();
  if (!response.ok) {
    if (isVisionQuotaError(response.status, responseText)) throw new Error(JSON.stringify({ provider: "google-vision", quotaExceeded: true, status: response.status }));
    throw new Error(JSON.stringify({ provider: "google-vision", status: response.status, body: responseText }));
  }
  const result = JSON.parse(responseText);
  return result?.responses?.[0]?.fullTextAnnotation?.text?.trim() || "";
}

// --------------------------------------------------
// GEMINI OCR FALLBACK
// --------------------------------------------------
async function extractTextWithGeminiOCR(base64Content: string, mimeType: string, fileName: string, geminiApiKey: string): Promise<string> {
  const aiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
  const requestBody = {
    contents: [{
      parts: [
        { text: `OCR extraction: Return EXACT text from "${fileName}". Preserving layout/lines. Return ONLY the extracted text.` },
        { inline_data: { mime_type: mimeType, data: base64Content } }
      ]
    }],
    generationConfig: { temperature: 0 }
  };
  const response = await fetch(aiEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(requestBody) });
  if (!response.ok) throw new Error(`Gemini OCR error ${response.status}`);
  const result = await response.json();
  return result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
}

async function extractTextWithOcrFallback(params: {
  base64Content: string; mimeType: string; fileName: string; googleVisionApiKey: string; geminiApiKey: string;
}): Promise<{ extractedText: string; ocrProvider: "google-vision" | "gemini-fallback" }> {
  try {
    const isPdf = params.mimeType === "application/pdf";
    const extractedText = isPdf
      ? await extractTextWithGoogleVisionPDF(params.base64Content, params.googleVisionApiKey)
      : await extractTextWithGoogleVisionImage(params.base64Content, params.googleVisionApiKey);
    return { extractedText, ocrProvider: "google-vision" };
  } catch (error: any) {
    console.warn("[OCR] Google Vision failed, falling back to Gemini OCR", error.message);
    const extractedText = await extractTextWithGeminiOCR(params.base64Content, params.mimeType, params.fileName, params.geminiApiKey);
    return { extractedText, ocrProvider: "gemini-fallback" };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/^["']|["']$/g, "")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.replace(/^["']|["']$/g, "")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")?.replace(/^["']|["']$/g, "")!;
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY")?.replace(/^["']|["']$/g, "")!;
    const googleVisionApiKey = Deno.env.get("GOOGLE_CLOUD_VISION_API_KEY")?.replace(/^["']|["']$/g, "")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY")?.replace(/^["']|["']$/g, "")!;
    const LOCAL_AUTH_BYPASS = Deno.env.get("LOCAL_AUTH_BYPASS");

    if (!geminiApiKey) throw new Error("GEMINI_API_KEY not configured");
    if (!googleVisionApiKey) throw new Error("GOOGLE_CLOUD_VISION_API_KEY not configured");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);

    const body = await req.json();
    const { fileId, fileName, fileType, userId } = body;

    let user: { id: string } | null = null;
    if (LOCAL_AUTH_BYPASS && userId) {
      console.log("[AUTH] Bypassing auth check for user:", userId);
      user = { id: userId };
    } else {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) throw new Error("No authorization header");
      const token = authHeader.replace("Bearer ", "");
      const { data: { user: authUser }, error: userError } = await anonClient.auth.getUser(token);
      if (userError || !authUser) throw new Error("Unauthorized");
      user = authUser;
    }

    if (!fileId || !fileName) throw new Error("Missing fileId or fileName");

    // Set file status to 'analysing'
    await supabase.from("files").update({ file_status: "analysing" }).eq("id", fileId);

    // Download the file from storage
    if (!user || !user.id) throw new Error("Unauthorized: User not found");
    const filePath = `${user.id}/${fileName}`;
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("files")
      .download(filePath);

    if (downloadError) throw downloadError;

    // Detect modalities
    const isImage = fileType?.startsWith("image/");
    const isAudio = fileType?.startsWith("audio/");
    const isVideo = fileType?.startsWith("video/");
    const isPdf = fileType === "application/pdf";
    const isOffice = fileType?.includes("sheet") || fileType?.includes("excel") || fileType?.includes("word") || fileType?.includes("presentation") || fileType?.includes("powerpoint");
    const isTextBased = fileType?.includes("text") || fileType?.includes("json") || fileType?.includes("javascript") || fileType?.includes("typescript") || fileType?.includes("python");

    let fileBase64 = "";
    let fileContent = "";
    let extractedOcrText = "";
    let ocrProviderUsed = "none";
    let fileTooLarge = false;

    if (fileData) {
      const arrayBuffer = await fileData.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      const fileSize = bytes.length;

      if (isImage || isPdf) {
        const limit = isPdf ? MAX_PDF_BASE64_SIZE : MAX_IMAGE_BASE64_SIZE;
        if (fileSize > limit) {
          fileTooLarge = true;
          extractedOcrText = `[File too large for OCR: ${(fileSize / 1e6).toFixed(1)}MB]`;
        } else {
          fileBase64 = uint8ArrayToBase64(bytes);
          const ocr = await extractTextWithOcrFallback({
            base64Content: fileBase64,
            mimeType: fileType || (isPdf ? "application/pdf" : "image/jpeg"),
            fileName,
            googleVisionApiKey,
            geminiApiKey
          });
          extractedOcrText = ocr.extractedText;
          ocrProviderUsed = ocr.ocrProvider;
        }
      } else if (fileSize <= MAX_INLINE_SIZE) {
        fileBase64 = uint8ArrayToBase64(bytes);
        ocrProviderUsed = "native-multimodal";
      } else {
        const textDecoder = new TextDecoder("utf-8", { fatal: false });
        fileContent = textDecoder.decode(bytes).substring(0, 30000);
        ocrProviderUsed = "text-snippet";
      }
    }

    const systemPrompt = `You are Cluedox AI, a universal document and media analysis expert. 
Extract MAXIMUM useful information from the provided content.

CRITICAL INSTRUCTIONS:
1. ALWAYS respond in English by default.
2. If the user explicitly asks for another language (like Marathi), you may respond in that language.
3. Identify the "original_language" code (e.g., "mr" for Marathi, "en" for English).
4. For AUDIO/VIDEO: Provide a thorough transcription/summary of what is said and what happens visually.
5. For OFFICE (Excel/PPT): Extract key data, slide summaries, and important numbers.
6. For IMAGES: Perform high-quality OCR and describe the visual scene.
7. Output structured JSON matching the provided tool schema.`;

    const mimeTypeToUse = fileType || (isPdf ? "application/pdf" : "image/jpeg");
    const contents = [
      {
        role: "user",
        parts: [
          { text: `Analyze this file: ${fileName}. Type: ${fileType}. Provide a comprehensive summary, tags, and extracted text.` },
          fileBase64
            ? { inlineData: { mimeType: mimeTypeToUse, data: fileBase64 } }
            : { text: `File Content snippet: ${fileContent}` }
        ]
      }
    ];

    const aiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

    const requestBody = {
      contents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            tags: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  name: { type: "STRING" },
                  confidence: { type: "NUMBER" }
                },
                required: ["name", "confidence"]
              }
            },
            summary: { type: "STRING" },
            ai_description: { type: "STRING" },
            expiry_date: { type: "STRING" },
            extracted_text: { type: "STRING" },
            semantic_keywords: { type: "STRING" },
            entities: {
              type: "ARRAY",
              items: {
                type: "OBJECT",
                properties: {
                  type: { type: "STRING" },
                  value: { type: "STRING" },
                  label: { type: "STRING" }
                },
                required: ["type", "value", "label"]
              }
            },
            original_language: { type: "STRING" },
            translated_text: { type: "STRING" }
          },
          required: ["tags", "summary", "ai_description", "extracted_text", "semantic_keywords", "entities", "original_language"]
        }
      }
    };

    // Retry logic
    let aiResponse: Response | null = null;
    for (let attempt = 0; attempt <= 3; attempt++) {
      aiResponse = await fetch(aiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      if (aiResponse.ok) break;
      if ((aiResponse.status === 429 || aiResponse.status === 503) && attempt < 3) {
        const wait = Math.pow(2, attempt + 1) * 1000 + Math.random() * 1000;
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      break;
    }

    if (!aiResponse || !aiResponse.ok) {
      const errorText = aiResponse ? await aiResponse.text() : "No response";
      console.error("Gemini API error:", aiResponse?.status, errorText);
      await supabase.from("files").update({ file_status: "error" }).eq("id", fileId);
      throw new Error(`Gemini error ${aiResponse?.status}`);
    }

    const aiResult = await aiResponse.json();
    const resultText = aiResult.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) throw new Error("Empty AI response");

    const metadata = JSON.parse(resultText);

    const { error: updateError } = await supabase.from("files").update({
      ai_summary: metadata.summary,
      ai_description: metadata.ai_description,
      extracted_text: metadata.extracted_text || extractedOcrText,
      expiry_date: normalizeDate(metadata.expiry_date),
      entities: metadata.entities || [],
      semantic_keywords: metadata.semantic_keywords || "",
      original_language: metadata.original_language || "en",
      translated_text: metadata.translated_text || null,
      ai_analysis: metadata, // Store full JSON for granular access
      file_status: "ready",
    }).eq("id", fileId);

    if (updateError) throw updateError;

    // Generate Embedding if OpenAI Key exists
    if (openaiApiKey) {
      try {
        const embeddingInput = `File: ${fileName}. Summary: ${metadata.summary}. Keywords: ${metadata.semantic_keywords}. Content: ${metadata.extracted_text?.substring(0, 3000)}`;
        const embResp = await fetch("https://api.openai.com/v1/embeddings", {
          method: "POST",
          headers: { "Authorization": `Bearer ${openaiApiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "text-embedding-3-small", input: embeddingInput }),
        });
        if (embResp.ok) {
          const embData = await embResp.json();
          const embedding = embData.data?.[0]?.embedding;
          if (embedding) await supabase.from("files").update({ embedding }).eq("id", fileId);
        }
      } catch (e) {
        console.error("Embedding failed:", e);
      }
    }

    // Insert tags
    if (metadata.tags) {
      for (const tag of metadata.tags) {
        const { data: tagData } = await supabase.from("tags").upsert({ name: tag.name }, { onConflict: "name" }).select("id").single();
        if (tagData) {
          await supabase.from("file_tags").upsert({ file_id: fileId, tag_id: tagData.id, confidence: tag.confidence }, { onConflict: "file_id,tag_id" });
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("Analysis Error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
