import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Share2, PanelLeftClose, PanelLeft, Pencil, Globe,
  Eye, Download, ArrowLeft, Grid3X3, List,
  MessageCircle, FolderPlus, Folder, Loader2,
  Upload, HardDrive
} from "lucide-react";
import { downloadFile, viewFile } from "@/lib/fileUrl";
import AppLayout from "./AppLayout";
import { FileContextMenu } from "@/components/FileContextMenu";
import { Input } from "@/components/ui/input";
import { useFiles } from "@/hooks/useFiles";
import type { FileWithTags } from "@/hooks/useFiles";
import FileDetailPanel from "@/components/FileDetailPanel";
import { cn } from "@/lib/utils";
import { useUploadStore } from "@/contexts/UploadContext";
import { getFileIcon, getFileColor, tagColors } from "@/data/mockFiles";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ShareDialog from "@/components/ShareDialog";
import { CommunityShareModal } from "@/components/community/CommunityShareModal";
import { CollaboratorAvatars } from "@/components/CollaboratorAvatars";
import { useSharing } from "@/hooks/useSharing";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuLabel,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useFolders } from "@/hooks/useFolders";
import { categorizeTag } from "@/lib/tagCategories";

function mapFileType(mimeType: string): "pdf" | "image" | "docx" | "spreadsheet" {
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.includes("word") || mimeType.includes("document")) return "docx";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "spreadsheet";
  return "pdf";
}

function toDetailFile(f: FileWithTags) {
  return {
    id: f.id,
    name: f.file_name,
    type: mapFileType(f.file_type),
    size: `${(f.file_size / (1024 * 1024)).toFixed(1)} MB`,
    uploadDate: new Date(f.upload_date).toLocaleDateString(),
    tags: f.tags,
    summary: f.ai_summary || "Processing...",
    expiryDate: f.expiry_date || undefined,
    extractedText: f.extracted_text || "",
    aiDescription: f.ai_description || "",
    versions: 1,
    lastAccessed: new Date(f.updated_at).toLocaleDateString(),
    fileUrl: f.file_url,
    fileType: f.file_type,
  };
}

// General categories for sidebar
const GENERAL_CATEGORIES = [
  { name: "all", icon: "📂", label: "All" },
  { name: "Personal", icon: "👤", label: "Personal" },
  { name: "Finance", icon: "💰", label: "Finance" },
  { name: "Legal", icon: "⚖️", label: "Legal" },
  { name: "Office", icon: "🏢", label: "Office" },
  { name: "Government", icon: "🏛️", label: "Government" },
  { name: "Technology", icon: "💻", label: "Technology" },
  { name: "Insurance", icon: "🛡️", label: "Insurance" },
  { name: "Education", icon: "🎓", label: "Education" },
  { name: "Real Estate", icon: "🏠", label: "Real Estate" },
  { name: "Other", icon: "📁", label: "Other" },
];

