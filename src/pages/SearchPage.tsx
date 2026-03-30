import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search as SearchIcon, SlidersHorizontal, Loader2, Sparkles, Wand2, RefreshCw, Shield } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { useFiles } from "@/hooks/useFiles";
import type { FileWithTags } from "@/hooks/useFiles";
import { getFileIcon, getFileColor, tagColors } from "@/data/mockFiles";
import FileDetailPanel from "@/components/FileDetailPanel";
import SearchFilters from "@/components/search/SearchFilters";
import SearchResultCard from "@/components/search/SearchResultCard";
import { SearchAutocomplete } from "@/components/search/SearchAutocomplete";
import { cn } from "@/lib/utils";
import { tokenize, scoreFile, highlightText, extractDateFilter, extractEntityQuery } from "@/lib/searchEngine";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

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
    entities: f.entities || [],
  };
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "text-emerald-500";
  if (confidence >= 0.5) return "text-amber-500";
  return "text-muted-foreground";
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.9) return "Very High";
  if (confidence >= 0.7) return "High";
  if (confidence >= 0.5) return "Medium";
  if (confidence >= 0.3) return "Low";
  return "Weak";
}

interface HybridResult {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  ai_summary: string;
  ai_description: string;
  entities: any[];
  expiry_date: string | null;
  upload_date: string;
  confidence: number;
  reason: string;
  rrf_score: number;
}

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(true);
  const [selectedFile, setSelectedFile] = useState<any>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [hybridResults, setHybridResults] = useState<HybridResult[]>([]);
  const [hybridLoading, setHybridLoading] = useState(false);
  const [hybridIntent, setHybridIntent] = useState<{ type: string; value: string } | null>(null);
  const [hybridExpandedTerms, setHybridExpandedTerms] = useState<string[]>([]);
  const [bulkReanalyzing, setBulkReanalyzing] = useState(false);
  const [reanalyzeProgress, setReanalyzeProgress] = useState<{ done: number; total: number } | null>(null);
  const { data: files, isLoading } = useFiles();
  const queryClient = useQueryClient();
  const searchTimerRef = useRef<number>();

  // Hybrid search with debounce
  const runHybridSearch = useCallback(async (q: string) => {
    if (!q.trim() || q.trim().length < 2) {
      setHybridResults([]);
      setHybridIntent(null);
      setHybridExpandedTerms([]);
      return;
    }
    setHybridLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("hybrid-search", {
        body: { query: q },
      });
      if (error) throw error;
      setHybridResults(data?.results || []);
      setHybridIntent(data?.intent || null);
      setHybridExpandedTerms(data?.expandedTerms || []);
    } catch (e) {
      console.error("Hybrid search error:", e);
      // Fall back to client-side search
      setHybridResults([]);
    } finally {
      setHybridLoading(false);
    }
  }, []);

  // Debounced search trigger
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (query.trim().length >= 2) {
      searchTimerRef.current = window.setTimeout(() => runHybridSearch(query), 500);
    } else {
      setHybridResults([]);
      setHybridIntent(null);
      setHybridExpandedTerms([]);
    }
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [query, runHybridSearch]);

  const handleReanalyzeAll = useCallback(async () => {
    const fileList = files || [];
    if (fileList.length === 0) {
      toast.error("No files found to refresh");
      return;
    }
    setBulkReanalyzing(true);
    setReanalyzeProgress({ done: 0, total: fileList.length });
    let successCount = 0;
    let failureCount = 0;
    try {
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        setReanalyzeProgress({ done: i, total: fileList.length });
        const { error } = await supabase.functions.invoke("analyze-file", {
          body: { fileId: file.id, fileName: file.file_name, fileType: file.file_type },
        });
        if (error) { failureCount++; } else { successCount++; }
      }
      setReanalyzeProgress({ done: fileList.length, total: fileList.length });
      await queryClient.invalidateQueries({ queryKey: ["files"] });
      if (failureCount === 0) toast.success(`Refreshed tags for ${successCount} files`);
      else toast.warning(`Refreshed tags for ${successCount} files, ${failureCount} failed`);
    } catch { toast.error("Bulk refresh failed"); }
    finally {
      setBulkReanalyzing(false);
      setTimeout(() => setReanalyzeProgress(null), 1200);
    }
  }, [files, queryClient]);

  const allTags = Array.from(new Set((files || []).flatMap((f) => f.tags.map((t) => t.name))));

  const autocompleteSuggestions = useMemo(() => {
    const baseSuggestions = [
      { icon: "📄", label: "Show all invoices", tag: "Finance" },
      { icon: "📋", label: "Find all contracts", tag: "Legal" },
      { icon: "🏥", label: "Show health-related documents", tag: "Insurance · Health" },
      { icon: "💰", label: "Find GST documents", tag: "Tax · Finance" },
      { icon: "⚖️", label: "Legal agreements", tag: "Legal" },
      { icon: "📊", label: "Show all reports", tag: "Analytics" },
      { icon: "🔔", label: "Files expiring soon", tag: "Reminders" },
    ];
    const dynamicSuggestions = allTags.slice(0, 5).map((tag) => ({
      icon: "🏷️",
      label: `Show all ${tag.toLowerCase()} files`,
      tag: `Tag: ${tag}`,
    }));
    return [...baseSuggestions, ...dynamicSuggestions];
  }, [allTags]);

  const filteredSuggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return autocompleteSuggestions.filter(
      (s) => s.label.toLowerCase().includes(q) || s.tag.toLowerCase().includes(q)
    );
  }, [query, autocompleteSuggestions]);

  // Client-side fallback results when hybrid search returns nothing
  const parsedQuery = useMemo(() => {
    let cleanQuery = query;
    let dateFilter: { from?: Date; to?: Date } | undefined;
    let entityFilter: { entityType?: string; value?: string } | undefined;
    const dateResult = extractDateFilter(cleanQuery);
    if (dateResult) { dateFilter = { from: dateResult.from, to: dateResult.to }; cleanQuery = dateResult.cleanQuery; }
    if (dateFrom || dateTo) { dateFilter = { from: dateFrom ? new Date(dateFrom) : undefined, to: dateTo ? new Date(dateTo) : undefined }; }
    const entityResult = extractEntityQuery(cleanQuery);
    if (entityResult) { entityFilter = { entityType: entityResult.entityType, value: entityResult.value }; cleanQuery = entityResult.cleanQuery; }
    const tokens = tokenize(cleanQuery);
    return { tokens, dateFilter, entityFilter, cleanQuery };
  }, [query, dateFrom, dateTo]);

  const clientResults = useMemo(() => {
    if (hybridResults.length > 0 || hybridLoading) return [];
    const scored = (files || [])
      .map((f) => {
        const score = scoreFile(f, parsedQuery.tokens, parsedQuery.dateFilter, parsedQuery.entityFilter, parsedQuery.cleanQuery);
        const matchesTags = selectedTags.length === 0 || f.tags.some((t) => selectedTags.includes(t.name));
        const ft = mapFileType(f.file_type);
        const matchesType = selectedTypes.length === 0 || selectedTypes.includes(ft);
        return { file: f, score, matchesTags, matchesType };
      })
      .filter((r) => r.score > 0 && r.matchesTags && r.matchesType);
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }, [files, parsedQuery, selectedTags, selectedTypes, hybridResults, hybridLoading]);

  // Combine: prefer hybrid results, fall back to client-side
  const useHybrid = hybridResults.length > 0;
  const totalResults = useHybrid ? hybridResults.length : clientResults.length;

  const toggleTag = (tag: string) => setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  const toggleType = (type: string) => setSelectedTypes((prev) => prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-bold text-foreground" style={{ fontFamily: "'Playfair Display', serif" }}>Smart Search</h1>
              <p className="text-muted-foreground text-sm mt-2">
                AI-powered hybrid search with intent detection & confidence scoring
              </p>
            </div>
            <div className="flex gap-2 flex-wrap justify-end">
              <button
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-card text-foreground border border-border hover:bg-primary/10 transition text-sm font-medium disabled:opacity-60"
                onClick={handleReanalyzeAll}
                disabled={bulkReanalyzing || !files?.length}
              >
                {bulkReanalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {bulkReanalyzing ? "Refreshing..." : "Refresh Tags"}
              </button>
              <button
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-card text-foreground border border-border hover:bg-primary/10 transition text-sm font-medium"
                onClick={() => setShowFilters((v) => !v)}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <SearchAutocomplete
            value={query}
            onChange={(val) => { setQuery(val); }}
            onSelect={(suggestion) => { setQuery(suggestion); setAutocompleteOpen(false); }}
            suggestions={filteredSuggestions}
            isOpen={autocompleteOpen && filteredSuggestions.length > 0}
            onOpenChange={setAutocompleteOpen}
          />

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {hybridIntent && (
              <div className="flex items-center gap-1.5 text-xs">
                <Shield className="w-3 h-3 text-primary" />
                <span className="text-primary font-medium">Intent detected: {hybridIntent.type.toUpperCase()}</span>
                <span className="text-muted-foreground">({hybridIntent.value})</span>
              </div>
            )}
            {hybridExpandedTerms.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs">
                <Wand2 className="w-3 h-3 text-primary" />
                <span className="text-muted-foreground">AI expanded:</span>
                {hybridExpandedTerms.slice(0, 6).map((t) => (
                  <span key={t} className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-medium">{t}</span>
                ))}
                {hybridExpandedTerms.length > 6 && (
                  <span className="text-muted-foreground text-[11px]">+{hybridExpandedTerms.length - 6}</span>
                )}
              </div>
            )}
            {hybridLoading && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>AI hybrid search running...</span>
              </div>
            )}
            {reanalyzeProgress && (
              <div className="flex items-center gap-1.5 text-xs text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                <span className="text-sm font-medium animate-pulse text-muted-foreground ml-2">
                Re-organizing {reanalyzeProgress.done}/{reanalyzeProgress.total}
              </span>
              </div>
            )}
          </div>
        </motion.div>

        <AnimatePresence>
          {showFilters && (
            <SearchFilters
              allTags={allTags}
              selectedTags={selectedTags}
              toggleTag={toggleTag}
              selectedTypes={selectedTypes}
              toggleType={toggleType}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
          )}
        </AnimatePresence>

        <div className="flex gap-6">
          <div className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-4">
                  {totalResults} result{totalResults !== 1 ? "s" : ""}
                  {query && <span className="text-primary ml-1">· {useHybrid ? "hybrid AI search" : "sorted by relevance"}</span>}
                </p>

                {hybridLoading && totalResults === 0 && (
                  <div className="text-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">Running AI hybrid search pipeline...</p>
                  </div>
                )}

                {/* Hybrid search results with confidence scores */}
                {useHybrid && (
                  <div className="space-y-4">
                    {hybridResults.map((result, i) => {
                      const file = (files || []).find(f => f.id === result.id);
                      if (!file) return null;
                      const detail = toDetailFile(file);
                      const isTopResult = i === 0 && hybridResults.length > 1;
                      return (
                        <div key={result.id}>
                          <div className="relative">
                            <SearchResultCard
                              file={file}
                              detail={detail}
                              snippet={result.reason || highlightText(file.ai_summary || file.ai_description || "", parsedQuery.tokens)}
                              isSelected={selectedFile?.id === file.id}
                              index={i}
                              onClick={() => setSelectedFile(detail)}
                              isTopResult={isTopResult}
                            />
                            {/* Confidence badge */}
                            <div className="absolute top-3 right-3 flex items-center gap-1.5">
                              <div className="flex items-center gap-1 text-xs">
                                <div className="w-16 h-1.5 rounded-full bg-secondary overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full rounded-full transition-all",
                                      result.confidence >= 0.8 ? "bg-emerald-500" :
                                      result.confidence >= 0.5 ? "bg-amber-500" : "bg-muted-foreground"
                                    )}
                                    style={{ width: `${result.confidence * 100}%` }}
                                  />
                                </div>
                                <span className={cn("font-medium", getConfidenceColor(result.confidence))}>
                                  {Math.round(result.confidence * 100)}%
                                </span>
                              </div>
                            </div>
                          </div>
                          {result.reason && (
                            <p className="text-xs text-muted-foreground ml-4 mt-1 italic">
                              💡 {result.reason}
                            </p>
                          )}
                          {isTopResult && <div className="border-b border-border/50 my-4" />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Client-side fallback results */}
                {!useHybrid && !hybridLoading && (
                  <div className="space-y-4">
                    {clientResults.map(({ file }, i) => {
                      const detail = toDetailFile(file);
                      const snippet = query
                        ? highlightText(file.ai_summary || file.ai_description || file.extracted_text || "", parsedQuery.tokens)
                        : detail.summary?.slice(0, 150);
                      const isTopResult = i === 0 && query.trim().length > 0 && clientResults.length > 1;
                      return (
                        <div key={file.id}>
                          <SearchResultCard
                            file={file}
                            detail={detail}
                            snippet={snippet}
                            isSelected={selectedFile?.id === file.id}
                            index={i}
                            onClick={() => setSelectedFile(detail)}
                            isTopResult={isTopResult}
                          />
                          {isTopResult && <div className="border-b border-border/50 my-4" />}
                        </div>
                      );
                    })}
                  </div>
                )}

                {totalResults === 0 && query && !hybridLoading && (
                  <div className="text-center py-16">
                    <SearchIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-foreground font-medium mb-1">No files found for "{query}"</p>
                    <p className="text-muted-foreground text-sm mb-4">Try different keywords, check spelling, or broaden your search</p>
                    <div className="flex items-center justify-center gap-3 flex-wrap">
                      <button
                        onClick={() => setQuery("")}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition"
                      >
                        Clear Search
                      </button>
                      <button
                        onClick={handleReanalyzeAll}
                        disabled={bulkReanalyzing || !files?.length}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card text-foreground border border-border text-xs font-medium hover:bg-primary/10 transition disabled:opacity-60"
                      >
                        {bulkReanalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                        Refresh All Tags
                      </button>
                    </div>
                  </div>
                )}

                {/* Empty state — no query yet */}
                {!query && totalResults === 0 && !hybridLoading && (
                  <div className="text-center py-16">
                    <Sparkles className="w-10 h-10 text-primary/30 mx-auto mb-4" />
                    <p className="text-foreground font-medium mb-1">Search your documents</p>
                    <p className="text-muted-foreground text-sm mb-6 max-w-md mx-auto">
                      Type anything — a name, date, amount, tag, or even describe what you're looking for in plain language
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                      {["passport", "invoice 2024", "GST return", "insurance policy", "Aadhaar card"].map(term => (
                        <button
                          key={term}
                          onClick={() => setQuery(term)}
                          className="text-xs px-3 py-1.5 rounded-full border border-border bg-card text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                        >
                          {term}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <AnimatePresence>
            {selectedFile && <FileDetailPanel file={selectedFile} onClose={() => setSelectedFile(null)} onTagClick={(tag) => { setQuery(tag); setSelectedFile(null); }} />}
          </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
};

export default SearchPage;
