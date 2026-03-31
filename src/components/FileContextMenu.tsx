import React from "react";
import { 
  FileText, Eye, Download, Share2, MessageCircle, 
  RefreshCw, FolderInput, Plus, Trash2, Pencil, 
  ArrowLeftRight, Info, Sparkles 
} from "lucide-react";
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
import { useNavigate } from "react-router-dom";

export interface ContextMenuActions {
  onOpen?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onChat?: () => void;
  onAnalyze?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  onCompare?: () => void;
  onAddToFolder?: (folderId: string) => void;
  onCreateFolder?: () => void;
  onRemoveFromFolder?: () => void;
}

interface FileContextMenuProps {
  resource: {
    id: string;
    name: string;
    type: "file" | "folder";
    fileType?: string;
    url?: string;
  };
  actions: ContextMenuActions;
  children: React.ReactNode;
  isEditor?: boolean;
  folders?: any[];
  currentFolderId?: string | null;
}

export const FileContextMenu = ({ 
  resource, 
  actions, 
  children, 
  isEditor = true,
  folders = [],
  currentFolderId 
}: FileContextMenuProps) => {
  const navigate = useNavigate();

  return (
    <ContextMenu>
      <ContextMenuContent className="w-56 rounded-2xl border border-border/50 bg-card/95 backdrop-blur-md shadow-2xl p-1.5">
        <ContextMenuLabel className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60 px-2 py-2">
          {resource.type === "file" ? <FileText className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {resource.name}
        </ContextMenuLabel>
        <ContextMenuSeparator className="bg-border/40 my-1" />

        {/* View / Open */}
        <ContextMenuItem onClick={actions.onOpen} className="gap-3 rounded-lg cursor-pointer focus:bg-primary/10 transition-colors py-2 px-3">
          {resource.type === "file" ? <Eye className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
          <span className="text-sm font-medium">Open {resource.type === "file" ? "Preview" : "Folder"}</span>
        </ContextMenuItem>

        {/* Share */}
        <ContextMenuItem onClick={actions.onShare} className="gap-3 rounded-lg cursor-pointer focus:bg-primary/10 transition-colors py-2 px-3">
          <Share2 className="w-4 h-4" />
          <span className="text-sm font-medium">Share Resource</span>
        </ContextMenuItem>

        <ContextMenuSeparator className="bg-border/40 my-1" />

        {/* AI Actions */}
        <ContextMenuItem onClick={actions.onChat} className="gap-3 rounded-lg cursor-pointer focus:bg-accent/10 focus:text-accent transition-colors py-2 px-3">
          <MessageCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Chat with AI</span>
        </ContextMenuItem>

        <ContextMenuItem onClick={actions.onAnalyze} className="gap-3 rounded-lg cursor-pointer focus:bg-amber-500/10 focus:text-amber-600 transition-colors py-2 px-3">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">Analyze Content</span>
        </ContextMenuItem>

        {resource.type === "file" && (
          <ContextMenuItem onClick={actions.onCompare} className="gap-3 rounded-lg cursor-pointer focus:bg-primary/10 transition-colors py-2 px-3">
            <ArrowLeftRight className="w-4 h-4" />
            <span className="text-sm font-medium">Compare with...</span>
          </ContextMenuItem>
        )}

        <ContextMenuSeparator className="bg-border/40 my-1" />

        {/* Management Actions */}
        {resource.type === "file" && (
          <>
            <ContextMenuItem onClick={actions.onDownload} className="gap-3 rounded-lg cursor-pointer focus:bg-primary/10 transition-colors py-2 px-3">
              <Download className="w-4 h-4" />
              <span className="text-sm font-medium">Download</span>
            </ContextMenuItem>

            {folders.length > 0 && actions.onAddToFolder && (
               <ContextMenuSub>
                <ContextMenuSubTrigger className="gap-3 rounded-lg cursor-pointer py-2 px-3">
                  <FolderInput className="w-4 h-4" />
                  <span className="text-sm font-medium">Add to Folder</span>
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-52 rounded-xl border border-border/50 bg-card/95 backdrop-blur-md p-1">
                  {folders.filter(f => f.id !== currentFolderId).map(folder => (
                    <ContextMenuItem 
                      key={folder.id} 
                      onClick={() => actions.onAddToFolder?.(folder.id)}
                      className="gap-2 rounded-lg py-2 px-3"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {folder.name}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
            )}
          </>
        )}

        {isEditor && (
          <>
            <ContextMenuItem onClick={actions.onRename} className="gap-3 rounded-lg cursor-pointer focus:bg-primary/10 transition-colors py-2 px-3">
              <Pencil className="w-4 h-4" />
              <span className="text-sm font-medium">Rename</span>
            </ContextMenuItem>

            <ContextMenuSeparator className="bg-border/40 my-1" />

            <ContextMenuItem 
              onClick={actions.onDelete} 
              className="gap-3 rounded-lg cursor-pointer focus:bg-destructive/10 focus:text-destructive transition-colors py-2 px-3"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm font-medium underline decoration-destructive/30 underline-offset-4">Delete Resource</span>
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
      <ContextMenuTrigger className="contents">
        {children}
      </ContextMenuTrigger>
    </ContextMenu>
  );
};
