import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Folder, FolderOpen, ChevronRight, Loader2, FileText, Briefcase, Heart, Shield,
  Car, Home, Receipt, Image, IdCard, RefreshCw, Star, Eye, Download, GripVertical,
  Layers, MessageCircle, Sparkles,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useFiles, FileWithTags } from "@/hooks/useFiles";
import { useSmartFolders, SmartFolder, SubFolder, iconMap } from "@/hooks/useSmartFolders";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { viewFile, downloadFile } from "@/lib/fileUrl";
import { useNavigate } from "react-router-dom";
import { FileContextMenu } from "@/components/FileContextMenu";

// Types and storage logic moved to useSmartFolders hook

// --- File Item Component ---
const FileItem = ({ file, provided }: { file: FileWithTags; provided?: any }) => {
  const navigate = useNavigate();
  const isAnalysing = file.file_status === "analysing";
  const isReady = file.file_status === "ready";

  return (
    <FileContextMenu
      resource={{ id: file.id, name: file.file_name, type: "file" }}
      actions={{
        onOpen: () => viewFile(file.file_url),
        onDownload: () => downloadFile(file.file_url, file.file_name),
        onChat: () => navigate(`/chat?fileId=${file.id}`),
        onAnalyze: () => { /* Add analysis logic if needed */ },
      }}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary/30 text-sm group transition-colors cursor-pointer"
      >
        {provided && (
          <div {...(provided?.dragHandleProps || {})} className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-60 transition-opacity">
            <GripVertical className="w-3 h-3 text-muted-foreground" />
          </div>
        )}
        <div className="relative">
          <FileText className={cn("w-3.5 h-3.5 shrink-0", isReady ? "text-emerald-500" : "text-muted-foreground")} />
          {isAnalysing && (
            <div className="absolute -top-1 -right-1">
              <Loader2 className="w-2 h-2 animate-spin text-amber-500" />
            </div>
          )}
        </div>
        <span className={cn("truncate flex-1", !isReady && "text-muted-foreground/70")}>{file.file_name}</span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/chat?fileId=${file.id}`); }}
            title="Chat"
            className="p-1.5 rounded-md text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </button>
          {file.file_url && (
            <button
              onClick={(e) => { e.stopPropagation(); viewFile(file.file_url); }}
              title="View"
              className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </FileContextMenu>
  );
};

// --- Deep SubFolder Component ---
const DeepSubFolder = ({ sub, folderName, parentSubName, files }: { sub: SubFolder; folderName: string; parentSubName: string; files: FileWithTags[] | undefined }) => {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  return (
    <FileContextMenu
      resource={{ id: sub.name, name: sub.name, type: "folder" }}
      actions={{
        onOpen: () => setExpanded(!expanded),
        onChat: () => navigate(`/chat?folder=${folderName}&subfolder=${parentSubName}&deepSub=${sub.name}`),
      }}
    >
      <div className="ml-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/20 transition-colors text-left"
        >
          <Folder className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-xs font-medium flex-1">{sub.name}</span>
          <span className="text-[10px] text-muted-foreground">{sub.fileIds.length}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/chat?folder=${folderName}&subfolder=${parentSubName}&deepSub=${sub.name}`); }}
              title="Chat with this sub-category"
              className="p-1 rounded-md text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </button>
          </div>
          <ChevronRight className={cn("w-3 h-3 text-muted-foreground transition-transform", expanded && "rotate-90")} />
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden ml-4"
            >
              {sub.fileIds.map(fid => {
                const file = files?.find(f => f.id === fid);
                return file ? <FileItem key={fid} file={file} /> : null;
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </FileContextMenu>
  );
};

// --- SubFolder Component with Deep Categorize ---
const SubFolderItem = ({
  sub, folderName, files, folders, setFolders, currentFileCount,
  dragState, setDragState, saveFolders,
}: {
  sub: SubFolder;
  folderName: string;
  files: FileWithTags[] | undefined;
  folders: SmartFolder[];
  setFolders: (f: SmartFolder[]) => void;
  currentFileCount: number;
  dragState: DragState | null;
  setDragState: (s: DragState | null) => void;
  saveFolders: (f: SmartFolder[], count: number) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [deepLoading, setDeepLoading] = useState(false);
  const navigate = useNavigate();
  const subKey = `${folderName}/${sub.name}`;

  const deepCategorize = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (sub.fileIds.length < 2) {
      toast.info("Need at least 2 files to deep categorize");
      return;
    }
    setDeepLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deep-categorize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ folderName, subfolderName: sub.name, fileIds: sub.fileIds }),
      });
      if (!resp.ok) throw new Error("Failed");
      const data = await resp.json();
      if (data.subfolders && data.subfolders.length > 0) {
        const updated = folders.map(f => {
          if (f.name !== folderName) return f;
          return {
            ...f,
            subfolders: f.subfolders.map(sf => {
              if (sf.name !== sub.name) return sf;
              return { ...sf, subfolders: data.subfolders };
            }),
          };
        });
        setFolders(updated);
        saveFolders(updated, currentFileCount);
        toast.success(`"${sub.name}" broken into ${data.subfolders.length} sub-categories!`);
        setExpanded(true);
      }
    } catch {
      toast.error("Failed to deep categorize");
    } finally {
      setDeepLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove("ring-2", "ring-primary/40");
    if (!dragState) return;

    const { fileId, fromFolder, fromSub } = dragState;
    if (fromFolder === folderName && fromSub === sub.name) return;

    const updated = folders.map(f => {
      const newSubfolders = f.subfolders.map(sf => {
        // Remove from source
        if (f.name === fromFolder && sf.name === fromSub) {
          return { ...sf, fileIds: sf.fileIds.filter(id => id !== fileId) };
        }
        // Add to target
        if (f.name === folderName && sf.name === sub.name && !sf.fileIds.includes(fileId)) {
          return { ...sf, fileIds: [...sf.fileIds, fileId] };
        }
        return sf;
      });
      return { ...f, subfolders: newSubfolders };
    });

    setFolders(updated);
    saveFolders(updated, currentFileCount);
    setDragState(null);
    toast.success("File moved!");
  };

  return (
    <FileContextMenu
      resource={{ id: sub.name, name: sub.name, type: "folder" }}
      actions={{
        onOpen: () => setExpanded(!expanded),
        onChat: () => navigate(`/chat?folder=${folderName}&subfolder=${sub.name}`),
        onAnalyze: () => deepCategorize(),
      }}
    >
      <div
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("ring-2", "ring-primary/40"); }}
        onDragLeave={(e) => { e.currentTarget.classList.remove("ring-2", "ring-primary/40"); }}
        onDrop={handleDrop}
        className="rounded-lg transition-all cursor-pointer"
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/30 transition-colors text-left"
        >
          <Folder className="w-4 h-4 text-accent" />
          <span className="text-sm font-medium flex-1">{sub.name}</span>
          <span className="text-xs text-muted-foreground">{sub.fileIds.length}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/chat?folder=${folderName}&subfolder=${sub.name}`); }}
              title="Chat with this subfolder"
              className="p-1 rounded-md text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5" />
            </button>
          </div>
          <ChevronRight className={cn("w-3 h-3 text-muted-foreground transition-transform", expanded && "rotate-90")} />
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden ml-7 space-y-0.5"
            >
              {/* Deep sub-categories if they exist */}
              {sub.subfolders && sub.subfolders.length > 0 ? (
                sub.subfolders.map(deepSub => (
                  <DeepSubFolder key={deepSub.name} sub={deepSub} folderName={folderName} parentSubName={sub.name} files={files} />
                ))
              ) : (
                sub.fileIds.map(fid => {
                  const file = files?.find(f => f.id === fid);
                  return file ? (
                    <div
                      key={fid}
                      draggable
                      onDragStart={() => setDragState({ fileId: fid, fromFolder: folderName, fromSub: sub.name })}
                      onDragEnd={() => setDragState(null)}
                    >
                      <FileItem file={file} provided={{ dragHandleProps: {} }} />
                    </div>
                  ) : null;
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </FileContextMenu>
  );
};

// --- Drag state ---
interface DragState {
  fileId: string;
  fromFolder: string;
  fromSub: string;
}

// --- Main Page ---
const SmartFoldersPage = () => {
  const { data: files } = useFiles();
  const {
    folders, setFolders, saveFolders, pinnedFolders, togglePin, getSavedFileCount
  } = useSmartFolders();

  const [loading, setLoading] = useState(false);
  const [deepAllLoading, setDeepAllLoading] = useState(false);
  const [analysingFolders, setAnalysingFolders] = useState<string[]>([]);
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const navigate = useNavigate();
  const [dragState, setDragState] = useState<DragState | null>(null);

  const { getAllFileIdsInFolder } = useSmartFolders();

  const currentFileCount = files?.length || 0;
  const savedFileCount = getSavedFileCount();
  const hasNewFiles = currentFileCount > savedFileCount && folders.length > 0;

  useEffect(() => {
    if (files && files.length > 0 && folders.length === 0) {
      categorize();
    }
  }, [files]);

  const sortedFolders = [...folders].sort((a, b) => {
    const aP = pinnedFolders.includes(a.name) ? 0 : 1;
    const bP = pinnedFolders.includes(b.name) ? 0 : 1;
    return aP - bP;
  });

  const categorize = async () => {
    if (!files || files.length === 0) {
      toast.error("Upload some files first");
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/categorize-files`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({}),
      });
      if (!resp.ok) throw new Error("Failed to categorize");
      const data = await resp.json();
      const newFolders = data.folders || [];
      saveFolders(newFolders, currentFileCount);
      toast.success("Files organized into smart folders!");
    } catch {
      toast.error("Failed to categorize files");
    } finally {
      setLoading(false);
    }
  };

  const deepCategorizeAll = async () => {
    if (folders.length === 0) {
      toast.info("No folders to deep categorize");
      return;
    }
    setDeepAllLoading(true);
    let totalNew = 0;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const updated = [...folders];
      for (const folder of updated) {
        for (const sub of folder.subfolders) {
          if (sub.fileIds.length < 2 || (sub.subfolders && sub.subfolders.length > 0)) continue;
          try {
            const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deep-categorize`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session?.access_token}`,
              },
              body: JSON.stringify({ folderName: folder.name, subfolderName: sub.name, fileIds: sub.fileIds }),
            });
            if (!resp.ok) continue;
            const data = await resp.json();
            if (data.subfolders && data.subfolders.length > 0) {
              sub.subfolders = data.subfolders;
              totalNew += data.subfolders.length;
            }
          } catch { /* skip individual failures */ }
        }
      }
      saveFolders(updated, currentFileCount);
      if (totalNew > 0) {
        toast.success(`Deep categorized into ${totalNew} new sub-categories!`);
      } else {
        toast.info("No subfolders needed deeper categorization");
      }
    } catch {
      toast.error("Failed to deep categorize");
    } finally {
      setDeepAllLoading(false);
    }
  };

  const analyzeFolder = async (folder: SmartFolder) => {
    const fileIds = getAllFileIdsInFolder(folder);
    const unanalyzedFiles = files?.filter(f => fileIds.includes(f.id) && f.file_status !== "ready") || [];
    
    if (unanalyzedFiles.length === 0) {
      toast.info("All files in this folder are already analysed ✨");
      return;
    }

    setAnalysingFolders(prev => [...prev, folder.name]);
    toast.info(`Starting analysis for ${unanalyzedFiles.length} files...`);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Process in small batches to avoid edge function timeout
      for (const file of unanalyzedFiles) {
        try {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-file`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({ 
              fileId: file.id, 
              fileName: file.file_name, 
              fileType: file.file_type 
            }),
          });
        } catch (err) {
          console.error(`Failed to analyze ${file.file_name}`, err);
        }
      }
      toast.success(`Analysis started for ${folder.name}. Files will update as they finish.`);
    } catch {
      toast.error("Failed to start bulk analysis");
    } finally {
      setAnalysingFolders(prev => prev.filter(n => n !== folder.name));
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Smart Folders</h1>
              <p className="text-muted-foreground text-sm mt-1">AI organizes your files · drag to move · ⭐ to pin</p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={deepCategorizeAll} disabled={deepAllLoading || folders.length === 0} variant="outline" className="rounded-xl gap-2">
                {deepAllLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                Deep Categorize
              </Button>
              <Button onClick={categorize} disabled={loading} className="rounded-xl gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {hasNewFiles ? `Sync ${currentFileCount - savedFileCount} new` : "Sync"}
              </Button>
            </div>
          </div>
          {hasNewFiles && (
            <motion.p
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-accent mt-2 font-medium"
            >
              {currentFileCount - savedFileCount} new file(s) detected — click Sync to update
            </motion.p>
          )}
        </motion.div>

        {loading && (
          <div className="text-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Cluedox is securely organizing your files...</p>
          </div>
        )}

        {!loading && folders.length === 0 && (
          <div className="text-center py-16">
            <Folder className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No files uploaded yet. Upload files to see smart folders.</p>
          </div>
        )}

        <div className="space-y-3">
          <AnimatePresence>
            {!loading && sortedFolders.map((folder, i) => {
              const Icon = iconMap[folder.icon] || Folder;
              const isExpanded = expandedFolder === folder.name;
              const totalFiles = folder.subfolders.reduce((s, sf) => s + sf.fileIds.length, 0);
              const isPinned = pinnedFolders.includes(folder.name);

              return (
                <motion.div
                  key={folder.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => togglePin(folder.name)}
                      className={cn(
                        "p-2 rounded-lg transition-colors shrink-0",
                        isPinned ? "text-accent" : "text-muted-foreground/30 hover:text-accent/60"
                      )}
                      title={isPinned ? "Unpin folder" : "Pin folder"}
                    >
                      <Star className={cn("w-4 h-4", isPinned && "fill-current")} />
                    </button>
                    <button
                      onClick={() => setExpandedFolder(isExpanded ? null : folder.name)}
                      className="flex-1 flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-secondary/30 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        {isExpanded ? <FolderOpen className="w-5 h-5 text-primary" /> : <Icon className="w-5 h-5 text-primary" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{folder.name}</p>
                        <p className="text-xs text-muted-foreground">{totalFiles} files · {folder.subfolders.length} subfolders</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); analyzeFolder(folder); }}
                          disabled={analysingFolders.includes(folder.name)}
                          title="Analyse all files in folder"
                          className={cn(
                            "p-1.5 rounded-md transition-colors",
                            analysingFolders.includes(folder.name) 
                              ? "text-amber-500 animate-pulse" 
                              : "text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10"
                          )}
                        >
                          {analysingFolders.includes(folder.name) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/chat?folder=${folder.name}`); }}
                          title="Chat with entire folder"
                          className="p-1.5 rounded-md text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform", isExpanded && "rotate-90")} />
                      </div>
                    </button>
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden ml-10 mt-1 space-y-1"
                      >
                        {folder.subfolders.map(sub => (
                          <SubFolderItem
                            key={sub.name}
                            sub={sub}
                            folderName={folder.name}
                            files={files}
                            folders={folders}
                            setFolders={setFolders}
                            currentFileCount={currentFileCount}
                            dragState={dragState}
                            setDragState={setDragState}
                            saveFolders={saveFolders}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
};

export default SmartFoldersPage;
