import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Tag, Brain, Calendar, FileText, History, Download, Eye, RefreshCw, Loader2, MessageCircle, User, Check, Plus, Image as ImageIcon } from "lucide-react";
import type { MockFile } from "@/data/mockFiles";
import { getFileIcon, getFileColor, tagColors } from "@/data/mockFiles";
import { cn } from "@/lib/utils";
import { downloadFile, viewFile, getSignedUrl } from "@/lib/fileUrl";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { TypewriterText } from "@/components/ui/TypewriterText";

interface Props {
  file: MockFile & { id?: string; fileType?: string; entities?: any[] };
  onClose: () => void;
  onTagClick?: (tag: string) => void;
}

const FileDetailPanel = ({ file, onClose, onTagClick }: Props) => {
  const Icon = getFileIcon(file.type);
  const color = getFileColor(file.type);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [namingPerson, setNamingPerson] = useState(false);
  const [personName, setPersonName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [savingTag, setSavingTag] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const isImage = file.fileType?.startsWith("image/") || file.type === "image";
  const isPdf = file.fileType?.includes("pdf") || file.type === "pdf";

  // Load preview for images
  useEffect(() => {
    if (!isImage || !file.fileUrl) return;
    let cancelled = false;
    setLoadingPreview(true);
    getSignedUrl(file.fileUrl).then(url => {
      if (!cancelled) {
        setPreviewUrl(url);
        setLoadingPreview(false);
      }
    });
    return () => { cancelled = true; };
  }, [file.fileUrl, isImage]);

  const textToCheck = `${file.summary || ""} ${file.aiDescription || ""} ${file.extractedText || ""}`.toLowerCase();
  const personEntities = (file.entities || []).filter((e: any) => e.type === "person");
  const hasPerson = isImage && (
    personEntities.length > 0 ||
    /\b(person|man|woman|boy|girl|people|selfie|portrait|face|smile|smiling|group photo|young|child|kid)\b/.test(textToCheck)
  );

  const handleReanalyze = async () => {
    if (!file.id) return;
    setReanalyzing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-file`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ fileId: file.id, fileName: file.name, fileType: file.fileType || file.type }),
      });
      if (!resp.ok) throw new Error("Failed");
      await queryClient.invalidateQueries({ queryKey: ["files"] });
      toast.success("Tags refreshed successfully!");
    } catch {
      toast.error("Failed to refresh tags");
    } finally {
      setReanalyzing(false);
    }
  };

  const handleSavePersonName = async () => {
    if (!file.id || !personName.trim()) return;
    setSavingName(true);
    try {
      const { data: fileData, error: fetchErr } = await supabase
        .from("files")
        .select("semantic_keywords, ai_summary, ai_description, entities")
        .eq("id", file.id)
        .single();
      if (fetchErr) throw fetchErr;

      const name = personName.trim();
      const updatedKeywords = `${fileData.semantic_keywords || ""}, ${name}, ${name} photo, ${name} picture`;
      const updatedSummary = `${fileData.ai_summary || ""} Person identified as: ${name}.`;
      const updatedDescription = `${fileData.ai_description || ""} Photo of ${name}.`;
      const existingEntities = Array.isArray(fileData.entities) ? fileData.entities : [];
      const updatedEntities = [...existingEntities, { type: "person", value: name, label: `Person: ${name}` }];

      const { error: updateErr } = await supabase
        .from("files")
        .update({
          semantic_keywords: updatedKeywords,
          ai_summary: updatedSummary,
          ai_description: updatedDescription,
          entities: updatedEntities,
        })
        .eq("id", file.id);
      if (updateErr) throw updateErr;

      await queryClient.invalidateQueries({ queryKey: ["files"] });
      toast.success(`Named person as "${name}"`);
      setNamingPerson(false);
      setPersonName("");
    } catch {
      toast.error("Failed to save person name");
    } finally {
      setSavingName(false);
    }
  };

  const handleAddTag = async () => {
    if (!file.id || !newTag.trim()) return;
    setSavingTag(true);
    try {
      // Upsert tag
      const { data: tagData, error: tagErr } = await supabase
        .from("tags")
        .upsert({ name: newTag.trim() }, { onConflict: "name" })
        .select("id")
        .single();
      if (tagErr || !tagData) throw tagErr;

      // Link to file
      const { error: linkErr } = await supabase
        .from("file_tags")
        .upsert(
          { file_id: file.id, tag_id: tagData.id, confidence: 1.0 },
          { onConflict: "file_id,tag_id" }
        );
      if (linkErr) throw linkErr;

      await queryClient.invalidateQueries({ queryKey: ["files"] });
      toast.success(`Tag "${newTag.trim()}" added`);
      setNewTag("");
      setAddingTag(false);
    } catch {
      toast.error("Failed to add tag");
    } finally {
      setSavingTag(false);
    }
  };

  const handleRemoveTag = async (tagName: string) => {
    if (!file.id) return;
    try {
      // Find tag id
      const { data: tagData } = await supabase
        .from("tags")
        .select("id")
        .eq("name", tagName)
        .single();
      if (!tagData) return;

      await supabase
        .from("file_tags")
        .delete()
        .eq("file_id", file.id)
        .eq("tag_id", tagData.id);

      await queryClient.invalidateQueries({ queryKey: ["files"] });
      toast.success(`Tag "${tagName}" removed`);
    } catch {
      toast.error("Failed to remove tag");
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
        className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[380px] lg:w-[420px] border-l border-border/20 overflow-hidden"
        style={{
          background: "hsl(var(--background) / 0.55)",
          backdropFilter: "blur(24px) saturate(1.3)",
          WebkitBackdropFilter: "blur(24px) saturate(1.3)",
          boxShadow: "-8px 0 30px hsl(var(--primary) / 0.05)",
        }}
      >
        <div className="p-5 sm:p-6 h-full overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", color)}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold truncate text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{file.size} · {file.type.toUpperCase()}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0 p-2 rounded-xl hover:bg-secondary/60 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Image Preview */}
          {isImage && (
            <div className="mb-5 rounded-xl overflow-hidden border border-border/30 bg-secondary/20">
              {loadingPreview ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : previewUrl ? (
                <img
                  src={previewUrl}
                  alt={file.name}
                  className="w-full max-h-64 object-contain"
                  loading="lazy"
                />
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <ImageIcon className="w-8 h-8 opacity-30" />
                </div>
              )}
            </div>
          )}

          {/* PDF indicator */}
          {isPdf && (
            <div className="mb-5 rounded-xl border border-border/30 bg-secondary/20 p-4 flex items-center justify-center gap-3">
              <FileText className="w-6 h-6 text-destructive/60" />
              <div className="text-sm text-muted-foreground">
                <button
                  onClick={() => file.fileUrl && viewFile(file.fileUrl)}
                  className="text-primary hover:underline font-medium"
                >
                  Open PDF preview →
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mb-5">
            {file.fileUrl && (
              <>
                <button
                  onClick={() => downloadFile(file.fileUrl!, file.name)}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download
                </button>
                <button
                  onClick={() => viewFile(file.fileUrl!)}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/50 bg-secondary/40 text-foreground text-xs font-semibold hover:bg-secondary/70 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View
                </button>
              </>
            )}
            {file.id && (
              <>
                <button
                  onClick={() => navigate(`/chat?fileId=${file.id}`)}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-accent/20 bg-accent/10 text-accent text-xs font-semibold hover:bg-accent/20 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Chat
                </button>
                <button
                  onClick={handleReanalyze}
                  disabled={reanalyzing}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border/50 bg-secondary/40 text-foreground text-xs font-semibold hover:bg-secondary/70 transition-colors disabled:opacity-50"
                >
                  {reanalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Refresh Tags
                </button>
              </>
            )}
          </div>

          {/* Name Person */}
          {hasPerson && file.id && (
            <div className="mb-5 p-3 rounded-xl border border-primary/20 bg-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Person Detected</span>
              </div>
              {personEntities.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {personEntities.map((e: any, i: number) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{e.value}</span>
                  ))}
                </div>
              )}
              {!namingPerson ? (
                <button onClick={() => setNamingPerson(true)} className="flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition">
                  <User className="w-3 h-3" />
                  Name this person for better search
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <Input value={personName} onChange={(e) => setPersonName(e.target.value)} placeholder="Enter name" className="h-8 text-xs" onKeyDown={(e) => e.key === "Enter" && handleSavePersonName()} autoFocus />
                  <button onClick={handleSavePersonName} disabled={savingName || !personName.trim()} className="shrink-0 h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50">
                    {savingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => { setNamingPerson(false); setPersonName(""); }} className="shrink-0 h-8 w-8 rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground flex items-center justify-center">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* AI Summary */}
          <Section icon={Brain} title="AI Summary" color="text-primary">
            <p className="text-sm text-muted-foreground leading-relaxed">
              <TypewriterText text={file.summary || ""} speed={30} />
            </p>
          </Section>

          {/* Tags — clickable + editable */}
          <Section icon={Tag} title="Tags" color="text-accent">
            <div className="flex flex-wrap gap-1.5">
              {file.tags.map((tag) => (
                <span
                  key={tag.name}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1 group/tag",
                    tagColors[tag.name] || "bg-secondary text-muted-foreground",
                    onTagClick && "cursor-pointer hover:ring-1 hover:ring-primary/30"
                  )}
                >
                  <span onClick={() => onTagClick?.(tag.name)}>{tag.name}</span>
                  {file.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveTag(tag.name); }}
                      className="opacity-0 group-hover/tag:opacity-100 ml-0.5 text-current hover:text-destructive transition-all"
                      title="Remove tag"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </span>
              ))}
              {file.id && !addingTag && (
                <button
                  onClick={() => setAddingTag(true)}
                  className="text-xs px-2.5 py-1 rounded-full border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              )}
            </div>
            {addingTag && (
              <div className="flex items-center gap-2 mt-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Tag name"
                  className="h-8 text-xs"
                  onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                  autoFocus
                />
                <button onClick={handleAddTag} disabled={savingTag || !newTag.trim()} className="shrink-0 h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50">
                  {savingTag ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => { setAddingTag(false); setNewTag(""); }} className="shrink-0 h-8 w-8 rounded-lg border border-border/50 bg-secondary/40 text-muted-foreground flex items-center justify-center">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </Section>

          {/* AI Description */}
          <Section icon={FileText} title="Description" color="text-info">
            <p className="text-sm text-muted-foreground">{file.aiDescription}</p>
          </Section>

          {/* Metadata */}
          <Section icon={Calendar} title="Metadata" color="text-warning">
            <div className="space-y-2">
              <MetaRow label="Uploaded" value={file.uploadDate} />
              <MetaRow label="Last Accessed" value={file.lastAccessed} />
              {file.expiryDate && <MetaRow label="Expiry Date" value={file.expiryDate} highlight />}
            </div>
          </Section>

          {/* Version History */}
          <Section icon={History} title="Versions" color="text-success">
            <p className="text-sm text-muted-foreground">{file.versions} version{file.versions > 1 ? "s" : ""} tracked</p>
          </Section>

          {/* Extracted Text Preview */}
          {file.extractedText && (
            <Section icon={FileText} title="Extracted Text" color="text-muted-foreground">
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/30 font-mono text-xs text-muted-foreground leading-relaxed max-h-32 overflow-hidden">
                {file.extractedText}
              </div>
            </Section>
          )}
        </div>
      </motion.div>
    </>
  );
};

const Section = ({ icon: Icon, title, color, children }: { icon: any; title: string; color: string; children: React.ReactNode }) => (
  <div className="mb-5">
    <div className="flex items-center gap-2 mb-2.5">
      <Icon className={cn("w-3.5 h-3.5", color)} />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
    </div>
    {children}
  </div>
);

const MetaRow = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex items-center justify-between text-sm">
    <span className="text-muted-foreground">{label}</span>
    <span className={highlight ? "text-warning font-medium" : ""}>{value}</span>
  </div>
);

export default FileDetailPanel;