const FilesPage = () => {
  const [view, setView] = useState<"grid" | "list">("list");
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [filter, setFilter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { data: files, isLoading } = useFiles();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { addUpload } = useUploadStore();

  const handleUploadClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files) {
        Array.from(target.files).forEach(file => addUpload(file));
      }
    };
    input.click();
  };

  // Database-backed folder management
  const { folders, createFolder: createFolderMutation, deleteFolder: deleteFolderMutation, renameFolder: renameFolderMutation, addFileToFolder: addFileMutation, removeFileFromFolder: removeFileMutation } = useFolders();

  const [activeFolder, setActiveFolder] = useState<string | null>(searchParams.get("folderId"));
  const [activeSourceFolder, setActiveSourceFolder] = useState("all");
  const [showNewFolder, setShowNewFolder] = useState(false);

  // Sync active folder with URL
  useEffect(() => {
    const folderId = searchParams.get("folderId");
    if (folderId !== activeFolder) {
      setActiveFolder(folderId);
    }
  }, [searchParams]);
  const [newFolderName, setNewFolderName] = useState("");
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [shareFile, setShareFile] = useState<{ id: string; name: string } | null>(null);
  const [shareFolder, setShareFolder] = useState<{ id: string; name: string } | null>(null);
  const [showCommunityShare, setShowCommunityShare] = useState(false);

  // Sharing hook for active folder
  const { currentUserRole: folderRole } = useSharing(activeFolder || undefined, "folder");
  const isEditor = folderRole === "owner" || folderRole === "editor";

  // File rename state
  const [renamingFile, setRenamingFile] = useState<{ id: string; name: string } | null>(null);
  const [renameFileName, setRenameFileName] = useState("");

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolderMutation.mutate(newFolderName.trim());
    setNewFolderName("");
    setShowNewFolder(false);
  };

  const handleAddFileToFolder = (folderId: string, fileId: string, folderName: string) => {
    addFileMutation.mutate({ folderId, fileId });
  };

  const handleRemoveFileFromFolder = (folderId: string, fileId: string) => {
    removeFileMutation.mutate({ folderId, fileId });
  };

  const handleDeleteFolder = (folderId: string) => {
    deleteFolderMutation.mutate(folderId);
    if (activeFolder === folderId) setActiveFolder(null);
  };

  const handleRenameFolder = (folderId: string, newName: string) => {
    if (!newName.trim()) { setRenamingFolder(null); return; }
    renameFolderMutation.mutate({ folderId, newName: newName.trim() });
    setRenamingFolder(null);
  };

  const handleDeleteFile = async (fileId: string, fileName: string) => {
    try {
      const { error } = await supabase.from("files").delete().eq("id", fileId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["files"] });
      queryClient.invalidateQueries({ queryKey: ["user-folders"] });
      if (selectedFile?.id === fileId) setSelectedFile(null);
      toast.success(`"${fileName}" deleted`);
    } catch {
      toast.error("Failed to delete file");
    }
  };

  const handleRenameFile = async () => {
    if (!renamingFile || !renameFileName.trim()) { setRenamingFile(null); return; }
    try {
      const { error } = await supabase.from("files").update({ file_name: renameFileName.trim() }).eq("id", renamingFile.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["files"] });
      toast.success(`Renamed to "${renameFileName.trim()}"`);
      setRenamingFile(null);
    } catch {
      toast.error("Failed to rename file");
    }
  };

  const handleReanalyze = async (fileId: string, fileName: string, fileType: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-file`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ fileId, fileName, fileType }),
      });
      queryClient.invalidateQueries({ queryKey: ["files"] });
      toast.success("Re-analysis started!");
    } catch {
      toast.error("Failed to refresh tags");
    }
  };

  // Compute categories with counts using tag categorization
  const categoryCounts = (files || []).reduce((acc, f) => {
    const cats = new Set<string>();
    f.tags.forEach((t) => {
      cats.add(categorizeTag(t.name));
    });
    if (cats.size === 0) cats.add("Other");
    cats.forEach((cat) => {
      acc[cat] = (acc[cat] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const visibleCategories = GENERAL_CATEGORIES.filter(
    (c) => c.name === "all" || (categoryCounts[c.name] || 0) > 0
  );

  const activeFolderData = folders.find(f => f.id === activeFolder);

  const filtered = (files || []).filter((f) => {
    if (activeFolder && activeFolderData) {
      if (!activeFolderData.fileIds.includes(f.id)) return false;
    }

    // Apply source filter logic
    if (activeSourceFolder === "all") return false; // IMPORTANT: hide all files by default

    const fileSource = (f as any).source || (f.file_url?.includes('drive') ? 'drive' : 'upload');
    if (fileSource !== activeSourceFolder) return false;

    const matchesSearch =
      f.file_name.toLowerCase().includes(filter.toLowerCase()) ||
      f.tags.some((t) => t.name.toLowerCase().includes(filter.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || f.tags.some((t) => categorizeTag(t.name) === selectedCategory) || (selectedCategory === "Other" && f.tags.length === 0);
    return matchesSearch && matchesCategory;
  });

  // The local context menu components have been replaced by the global FileContextMenu

  const renderFileCard = (file: FileWithTags, i: number) => {
    const detail = toDetailFile(file);
    const Icon = getFileIcon(detail.type);
    const color = getFileColor(detail.type);
    return (
      <FileContextMenu
        key={file.id}
        resource={{ id: file.id, name: file.file_name, type: "file" }}
        folders={folders}
        currentFolderId={activeFolder}
        isEditor={isEditor}
        actions={{
          onOpen: () => setSelectedFile(detail),
          onDownload: () => file.file_url && downloadFile(file.file_url, file.file_name),
          onShare: () => setShareFile({ id: file.id, name: file.file_name }),
          onChat: () => navigate(`/chat?fileId=${file.id}`),
          onAnalyze: () => handleReanalyze(file.id, file.file_name, file.file_type),
          onRename: () => { setRenamingFile({ id: file.id, name: file.file_name }); setRenameFileName(file.file_name); },
          onDelete: () => handleDeleteFile(file.id, file.file_name),
          onCompare: () => navigate(`/compare?fileA=${file.id}`),
          onAddToFolder: (fId) => handleAddFileToFolder(fId, file.id, ""),
          onRemoveFromFolder: activeFolder ? () => handleRemoveFileFromFolder(activeFolder, file.id) : undefined,
        }}
      >
        <motion.div
          layout
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          whileHover={{ y: -8, transition: { duration: 0.2 } }}
          draggable
          onDragStart={(e: any) => { e.dataTransfer?.setData?.("text/plain", file.id); }}
          onClick={() => setSelectedFile(detail)}
          className={cn(
            "group relative bg-gradient-to-br from-card to-card/80 rounded-3xl p-4 sm:p-5 cursor-pointer border border-border/30 backdrop-blur-sm transition-all duration-300 overflow-hidden",
            selectedFile?.id === file.id
              ? "border-primary/50 shadow-xl shadow-primary/10 bg-primary/5"
              : "hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
          )}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/0 to-primary/0 group-hover:to-primary/5 rounded-3xl transition-all duration-500 pointer-events-none" />
          <div className="relative flex items-start gap-3 mb-3">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 5 }}
              className={cn("w-11 h-11 rounded-2xl flex items-center justify-center bg-gradient-to-br flex-shrink-0", color)}
            >
              <Icon className="w-5 h-5" />
            </motion.div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate max-w-full text-foreground">{file.file_name}</p>
              <p className="text-xs text-muted-foreground/80 truncate">{detail.size} · {detail.uploadDate}</p>
            </div>
            <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={(e) => { e.stopPropagation(); navigate(`/chat?fileId=${file.id}`); }}
                title="Chat"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all"
              >
                <MessageCircle className="w-3.5 h-3.5" />
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={(e) => { e.stopPropagation(); setShareFile({ id: file.id, name: file.file_name }); }}
                title="Share"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
              </motion.button>
              {file.file_url && (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => { e.stopPropagation(); viewFile(file.file_url); }}
                  title="View"
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                >
                  <Eye className="w-3.5 h-3.5" />
                </motion.button>
              )}
            </div>
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-xs text-muted-foreground/80 line-clamp-2 mb-3"
          >
            {detail.summary}
          </motion.p>
          <div className="flex flex-wrap gap-2">
            {file.tags.slice(0, 3).map((tag, idx) => (
              <motion.span
                key={tag.name}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.05 }}
                className={cn(
                  "text-[10px] px-2.5 py-1 rounded-full font-semibold transition-all",
                  tagColors[tag.name] || "bg-secondary/60 text-muted-foreground"
                )}
              >
                {tag.name}
              </motion.span>
            ))}
            {file.tags.length > 3 && (
              <span className="text-[10px] px-2 py-1 rounded-full bg-muted text-muted-foreground">
                +{file.tags.length - 3}
              </span>
            )}
          </div>
        </motion.div>
      </FileContextMenu>
    );
  };

  const renderFileRow = (file: FileWithTags, i: number) => {
    const detail = toDetailFile(file);
    const Icon = getFileIcon(detail.type);
    const color = getFileColor(detail.type);
    return (
      <FileContextMenu
        key={file.id}
        resource={{ id: file.id, name: file.file_name, type: "file" }}
        folders={folders}
        currentFolderId={activeFolder}
        isEditor={isEditor}
        actions={{
          onOpen: () => setSelectedFile(detail),
          onDownload: () => file.file_url && downloadFile(file.file_url, file.file_name),
          onShare: () => setShareFile({ id: file.id, name: file.file_name }),
          onChat: () => navigate(`/chat?fileId=${file.id}`),
          onAnalyze: () => handleReanalyze(file.id, file.file_name, file.file_type),
          onRename: () => { setRenamingFile({ id: file.id, name: file.file_name }); setRenameFileName(file.file_name); },
          onDelete: () => handleDeleteFile(file.id, file.file_name),
          onCompare: () => navigate(`/compare?fileA=${file.id}`),
          onAddToFolder: (fId) => handleAddFileToFolder(fId, file.id, ""),
          onRemoveFromFolder: activeFolder ? () => handleRemoveFileFromFolder(activeFolder, file.id) : undefined,
        }}
      >
        <motion.div
          layout
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          draggable
          onDragStart={(e: any) => { e.dataTransfer?.setData?.("text/plain", file.id); }}
          onClick={() => setSelectedFile(detail)}
          whileHover={{ x: 8, transition: { duration: 0.2 } }}
          className={cn(
            "group relative bg-gradient-to-r from-card to-card/80 rounded-3xl px-3 sm:px-5 py-3 sm:py-3.5 flex items-center gap-2 sm:gap-4 cursor-pointer border border-border/30 transition-all duration-300 overflow-hidden",
            selectedFile?.id === file.id
              ? "border-primary/50 shadow-lg shadow-primary/10 bg-primary/5"
              : "hover:border-primary/40 hover:shadow-md hover:shadow-primary/5"
          )}>

          <motion.div
            whileHover={{ scale: 1.1, rotate: -5 }}
            className={cn("w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br", color)}
          >
            <Icon className="w-4 h-4" />
          </motion.div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="text-sm font-semibold truncate text-foreground">{file.file_name}</p>
            <p className="text-xs text-muted-foreground/70 truncate sm:hidden">{detail.size} · {detail.uploadDate}</p>
          </div>
          <div className="hidden sm:flex gap-2 shrink-0">
            {file.tags.slice(0, 2).map((tag) => (
              <motion.span
                key={tag.name}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={cn(
                  "text-[10px] px-2.5 py-1 rounded-xl font-semibold",
                  tagColors[tag.name] || "bg-secondary/60 text-muted-foreground"
                )}
              >
                {tag.name}
              </motion.span>
            ))}
          </div>
          <span className="hidden md:inline text-xs text-muted-foreground/70 shrink-0 whitespace-nowrap">{detail.size}</span>
          <span className="hidden md:inline text-xs text-muted-foreground/70 shrink-0 whitespace-nowrap">{detail.uploadDate}</span>
          <div className="hidden sm:flex items-center gap-0.5 shrink-0">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={(e) => { e.stopPropagation(); navigate(`/chat?fileId=${file.id}`); }}
              title="Chat with document"
              className="p-2 rounded-xl text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all duration-200"
            >
              <MessageCircle className="w-4 h-4" />
            </motion.button>
            {file.file_url && (
              <>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => { e.stopPropagation(); viewFile(file.file_url); }}
                  title="View"
                  className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
                >
                  <Eye className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => { e.stopPropagation(); downloadFile(file.file_url, file.file_name); }}
                  title="Download"
                  className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
                >
                  <Download className="w-4 h-4" />
                </motion.button>
              </>
            )}
          </div>
        </motion.div>
      </FileContextMenu>
    );
  };

  return (
    <AppLayout>
      <div className="bg-[#F7F7F5] dark:bg-[#0B0B0C] text-gray-900 dark:text-gray-100 min-h-screen transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 md:gap-8 py-6 px-4">
        {/* Left Sidebar - Folders & Categories */}
        {!sidebarCollapsed && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="hidden md:block w-52 flex-shrink-0 sticky top-6 h-fit space-y-4"
          >
            {/* Folders Section */}
            <div className="bg-gradient-to-br from-card to-card/80 rounded-3xl p-6 shadow-sm backdrop-blur-sm border border-border/30">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-base text-foreground">Folders</h2>
                {isEditor && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowNewFolder(true)}
                    className="p-1.5 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                    title="New folder"
                  >
                    <FolderPlus className="w-4 h-4" />
                  </motion.button>
                )}
              </div>

              <motion.button
                whileHover={{ x: 4 }}
                onClick={() => setActiveFolder(null)}
                className={cn(
                  "w-full text-left px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 mb-1",
                  activeFolder === null
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                All Files
              </motion.button>

              {folders.map((folder) => (
                <FileContextMenu
                  key={folder.id}
                  resource={{ id: folder.id, name: folder.name, type: "folder" }}
                  isEditor={isEditor}
                  actions={{
                    onOpen: () => setActiveFolder(activeFolder === folder.id ? null : folder.id),
                    onShare: () => setShareFolder({ id: folder.id, name: folder.name }),
                    onChat: () => navigate(`/chat?userFolderId=${folder.id}`),
                    onRename: () => { setRenamingFolder(folder.id); setRenameValue(folder.name); },
                    onDelete: () => handleDeleteFolder(folder.id),
                  }}
                >
                  <motion.div
                    role="button"
                    whileHover={{ x: 4 }}
                    onDragOver={(e: React.DragEvent) => { e.preventDefault(); setDragOverFolder(folder.id); }}
                    onDragLeave={() => setDragOverFolder(null)}
                    onDrop={(e: React.DragEvent) => {
                      e.preventDefault();
                      setDragOverFolder(null);
                      const fileId = e.dataTransfer.getData("text/plain");
                      if (fileId) handleAddFileToFolder(folder.id, fileId, folder.name);
                    }}
                    onClick={() => setActiveFolder(activeFolder === folder.id ? null : folder.id)}
                    className={cn(
                      "w-full text-left px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300 flex items-center gap-2 cursor-pointer",
                      activeFolder === folder.id
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                        : dragOverFolder === folder.id
                          ? "bg-accent/20 border-2 border-dashed border-accent text-accent"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    )}
                  >
                    <Folder className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate flex-1">{folder.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/chat?userFolderId=${folder.id}`); }}
                        title="Chat with folder"
                        className={cn(
                          "p-1 rounded-md transition-colors",
                          activeFolder === folder.id ? "hover:bg-primary-foreground/20" : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
                        )}
                      >
                        <MessageCircle className="w-3 h-3" />
                      </button>
                      <span className={cn("text-xs px-1.5 rounded-lg", activeFolder === folder.id ? "bg-primary-foreground/20" : "bg-muted/50")}>
                        {folder.fileIds.length}
                      </span>
                    </div>
                  </motion.div>
                </FileContextMenu>
              ))}

              {folders.length === 0 && (
                <p className="text-xs text-muted-foreground/60 text-center py-2">Create folders to organize files</p>
              )}
            </div>

            {/* Categories */}
            <div className="bg-gradient-to-br from-card to-card/80 rounded-3xl p-6 shadow-sm backdrop-blur-sm border border-border/30">
              <h2 className="font-bold text-base mb-5 text-foreground">Categories</h2>
              <div className="space-y-2.5">
                {visibleCategories.map((cat, idx) => {
                  const count = cat.name === "all"
                    ? (files || []).length
                    : (categoryCounts[cat.name] || 0);
                  return (
                    <motion.button
                      key={cat.name}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05, duration: 0.3 }}
                      whileHover={{ x: 4 }}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={cn(
                        "w-full text-left px-4 py-2.5 rounded-2xl text-sm font-medium transition-all duration-300",
                        selectedCategory === cat.name
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-105"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground hover:shadow-md"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </span>
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-lg", selectedCategory === cat.name ? "bg-primary-foreground/20" : "bg-muted/50")}>
                          {count}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Mobile: Horizontal folder/category scroller */}
        <div className="md:hidden mb-4 space-y-3">
          {/* Folders */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {isEditor && (
              <button
                onClick={() => setShowNewFolder(true)}
                className="shrink-0 p-2 rounded-xl border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setActiveFolder(null)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all",
                activeFolder === null
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground"
              )}
            >
              All Files
            </button>
            {folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => setActiveFolder(activeFolder === folder.id ? null : folder.id)}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5",
                  activeFolder === folder.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                )}
              >
                <Folder className="w-3 h-3" />
                {folder.name}
                <span className="text-[10px] opacity-70">({folder.fileIds.length})</span>
              </button>
            ))}
          </div>
          {/* Categories */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {visibleCategories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={cn(
                  "shrink-0 px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1",
                  selectedCategory === cat.name
                    ? "bg-accent text-accent-foreground"
                    : "bg-secondary/60 text-muted-foreground"
                )}
              >
                <span>{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex-1 min-w-0"
        >
          <div className="mb-6 md:mb-8">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6"
            >
              <div>
                {activeFolder && activeFolderData ? (
                  <div className="flex items-center gap-2">
                    <button onClick={() => setActiveFolder(null)} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <Folder className="w-5 h-5 text-primary" />
                        <h1 className="text-2xl sm:text-4xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>{activeFolderData.name}</h1>
                      </div>
                      <p className="text-muted-foreground text-sm mt-2">{filtered.length} files · Right-click for options</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <h1 className="text-2xl sm:text-4xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Files</h1>
                      {activeFolder && (
                        <CollaboratorAvatars resourceId={activeFolder} resourceType="folder" />
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm mt-2">{filtered.length} files · Right-click for options</p>
                  </>
                )}
              </div>
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto"
              >
                <Button
                  onClick={handleUploadClick}
                  variant="default"
                  size="sm"
                  className="rounded-xl gap-2 h-10 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-200 hidden sm:flex"
                >
                  <Upload className="w-4 h-4" />
                  Upload
                </Button>
                {activeFolder && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShareFolder({ id: activeFolder, name: activeFolderData?.name || "Folder" })}
                    className="rounded-xl gap-2 h-10 border-primary/20 hover:bg-primary/5 hidden sm:flex"
                  >
                    <Share2 className="w-4 h-4" />
                    Share Folder
                  </Button>
                )}
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="hidden md:flex p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
                >
                  {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
                </button>
                <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-secondary/40 border border-border/30 backdrop-blur-sm">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setView("grid")}
                    className={cn(
                      "p-2 rounded-xl transition-all duration-300",
                      view === "grid"
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setView("list")}
                    className={cn(
                      "p-2 rounded-xl transition-all duration-300",
                      view === "list"
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )}
                  >
                    <List className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>

            {/* FOLDERS SECTION */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {[
                { id: "upload", label: "Uploads", color: "bg-gradient-to-br from-blue-50 to-white border-gray-200 shadow-sm hover:shadow-md", activeBg: "bg-gradient-to-br from-blue-100 to-blue-50 border-blue-200 ring-2 ring-blue-500 shadow-md", iconColor: "text-blue-600 bg-blue-100", Icon: Upload },
                { id: "community", label: "Community", color: "bg-gradient-to-br from-purple-50 to-white border-gray-200 shadow-sm hover:shadow-md", activeBg: "bg-gradient-to-br from-purple-100 to-purple-50 border-purple-200 ring-2 ring-purple-500 shadow-md", iconColor: "text-purple-600 bg-purple-100", Icon: Globe },
                { id: "drive", label: "Drive", color: "bg-gradient-to-br from-orange-50 to-white border-gray-200 shadow-sm hover:shadow-md", activeBg: "bg-gradient-to-br from-orange-100 to-orange-50 border-orange-200 ring-2 ring-orange-500 shadow-md", iconColor: "text-orange-600 bg-orange-100", Icon: HardDrive },
              ].map((folder) => {
                const isActive = activeSourceFolder === folder.id;
                const fileCount = (files || []).filter(f => {
                  const source = (f as any).source || (f.file_url?.includes('drive') ? 'drive' : 'upload');
                  return source === folder.id;
                }).length;

                return (
                  <motion.div
                    key={folder.id}
                    onClick={() => setActiveSourceFolder(folder.id)}
                    className={cn(
                      "min-h-[110px] p-6 rounded-2xl border transition-all duration-300 ease-out cursor-pointer flex flex-col justify-between relative overflow-hidden",
                      "hover:scale-[1.02] active:scale-[0.98]",
                      isActive ? folder.activeBg : folder.color
                    )}
                  >
                    <div className="flex items-start justify-between w-full">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shadow-sm", folder.iconColor)}>
                        <folder.Icon className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-semibold text-gray-600 bg-white/60 shadow-sm px-3 py-1 rounded-xl backdrop-blur-sm border border-gray-100">
                        {fileCount} {fileCount === 1 ? 'file' : 'files'}
                      </span>
                    </div>
                    <span className="font-bold text-gray-900 text-lg mt-4">{folder.label}</span>
                  </motion.div>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-center py-24">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                    <Loader2 className="w-8 h-8 text-primary" />
                  </motion.div>
                </motion.div>
              ) : activeSourceFolder === "all" ? (
                <motion.div key="empty-select" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease: "easeOut" }} className="flex flex-col items-center justify-center py-20 bg-secondary/20 rounded-[2rem] border border-dashed border-border/60 transition-all duration-300">
                  <Folder className="w-12 h-12 text-muted-foreground/30 mb-4" />
                  <p className="text-lg font-semibold text-foreground">Select a folder to view files</p>
                  <p className="text-sm text-muted-foreground mt-1 text-center">Centered safely, soft empty state</p>
                </motion.div>
              ) : filtered.length === 0 ? (
                <motion.div key="empty-files" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease: "easeOut" }} className="text-center py-24">
                  <div className="text-muted-foreground">
                    <Loader2 className="w-12 h-12 opacity-20 mx-auto mb-4" />
                    <p className="text-lg">No files found</p>
                    <p className="text-sm opacity-70">Try adjusting your filters or upload some files</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div key={activeSourceFolder} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.3, ease: "easeOut" }}>
                  {view === "grid" ? (
                    <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {filtered.map((file, i) => renderFileCard(file, i))}
                    </motion.div>
                  ) : (
                    <motion.div layout className="space-y-3">
                      {filtered.map((file, i) => renderFileRow(file, i))}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* File Detail Overlay Panel */}
      <AnimatePresence>
        {selectedFile && (
          <FileDetailPanel file={selectedFile} onClose={() => setSelectedFile(null)} />
        )}
      </AnimatePresence>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolder} onOpenChange={setShowNewFolder}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="Folder name..."
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFolder(false)}>Cancel</Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Folder Dialog */}
      <Dialog open={!!renamingFolder} onOpenChange={(open) => { if (!open) setRenamingFolder(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="New folder name..."
            onKeyDown={(e) => e.key === "Enter" && renamingFolder && handleRenameFolder(renamingFolder, renameValue)}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingFolder(null)}>Cancel</Button>
            <Button onClick={() => renamingFolder && handleRenameFolder(renamingFolder, renameValue)} disabled={!renameValue.trim()}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename File Dialog */}
      <Dialog open={!!renamingFile} onOpenChange={(open) => { if (!open) setRenamingFile(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
          </DialogHeader>
          <Input
            value={renameFileName}
            onChange={(e) => setRenameFileName(e.target.value)}
            placeholder="New file name..."
            onKeyDown={(e) => e.key === "Enter" && handleRenameFile()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenamingFile(null)}>Cancel</Button>
            <Button onClick={handleRenameFile} disabled={!renameFileName.trim()}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialogs */}
      {(shareFile || shareFolder) && (
        <>
          <ShareDialog
            open={!!shareFile || !!shareFolder}
            onOpenChange={(open) => {
              if (!open) {
                setShareFile(null);
                setShareFolder(null);
                setShowCommunityShare(false);
              }
            }}
            resourceId={shareFile?.id || shareFolder?.id || ""}
            resourceName={shareFile?.name || shareFolder?.name || ""}
            resourceType={shareFile ? "file" : "folder"}
          />

          <CommunityShareModal
            open={showCommunityShare}
            onOpenChange={setShowCommunityShare}
            resourceId={shareFile?.id || shareFolder?.id || ""}
            resourceName={shareFile?.name || shareFolder?.name || ""}
            resourceType={shareFile ? "file" : "folder"}
          />
        </>
      )}
      </div>
    </AppLayout>
  );
};

export default FilesPage;
