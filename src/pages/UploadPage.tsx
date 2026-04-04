import { motion } from "framer-motion";
import { Upload, FolderUp, Sparkles, Loader2 } from "lucide-react";
import AppLayout from "./AppLayout";
import { cn } from "@/lib/utils";
import { useUploadStore } from "@/contexts/UploadContext";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const UploadPage = () => {
  const { addUpload } = useUploadStore();
  const [isDragging, setIsDragging] = useState(false);
  const [categorizing, setCategorizing] = useState(false);

  const handleFiles = (fileList: FileList) => {
    Array.from(fileList).forEach(file => {
      addUpload(file);
    });
    toast.success(`${fileList.length} ${fileList.length === 1 ? 'file' : 'files'} added to upload queue`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  const handleBulkUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = ".pdf,.jpg,.jpeg,.png,.docx";
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files) handleFiles(target.files);
    };
    input.click();
  };

  const autoCategorize = async () => {
    setCategorizing(true);
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
      if (!resp.ok) throw new Error("Failed");
      toast.success("Files auto-categorized! Check Smart Folders.");
    } catch {
      toast.error("Failed to auto-categorize files");
    } finally {
      setCategorizing(false);
    }
  };

  return (
    <AppLayout>
      <div className="bg-[#F7F7F5] dark:bg-[#0B0B0C] text-gray-900 dark:text-gray-100 min-h-screen transition-colors duration-300">
        <div className="max-w-5xl mx-auto w-full px-6 py-8 flex-1 flex flex-col min-h-0">
          {/* HEADER (Reduced vertical margins) */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 text-center md:text-left shrink-0"
          >
            <div className="flex flex-col md:flex-row items-center md:items-start gap-3 mb-1">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center shadow-sm border border-indigo-100">
                <Upload className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Upload Center
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5 max-w-lg">
                  Drag, drop, and keep moving while we handle the heavy lifting.
                </p>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start flex-1 min-h-0 overflow-y-auto scrollbar-hide pb-4">
            {/* MAIN UPLOAD ZONE */}
            <div className="md:col-span-2 space-y-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={cn(
                  "relative border-2 border-dashed rounded-[2.5rem] p-10 md:p-14 text-center transition-all duration-500 cursor-pointer overflow-hidden group shadow-sm",
                  isDragging
                    ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20 scale-[1.01] shadow-2xl shadow-indigo-100 dark:shadow-indigo-900/10"
                    : "border-gray-100 dark:border-gray-800 bg-white dark:bg-[#111113] hover:border-indigo-200 dark:hover:border-indigo-800 hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)]"
                )}
                onClick={handleBulkUpload}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-50/0 to-indigo-50/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                <div className="relative flex flex-col items-center gap-4">
                  <div className={cn(
                    "w-20 h-20 rounded-[2.5rem] flex items-center justify-center transition-all duration-500 shadow-xl",
                    isDragging ? "bg-indigo-600 rotate-12 scale-110 shadow-indigo-200" : "bg-gray-900 group-hover:bg-indigo-600 group-hover:rotate-6 shadow-gray-100"
                  )}>
                    <Upload className={cn("w-8 h-8 text-white transition-transform duration-500", isDragging && "animate-bounce")} />
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                      {isDragging ? "Yes! Drop it here" : "Ready to organize?"}
                    </h3>
                    <p className="text-gray-400 dark:text-gray-500 font-medium text-sm">
                      Drop PDF, JPG, PNG, or DOCX
                    </p>
                  </div>

                  <Button variant="outline" className="rounded-xl px-8 h-12 font-extrabold border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:bg-gray-50 dark:hover:bg-[#1A1A1C] transition-all text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1A1A1C]">
                    Computer Files
                  </Button>
                </div>
              </motion.div>

              {/* FEATURES GRID (Reduced paddings) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-6 rounded-[2rem] bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100/50 dark:border-emerald-900/30 group hover:bg-white dark:hover:bg-[#111113] transition-all shadow-sm hover:shadow-md">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1A1A1C] flex items-center justify-center mb-4 shadow-sm border border-emerald-50 dark:border-emerald-900/50 group-hover:scale-110 transition-transform">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                  </div>
                  <h4 className="font-bold text-emerald-900 dark:text-emerald-100 mb-1 text-base">Deep AI Scanning</h4>
                  <p className="text-[13px] text-emerald-700/70 dark:text-emerald-400/70 leading-relaxed font-medium">
                    We'll extract text, summarize content, and suggest relevant tags automatically.
                  </p>
                </div>
                <div className="p-6 rounded-[2rem] bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 group hover:bg-white dark:hover:bg-[#111113] transition-all shadow-sm hover:shadow-md">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1A1A1C] flex items-center justify-center mb-4 shadow-sm border border-indigo-50 dark:border-indigo-900/50 group-hover:scale-110 transition-transform">
                    <FolderUp className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h4 className="font-bold text-indigo-900 dark:text-indigo-100 mb-1 text-base">Work Interruption-Free</h4>
                  <p className="text-[13px] text-indigo-700/70 dark:text-indigo-400/70 leading-relaxed font-medium">
                    Your files process in the background. Navigate anywhere and stay productive.
                  </p>
                </div>
              </div>
            </div>

            {/* RIGHT SIDEBAR (Reduced paddings) */}
            <div className="space-y-4">
              <div className="bg-gray-950 dark:bg-[#0B0B0C] p-6 rounded-[2.5rem] text-white border border-transparent dark:border-gray-800 overflow-hidden relative group shadow-2xl shadow-indigo-200 dark:shadow-none">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-[80px] -mr-24 -mt-24 group-hover:scale-125 transition-transform duration-1000" />
                <h3 className="text-xl font-bold mb-2 relative z-10 tracking-tight leading-tight">Master <br />Categorization</h3>
                <p className="text-gray-400 text-[13px] mb-6 relative z-10 leading-relaxed font-medium">
                  Our neural engines sort every single byte of data into intelligent projects.
                </p>
                <Button
                  onClick={autoCategorize}
                  disabled={categorizing}
                  className="w-full rounded-xl bg-white dark:bg-gray-100 text-gray-950 hover:bg-indigo-50 dark:hover:bg-white h-12 font-black transition-all relative z-10 shadow-xl shadow-white/5 active:scale-95"
                >
                  {categorizing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Auto-Categorize
                </Button>
              </div>
 
              <div className="p-6 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-[#111113]">
                <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                  Upload Tips
                </h4>
                <ul className="space-y-4">
                  {[
                    "Max file size: 25MB",
                    "AI Analysis: ~20s",
                    "SSL Protected transfers",
                    "Non-blocking UI"
                  ].map((text, i) => (
                    <li key={i} className="flex gap-3 text-[13px] text-gray-600 dark:text-gray-400 font-bold items-center">
                      <div className="w-5 h-5 rounded-lg bg-white dark:bg-[#1A1A1C] flex items-center justify-center shrink-0 border border-gray-100 dark:border-gray-800 text-[10px] font-black text-indigo-600 shadow-sm">
                        {i + 1}
                      </div>
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default UploadPage;
