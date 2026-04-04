import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Trash2, Zap, FolderInput, 
  CheckSquare, Download, Share2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

interface BatchActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onDelete: () => void;
  onAnalyze: () => void;
  onMove?: () => void; // Optional for now
  onDownload?: () => void;
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
  selectedCount,
  onClear,
  onDelete,
  onAnalyze,
  onMove,
  onDownload
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] w-fit max-w-[90vw]">
      <motion.div
        initial={{ y: 100, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 100, opacity: 0, scale: 0.9 }}
        className="
          bg-white/80 dark:bg-black/80 backdrop-blur-2xl 
          border border-white/20 dark:border-white/10
          shadow-[0_20px_50px_rgba(0,0,0,0.3)]
          rounded-2xl px-6 py-4
          flex items-center gap-6
          pointer-events-auto
        "
      >
        {/* COUNTER SECTION */}
        <div className="flex items-center gap-3 pr-6 border-r border-border/50">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shadow-lg shadow-primary/20">
            {selectedCount}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-foreground">Items Selected</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Batch Actions</p>
          </div>
          <button 
            onClick={onClear}
            className="p-1.5 hover:bg-secondary rounded-lg transition-colors text-muted-foreground"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ACTIONS SECTION */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onAnalyze}
            className="rounded-xl gap-2 hover:bg-indigo-500/10 hover:text-indigo-500 transition-all font-bold group"
          >
            <Zap className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
            <span className="hidden md:inline text-xs">AI Analyze</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onMove}
            className="rounded-xl gap-2 hover:bg-amber-500/10 hover:text-amber-500 transition-all font-bold group"
          >
            <FolderInput className="w-4 h-4 text-amber-500 group-hover:-translate-y-0.5 transition-transform" />
            <span className="hidden md:inline text-xs">Move to Folder</span>
          </Button>

          <div className="w-px h-6 bg-border/50 mx-1 hidden sm:block" />

          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="rounded-xl gap-2 hover:bg-red-500/10 hover:text-red-500 transition-all font-bold group"
          >
            <Trash2 className="w-4 h-4 text-red-500 group-hover:rotate-6 transition-transform" />
            <span className="hidden md:inline text-xs">Delete All</span>
          </Button>
        </div>

        {/* SELECT ALL BUTTON (OPTIONAL SHORTCUT) */}
        <div className="hidden lg:flex items-center ml-2">
            <kbd className="px-2 py-1 bg-secondary rounded border border-border text-[10px] font-bold text-muted-foreground shadow-sm">
                Ctrl + Click
            </kbd>
            <span className="text-[10px] text-muted-foreground ml-2 italic">to multi-select</span>
        </div>
      </motion.div>
    </div>
  );
};
