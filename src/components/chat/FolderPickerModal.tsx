import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Folder, FileText, ChevronRight, X, ArrowLeft, Search, CheckCircle2, Users } from "lucide-react";
import { useSmartFolders, SmartFolder, SubFolder, iconMap } from "@/hooks/useSmartFolders";
import { useFiles, FileWithTags } from "@/hooks/useFiles";
import { useFolders } from "@/hooks/useFolders";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FolderPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selectedFileIds: string[], selectedFolderPaths: string[][], selectedUserFolderIds: string[]) => void;
  initialSelectedFileIds?: string[];
  initialSelectedFolderPaths?: string[][];
  initialSelectedUserFolderIds?: string[];
}

export const FolderPickerModal = ({
  isOpen,
  onClose,
  onSelect,
  initialSelectedFileIds = [],
  initialSelectedFolderPaths = [],
  initialSelectedUserFolderIds = [],
}: FolderPickerModalProps) => {
  const { folders: smartFolders } = useSmartFolders();
  const { folders: userFolders } = useFolders();
  const { data: allFiles } = useFiles();

  const [currentPath, setCurrentPath] = useState<string[]>([]); 
  const [viewMode, setViewMode] = useState<"smart" | "user">("smart");
  const [searchQuery, setSearchQuery] = useState("");
  const [tempSelectedFiles, setTempSelectedFiles] = useState<string[]>(initialSelectedFileIds);
  const [tempSelectedFolderPaths, setTempSelectedFolderPaths] = useState<string[][]>(initialSelectedFolderPaths);
  const [tempSelectedUserFolderIds, setTempSelectedUserFolderIds] = useState<string[]>(initialSelectedUserFolderIds);

  const currentFolderData = useMemo(() => {
    if (viewMode === "user" || currentPath.length === 0) return null;
    let current: any = smartFolders.find(f => f.name === currentPath[0]);
    for (let i = 1; i < currentPath.length; i++) {
      if (!current) break;
      current = current.subfolders?.find((sf: any) => sf.name === currentPath[i]);
    }
    return current;
  }, [currentPath, smartFolders, viewMode]);

  const itemsToShow = useMemo(() => {
    const list: { type: "folder" | "file" | "user_folder"; id: string; name: string; data: any }[] = [];

    if (viewMode === "smart") {
      if (currentPath.length === 0) {
        smartFolders.forEach(f => list.push({ type: "folder", id: f.name, name: f.name, data: f }));
      } else if (currentFolderData) {
        currentFolderData.subfolders?.forEach((sf: any) =>
          list.push({ type: "folder", id: `${currentPath.join("/")}/${sf.name}`, name: sf.name, data: sf })
        );
        currentFolderData.fileIds?.forEach((fid: string) => {
          const file = allFiles?.find(f => f.id === fid);
          if (file) list.push({ type: "file", id: file.id, name: file.file_name, data: file });
        });
      }
    } else {
      // User Folders view
      userFolders.forEach(f => list.push({ type: "user_folder", id: f.id, name: f.name, data: f }));
    }

    if (searchQuery) {
      return list.filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return list;
  }, [currentPath, currentFolderData, smartFolders, userFolders, allFiles, searchQuery, viewMode]);

  const toggleFile = (id: string) => {
    setTempSelectedFiles(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleFolder = (name: string) => {
    const fullPath = [...currentPath, name];
    const pathStr = fullPath.join("/");
    setTempSelectedFolderPaths(prev =>
      prev.some(p => p.join("/") === pathStr)
        ? prev.filter(p => p.join("/") !== pathStr)
        : [...prev, fullPath]
    );
  };

  const toggleUserFolder = (id: string) => {
    setTempSelectedUserFolderIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelect = () => {
    onSelect(tempSelectedFiles, tempSelectedFolderPaths, tempSelectedUserFolderIds);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-2xl h-[600px] flex flex-col overflow-hidden"
      >
        <div className="p-6 border-b border-border flex items-center justify-between bg-secondary/20">
          <div>
            <h2 className="text-xl font-bold">Select Context</h2>
            <p className="text-sm text-muted-foreground">Pick documents or folders for your AI chat</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-border space-y-4">
          <div className="flex gap-2 p-1 bg-secondary/50 rounded-xl w-fit">
            <button 
              onClick={() => { setViewMode("smart"); setCurrentPath([]); }}
              className={cn("px-4 py-1.5 rounded-lg text-xs font-semibold transition-all", viewMode === "smart" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              Smart Folders
            </button>
            <button 
              onClick={() => { setViewMode("user"); setCurrentPath([]); }}
              className={cn("px-4 py-1.5 rounded-lg text-xs font-semibold transition-all", viewMode === "user" ? "bg-background shadow-sm text-primary" : "text-muted-foreground hover:text-foreground")}
            >
              Personal/Shared
            </button>
          </div>

          <div className="flex items-center gap-2">
            {viewMode === "smart" && currentPath.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setCurrentPath(p => p.slice(0, -1))} className="h-8 w-8 p-0 rounded-lg">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <div className="flex items-center gap-1 text-sm font-medium overflow-x-auto whitespace-nowrap scrollbar-hide">
              <span className="text-muted-foreground uppercase text-[10px] tracking-widest mr-2">{viewMode === "smart" ? "AI Path" : "Collections"}</span>
              {viewMode === "smart" && currentPath.map((name, i) => (
                <div key={i} className="flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                  <span className={i === currentPath.length - 1 ? "text-primary" : "text-muted-foreground"}>{name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-secondary/50 border border-border rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {itemsToShow.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center opacity-40 py-20">
              <Folder className="w-12 h-12 mb-2" />
              <p className="text-sm">Nothing found here</p>
            </div>
          )}
          {itemsToShow.map(item => {
            const isSelected = item.type === "folder"
              ? tempSelectedFolderPaths.some(p => p.join("/") === (currentPath.join("/") ? `${currentPath.join("/")}/${item.name}` : item.name))
              : item.type === "user_folder"
                ? tempSelectedUserFolderIds.includes(item.id)
                : tempSelectedFiles.includes(item.id);

            return (
              <div
                key={item.id}
                onDoubleClick={() => item.type === "folder" && setCurrentPath(p => [...p, item.name])}
                className={cn(
                  "group flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer border border-transparent hover:border-border",
                  isSelected ? "bg-primary/5 border-primary/20" : "hover:bg-secondary/50"
                )}
                onClick={() => {
                  if (item.type === "folder") toggleFolder(item.name);
                  else if (item.type === "user_folder") toggleUserFolder(item.id);
                  else toggleFile(item.id);
                }}
              >
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", 
                    item.type === "folder" ? "bg-primary/10" : item.type === "user_folder" ? "bg-indigo-500/10" : "bg-accent/10")}>
                    {item.type === "folder" ? <Folder className="w-5 h-5 text-primary" /> : 
                     item.type === "user_folder" ? <Users className="w-5 h-5 text-indigo-500" /> : 
                     <FileText className="w-5 h-5 text-accent" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      {item.type === "folder" ? "Smart Category" : item.type === "user_folder" ? "Shared Collection" : "Document"}
                    </p>
                  </div>
                </div>
                <CheckCircle2 className={cn("w-5 h-5 transition-all", isSelected ? "text-primary fill-primary/10" : "text-muted-foreground/20")} />
              </div>
            );
          })}
        </div>

        <div className="p-6 border-t border-border bg-secondary/10 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {tempSelectedFiles.length + tempSelectedFolderPaths.length + tempSelectedUserFolderIds.length} items selected
          </p>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={onClose} className="rounded-xl px-6">Cancel</Button>
            <Button onClick={handleSelect} className="rounded-xl px-8 shadow-lg shadow-primary/20">Select Context</Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
