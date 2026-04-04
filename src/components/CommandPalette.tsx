import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search, FileText, Globe, Folder, Plus, Upload,
    Settings, User, MessageCircle, X, ChevronRight,
    TrendingUp, Clock, Terminal, CreditCard, Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFiles, FileWithTags } from "@/hooks/useFiles";
import { useTeams, Team } from "@/hooks/useTeams";
import { useFolders, UserFolder } from "@/hooks/useFolders";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface CommandItem {
    id: string;
    title: string;
    subtitle?: string;
    icon: any;
    section: string;
    action: () => void;
    shortcut?: string;
    color?: string;
}

export const CommandPalette = () => {
    const isMobile = useIsMobile();
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [semanticResults, setSemanticResults] = useState<any[]>([]);
    const [isSemanticLoading, setIsSemanticLoading] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const searchTimerRef = useRef<number>();

    const navigate = useNavigate();
    const { data: files, isLoading: isLoadingFiles } = useFiles();
    const { data: teams, isLoading: isLoadingTeams } = useTeams();
    const { folders: manualFolders, isLoading: isLoadingFolders } = useFolders();

    const isLoading = isLoadingFiles || isLoadingTeams || isLoadingFolders;

    // Shortcut Listener
    useEffect(() => {
        const togglePalette = () => setIsOpen(prev => !prev);

        const handleCmdKey = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
                e.preventDefault();
                togglePalette();
            }
            if (e.key === "Escape") {
                setIsOpen(false);
            }
        };

        window.addEventListener("keydown", handleCmdKey);
        window.addEventListener("toggle-command-palette" as any, togglePalette);
        return () => {
            window.removeEventListener("keydown", handleCmdKey);
            window.removeEventListener("toggle-command-palette" as any, togglePalette);
        };
    }, []);

    // 2. Debounced Semantic Search
    useEffect(() => {
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        if (query.trim().length >= 3) {
            searchTimerRef.current = window.setTimeout(async () => {
                setIsSemanticLoading(true);
                try {
                    const { data, error } = await supabase.functions.invoke("hybrid-search", {
                        body: { query },
                    });
                    if (!error && data?.results) {
                        setSemanticResults(data.results.slice(0, 3));
                    }
                } catch (e) {
                    console.error("Palette semantic search error:", e);
                } finally {
                    setIsSemanticLoading(false);
                }
            }, 600);
        } else {
            setSemanticResults([]);
        }
        return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
    }, [query]);

    // Reset index on query change
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    const close = useCallback(() => {
        setIsOpen(false);
        setQuery("");
    }, []);

    // Build Results
    const getResults = useCallback((): CommandItem[] => {
        const results: CommandItem[] = [];
        const q = query.toLowerCase();

        // 1. Files
        const fileResults = (files || [])
            .filter(f => f.file_name.toLowerCase().includes(q))
            .slice(0, 5)
            .map(f => ({
                id: f.id,
                title: f.file_name,
                subtitle: "File",
                icon: FileText,
                section: "Files",
                color: "text-blue-500 bg-blue-50",
                action: () => { navigate("/files"); close(); } // In real app, might open specific file preview
            }));

        // 1.5 Semantic AI Results
        const aiResults = semanticResults.map(f => ({
            id: `ai-${f.id}`,
            title: f.file_name,
            subtitle: "AI Match · Semantic",
            icon: Sparkles,
            section: "AI Semantic Search",
            color: "text-indigo-600 bg-indigo-50/50",
            action: () => { navigate(`/files?q=${query}`); close(); }
        }));

        // 2. Communities
        const communityResults = (teams || [])
            .filter(t => t.name.toLowerCase().includes(q))
            .slice(0, 5)
            .map(t => ({
                id: t.id,
                title: t.name,
                subtitle: "Community",
                icon: Globe,
                section: "Communities",
                color: "text-purple-500 bg-purple-50",
                action: () => { navigate("/community"); close(); }
            }));

        // 3. Folders
        const folderResults = (manualFolders || [])
            .filter(f => f.name.toLowerCase().includes(q))
            .slice(0, 5)
            .map(f => ({
                id: f.id,
                title: f.name,
                subtitle: "Folder",
                icon: Folder,
                section: "Folders",
                color: "text-amber-500 bg-amber-50",
                action: () => { navigate("/files"); close(); }
            }));

        if (query) {
            return [...aiResults, ...fileResults, ...communityResults, ...folderResults];
        }

        // Default "Never Empty" State Suggestions
        const recentFiles = (files || []).slice(0, 3).map(f => ({
            id: f.id,
            title: f.file_name,
            subtitle: "Recent File",
            icon: Clock,
            section: "Recent",
            color: "text-gray-400 bg-gray-50",
            action: () => { navigate("/files"); close(); }
        }));

        const quickActions: CommandItem[] = [
            {
                id: "upload",
                title: "Upload New File",
                subtitle: "Upload document to storage",
                icon: Upload,
                section: "Quick Actions",
                color: "text-emerald-500 bg-emerald-50",
                action: () => { navigate("/files"); close(); },
                shortcut: "U"
            },
            {
                id: "new-community",
                title: "Create Community",
                subtitle: "Start a new collaboration workspace",
                icon: Plus,
                section: "Quick Actions",
                color: "text-indigo-500 bg-indigo-50",
                action: () => { navigate("/community"); close(); },
                shortcut: "C"
            },
            {
                id: "settings",
                title: "System Settings",
                subtitle: "Configure your dashboard",
                icon: Settings,
                section: "Quick Actions",
                color: "text-slate-500 bg-slate-50",
                action: () => { navigate("/settings"); close(); },
                shortcut: "S"
            }
        ];

        return [...recentFiles, ...quickActions];
    }, [query, files, teams, manualFolders, navigate, close]);

    const results = getResults();

    // Keyboard Navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev + 1) % results.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setSelectedIndex((prev) => (prev - 1 + results.length) % results.length);
        } else if (e.key === "Enter") {
            e.preventDefault();
            results[selectedIndex]?.action();
        }
    };

    // Scroll active item into view
    useEffect(() => {
        const activeItem = document.getElementById(`cmd-item-${selectedIndex}`);
        if (activeItem && scrollContainerRef.current) {
            activeItem.scrollIntoView({ block: "nearest" });
        }
    }, [selectedIndex]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={close}
                        className="fixed inset-0 bg-black/40 backdrop-blur-[6px] z-[100]"
                    />

                    {/* Dialog Container */}
                    <div className={cn(
                        "fixed inset-0 flex items-start justify-center z-[101] pointer-events-none px-4",
                        isMobile ? "pt-[5vh]" : "pt-[12vh]"
                    )}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: -20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: -20 }}
                            transition={{ duration: 0.15, ease: "easeOut" }}
                            className="
                w-full max-w-2xl
                bg-white
                rounded-3xl
                shadow-[0_0_80px_-20px_rgba(0,0,0,0.4)]
                border border-gray-100/50
                overflow-hidden
                pointer-events-auto
                flex flex-col
              "
                        >
                            {/* Search Header */}
                             <div className="flex items-center px-6 py-5 border-b border-gray-100">
                                <Search className={cn("w-5 h-5 mr-4 transition-colors", isSemanticLoading ? "text-purple-500 animate-pulse" : "text-gray-400")} />
                                <input
                                    autoFocus
                                    placeholder="Search in any language (Hindi, Marathi, English...)"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    className="w-full outline-none text-lg placeholder:text-gray-400 text-gray-800 font-medium"
                                />
                                <div className="flex items-center gap-1 ml-4 px-2 py-1 rounded bg-gray-50 border border-gray-200 text-[10px] font-bold text-gray-400 uppercase">
                                    ESC
                                </div>
                            </div>

                            {/* Suggestions / Results */}
                            <div
                                ref={scrollContainerRef}
                                className="max-h-[450px] overflow-y-auto p-2 pb-4 scroll-smooth custom-scrollbar min-h-[300px]"
                            >
                                {isLoading ? (
                                    <div className="p-4 space-y-4">
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} className="space-y-2">
                                                <div className="h-2 w-20 bg-gray-100 rounded animate-pulse" />
                                                <div className="flex items-center gap-4 p-3">
                                                    <div className="w-10 h-10 bg-gray-100 rounded-xl animate-pulse" />
                                                    <div className="flex-1 space-y-2">
                                                        <div className="h-4 w-1/2 bg-gray-100 rounded animate-pulse" />
                                                        <div className="h-3 w-1/4 bg-gray-100 rounded animate-pulse" />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : results.length > 0 ? (
                                    <div className="space-y-1">
                                        {/* Unique Sections */}
                                        {Array.from(new Set(results.map(r => r.section))).map((section) => (
                                            <div key={section} className="py-2">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-4 mb-2">
                                                    {section}
                                                </p>
                                                {results.filter(r => r.section === section).map((item) => {
                                                    const isSelected = results.indexOf(item) === selectedIndex;
                                                    const Icon = item.icon;

                                                    return (
                                                        <div
                                                            key={item.id}
                                                            id={`cmd-item-${results.indexOf(item)}`}
                                                            onClick={item.action}
                                                            onMouseEnter={() => setSelectedIndex(results.indexOf(item))}
                                                            className={cn(
                                                                "flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all duration-200",
                                                                isSelected
                                                                    ? "bg-purple-50 translate-x-1"
                                                                    : "hover:bg-gray-50"
                                                            )}
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className={cn(
                                                                    "w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm",
                                                                    isSelected ? "bg-white text-purple-600" : (item.color || "bg-gray-100 text-gray-400")
                                                                )}>
                                                                    <Icon className="w-5 h-5" />
                                                                </div>
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className={cn(
                                                                        "font-semibold text-sm truncate",
                                                                        isSelected ? "text-purple-900" : "text-gray-700"
                                                                    )}>
                                                                        {item.title}
                                                                    </span>
                                                                    {item.subtitle && (
                                                                        <span className="text-[11px] text-gray-400 font-medium">
                                                                            {item.subtitle}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3">
                                                                {item.shortcut && (
                                                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-gray-200 bg-gray-50 text-[10px] font-bold text-gray-400">
                                                                        {item.shortcut}
                                                                    </div>
                                                                )}
                                                                <ChevronRight className={cn(
                                                                    "w-4 h-4 transition-all",
                                                                    isSelected ? "text-purple-400 translate-x-0" : "text-gray-300 -translate-x-1 opacity-0"
                                                                )} />
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="py-20 text-center">
                                        <div className="w-16 h-16 rounded-3xl bg-gray-50 flex items-center justify-center mx-auto mb-4 border border-gray-100">
                                            <Terminal className="w-8 h-8 text-gray-300" />
                                        </div>
                                        <p className="text-gray-900 font-bold">No results found</p>
                                        <p className="text-gray-400 text-sm mt-1">Try searching for something else or browse recent items</p>
                                        <button
                                            onClick={() => setQuery("")}
                                            className="mt-6 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition"
                                        >
                                            Browse Recent
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                                <div className="flex gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex items-center gap-0.5 border border-gray-200 bg-white shadow-sm p-1 rounded text-[9px] font-bold text-gray-500">
                                            ↑
                                        </div>
                                        <div className="flex items-center gap-0.5 border border-gray-200 bg-white shadow-sm p-1 rounded text-[9px] font-bold text-gray-500">
                                            ↓
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Navigate</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex items-center gap-0.5 border border-gray-200 bg-white shadow-sm px-1.5 py-1 rounded text-[9px] font-bold text-gray-500">
                                            ENTER
                                        </div>
                                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Select</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 text-gray-400 font-bold text-[10px] uppercase tracking-tighter italic">
                                    ClueDox Command
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
};
