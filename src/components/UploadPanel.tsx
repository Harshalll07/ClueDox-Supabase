import React from "react";
import { useUploadStore } from "@/contexts/UploadContext";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, CheckCircle, AlertCircle, Loader2,
    ChevronDown, ChevronUp, FileText, Upload
} from "lucide-react";
import { cn } from "@/lib/utils";

export const UploadPanel: React.FC = () => {
    const { uploads, removeUpload, isExpanded, setIsExpanded } = useUploadStore();

    if (uploads.length === 0) return null;

    const uploadingCount = uploads.filter((u) => u.status === "uploading").length;

    return (
        <div className="fixed bottom-4 right-4 z-[9999] w-80 pointer-events-none">
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.25)] border border-gray-100 overflow-hidden pointer-events-auto"
            >
                {/* HEADER */}
                <div
                    className={cn(
                        "flex items-center justify-between px-4 py-3 bg-gray-900 text-white cursor-pointer select-none transition-all",
                        !isExpanded && "rounded-2xl"
                    )}
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center gap-2">
                        {uploadingCount > 0 ? (
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                        ) : (
                            <Upload className="w-4 h-4 text-emerald-400" />
                        )}
                        <span className="text-sm font-bold">
                            {uploadingCount > 0
                                ? `Uploading ${uploadingCount} ${uploadingCount === 1 ? 'file' : 'files'}...`
                                : 'Uploads complete'}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* LIST */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: "auto" }}
                            exit={{ height: 0 }}
                            className="max-h-80 overflow-y-auto scrollbar-hide bg-white border-x"
                        >
                            <div className="p-2 space-y-1">
                                {uploads.map((upload) => (
                                    <motion.div
                                        key={upload.id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group relative"
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                            upload.status === "uploading" ? "bg-indigo-50 text-indigo-600" :
                                                upload.status === "success" ? "bg-emerald-50 text-emerald-600" :
                                                    "bg-red-50 text-red-600"
                                        )}>
                                            {upload.status === "uploading" ? <FileText className="w-5 h-5" /> :
                                                upload.status === "success" ? <CheckCircle className="w-5 h-5" /> :
                                                    <AlertCircle className="w-5 h-5" />}
                                        </div>

                                        <div className="flex-1 min-w-0 pr-4">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <p className="text-xs font-bold text-gray-900 truncate">
                                                    {upload.name}
                                                </p>
                                            </div>

                                            {upload.status === "uploading" && (
                                                <div className="space-y-2">
                                                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${upload.progress}%` }}
                                                            className="h-full bg-indigo-500 rounded-full"
                                                        />
                                                    </div>
                                                    <p className="text-[10px] font-bold text-gray-400 tracking-tighter">
                                                        {upload.progress}% uploaded
                                                    </p>
                                                </div>
                                            )}

                                            {upload.status === "success" && (
                                                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">
                                                    Ready to view
                                                </p>
                                            )}

                                            {upload.status === "error" && (
                                                <p className="text-[10px] font-bold text-red-500 truncate" title={upload.errorMessage}>
                                                    {upload.errorMessage || 'Upload failed'}
                                                </p>
                                            )}
                                        </div>

                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeUpload(upload.id); }}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-gray-200 rounded-lg transition-all"
                                        >
                                            <X className="w-4 h-4 text-gray-400" />
                                        </button>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
