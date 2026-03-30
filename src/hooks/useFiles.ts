import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface FileEntity {
  type: string;
  value: string;
  label: string;
}

export interface FileWithTags {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  upload_date: string;
  extracted_text: string | null;
  ai_summary: string | null;
  ai_description: string | null;
  expiry_date: string | null;
  entities: FileEntity[];
  semantic_keywords: string | null;
  file_status: "uploading" | "analysing" | "ready" | "error";
  created_at: string;
  updated_at: string;
  user_id: string;
  tags: { name: string; confidence: number }[];
}

async function fetchFiles(): Promise<FileWithTags[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // 1. Get owned files IDs
  const { data: ownedFiles, error: ownedError } = await supabase
    .from("files")
    .select("id")
    .eq("user_id", user.id);
  
  if (ownedError) throw ownedError;
  const fileIdsToFetch = new Set<string>((ownedFiles || []).map(f => f.id));

  // 2. Get directly shared file IDs
  const { data: directShares } = await supabase
    .from("resource_shares" as any)
    .select("resource_id")
    .eq("shared_with_user_id", user.id)
    .eq("resource_type", "file");
  
  if (directShares) {
    directShares.forEach((s: any) => fileIdsToFetch.add(s.resource_id));
  }

  // 3. Get files from shared folders
  const { data: sharedFolders } = await supabase
    .from("resource_shares" as any)
    .select("resource_id")
    .eq("shared_with_user_id", user.id)
    .eq("resource_type", "folder");
  
  if (sharedFolders && sharedFolders.length > 0) {
    const folderIds = sharedFolders.map((sf: any) => sf.resource_id);
    const { data: folderFiles } = await supabase
      .from("user_folder_files")
      .select("file_id")
      .in("folder_id", folderIds);
    
    if (folderFiles) {
      folderFiles.forEach(ff => fileIdsToFetch.add(ff.file_id));
    }
  }

  const allIds = Array.from(fileIdsToFetch);
  if (allIds.length === 0) return [];

  // 4. Fetch the actual file records for all collected IDs
  const allFiles: any[] = [];
  const pageSize = 500;
  for (let i = 0; i < allIds.length; i += pageSize) {
    const chunk = allIds.slice(i, i + pageSize);
    const { data, error } = await supabase
      .from("files")
      .select("*")
      .in("id", chunk)
      .order("upload_date", { ascending: false });

    if (error) throw error;
    if (data) allFiles.push(...data);
  }

  if (allFiles.length === 0) return [];

  // Fetch tags for all files (also paginated)
  const fileIds = allFiles.map((f) => f.id);
  const allFileTags: any[] = [];

  // Process in chunks of 500 IDs to avoid query limits
  for (let i = 0; i < fileIds.length; i += 500) {
    const chunk = fileIds.slice(i, i + 500);
    const { data: fileTags } = await supabase
      .from("file_tags")
      .select("file_id, confidence, tag_id, tags(name)")
      .in("file_id", chunk);

    if (fileTags) allFileTags.push(...fileTags);
  }

  const tagMap = new Map<string, { name: string; confidence: number }[]>();
  for (const ft of allFileTags) {
    const tagName = (ft as any).tags?.name;
    if (!tagName) continue;
    if (!tagMap.has(ft.file_id)) tagMap.set(ft.file_id, []);
    tagMap.get(ft.file_id)!.push({ name: tagName, confidence: ft.confidence });
  }

  return allFiles.map((f) => ({
    ...f,
    entities: (Array.isArray(f.entities) ? f.entities : []) as unknown as FileEntity[],
    tags: tagMap.get(f.id) || [],
  }));
}

export function useFiles() {
  return useQuery({
    queryKey: ["files"],
    queryFn: fetchFiles,
  });
}
