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
    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch shared link with potential file OR folder info
    const { data: link, error: linkErr } = await supabase
      .from("shared_links")
      .select(`
        *,
        files(id, file_name, file_url, file_type, file_size),
        user_folders(id, name)
      `)
      .eq("token", token)
      .single();

    if (linkErr || !link) {
      return new Response(JSON.stringify({ error: "Invalid or removed link" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check expiry
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "This link has expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check view once
    if (link.view_once && link.viewed) {
      return new Response(JSON.stringify({ error: "This link has already been viewed" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Role from database or default
    const role = (link as any).role || "viewer";
    
    // Handle File resource
    if (link.file_id && (link as any).files) {
      const fileData = (link as any).files;
      
      let expiresIn = 3600; 
      if (link.expires_at) {
        const remaining = Math.floor((new Date(link.expires_at).getTime() - Date.now()) / 1000);
        expiresIn = Math.min(Math.max(remaining, 60), 3600);
      }

      const { data: signedData, error: signErr } = await supabase.storage
        .from("files")
        .createSignedUrl(fileData.file_url, expiresIn);

      if (signErr || !signedData?.signedUrl) {
        return new Response(JSON.stringify({ error: "Failed to generate file URL" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (link.view_once) {
        await supabase.from("shared_links").update({ viewed: true }).eq("id", link.id);
      }

      return new Response(JSON.stringify({
        type: "file",
        fileName: fileData.file_name,
        fileType: fileData.file_type,
        fileSize: fileData.file_size,
        signedUrl: signedData.signedUrl,
        role: role
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Handle Folder resource
    if (link.folder_id && (link as any).user_folders) {
      const folderData = (link as any).user_folders;
      
      // Fetch files in this folder
      const { data: folderFiles, error: filesErr } = await supabase
        .from("user_folder_files")
        .select("files(id, file_name, file_type, file_size, file_url)")
        .eq("folder_id", folderData.id);

      const files = (folderFiles || []).map((f: any) => f.files).filter(Boolean);

      if (link.view_once) {
        await supabase.from("shared_links").update({ viewed: true }).eq("id", link.id);
      }

      return new Response(JSON.stringify({
        type: "folder",
        folderName: folderData.name,
        folderId: folderData.id,
        files: files,
        role: role
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "No resource associated with this link" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: "Internal error: " + e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
