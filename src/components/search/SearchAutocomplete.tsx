import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Clock, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Suggestion {
  icon: string;
  label: string;
  tag: string;
}

interface AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: string) => void;
  suggestions: Suggestion[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const SEARCH_HISTORY_KEY = "Sortifi_search_history";
const MAX_HISTORY = 8;

function getSearchHistory(): string[] {
  try { return JSON.parse(localStorage.getItem(SEARCH_HISTORY_KEY) || "[]"); }
  catch { return []; }
}

function saveSearchHistory(history: string[]) {
  localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

export function addToSearchHistory(query: string) {
  if (!query.trim() || query.trim().length < 2) return;
  const history = getSearchHistory().filter(h => h !== query.trim());
  history.unshift(query.trim());
  saveSearchHistory(history);
}

const exampleQueries = [
  { icon: "📄", label: "Show all invoices", tag: "Finance" },
  { icon: "🏥", label: "Health insurance documents", tag: "Insurance" },
  { icon: "💰", label: "GST or tax returns", tag: "Tax" },
  { icon: "📋", label: "Contracts and agreements", tag: "Legal" },
  { icon: "🆔", label: "Find my passport or Aadhaar", tag: "ID Document" },
  { icon: "📊", label: "Financial reports", tag: "Finance" },
];

export const SearchAutocomplete = ({
  value,
  onChange,
  onSelect,
  suggestions,
  isOpen,
  onOpenChange,
}: AutocompleteProps) => {
  const [focusedIdx, setFocusedIdx] = useState(-1);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<string[]>(getSearchHistory);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { onOpenChange(false); setShowHistory(false); }
    };
    if (isOpen || showHistory) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showHistory, onOpenChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    onChange(newVal);
    setShowHistory(false);
    onOpenChange(newVal.trim().length > 0 && suggestions.length > 0);
  };

  const handleFocus = () => {
    if (!value.trim()) {
      setShowHistory(true);
    } else if (suggestions.length > 0) {
      onOpenChange(true);
    }
  };

  const allItems = isOpen && suggestions.length > 0
    ? suggestions.map(s => s.label)
    : showHistory
    ? [...history, ...exampleQueries.map(e => e.label)]
    : [];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (allItems.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIdx((prev) => (prev + 1) % allItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIdx((prev) => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (focusedIdx >= 0 && allItems[focusedIdx]) {
        onSelect(allItems[focusedIdx]);
        addToSearchHistory(allItems[focusedIdx]);
        setHistory(getSearchHistory());
        onOpenChange(false);
        setShowHistory(false);
      } else if (value.trim()) {
        addToSearchHistory(value.trim());
        setHistory(getSearchHistory());
        onOpenChange(false);
        setShowHistory(false);
      }
    }
  };

  const handleSelectItem = (label: string) => {
    onSelect(label);
    addToSearchHistory(label);
    setHistory(getSearchHistory());
    onOpenChange(false);
    setShowHistory(false);
  };

  const clearHistory = () => {
    saveSearchHistory([]);
    setHistory([]);
  };

  const removeFromHistory = (item: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = history.filter(h => h !== item);
    saveSearchHistory(updated);
    setHistory(updated);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="font-semibold text-primary bg-transparent">{part}</mark>
      ) : (part)
    );
  };

  const showDropdown = (isOpen && suggestions.length > 0) || (showHistory && !value.trim());

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={() => setTimeout(() => { setShowHistory(false); onOpenChange(false); }, 200)}
          placeholder="Search by name, content, tag, or ask a question..."
          className="w-full pl-11 pr-10 py-3.5 text-sm rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all"
        />
        {value && (
          <button
            onClick={() => { onChange(""); setShowHistory(true); inputRef.current?.focus(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden"
          >
            {/* Search suggestions when typing */}
            {isOpen && suggestions.length > 0 && (
              <>
                <div className="px-4 py-2 text-xs font-semibold text-primary uppercase tracking-wider border-b border-border flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  Suggestions
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {suggestions.map((suggestion, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectItem(suggestion.label)}
                      onMouseEnter={() => setFocusedIdx(idx)}
                      className={cn(
                        "px-4 py-3 cursor-pointer flex items-center gap-3 transition-colors",
                        focusedIdx === idx ? "bg-primary/10" : "hover:bg-secondary"
                      )}
                    >
                      <div className="flex-shrink-0 text-lg">{suggestion.icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground text-sm truncate">
                          {highlightMatch(suggestion.label, value)}
                        </div>
                        <div className="text-xs text-muted-foreground">{suggestion.tag}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Empty state: history + examples */}
            {showHistory && !value.trim() && (
              <>
                {history.length > 0 && (
                  <>
                    <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        Recent Searches
                      </span>
                      <button onClick={clearHistory} className="text-[10px] text-destructive hover:underline normal-case font-normal">
                        Clear all
                      </button>
                    </div>
                    <div>
                      {history.map((item, idx) => (
                        <div
                          key={item}
                          onClick={() => handleSelectItem(item)}
                          onMouseEnter={() => setFocusedIdx(idx)}
                          className={cn(
                            "px-4 py-2.5 cursor-pointer flex items-center gap-3 transition-colors group",
                            focusedIdx === idx ? "bg-primary/10" : "hover:bg-secondary"
                          )}
                        >
                          <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm text-foreground flex-1 truncate">{item}</span>
                          <button
                            onClick={(e) => removeFromHistory(item, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded text-muted-foreground hover:text-destructive transition-all"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  Try searching for
                </div>
                <div className="max-h-60 overflow-y-auto">
                  {exampleQueries.map((example, idx) => (
                    <div
                      key={example.label}
                      onClick={() => handleSelectItem(example.label)}
                      onMouseEnter={() => setFocusedIdx(history.length + idx)}
                      className={cn(
                        "px-4 py-2.5 cursor-pointer flex items-center gap-3 transition-colors",
                        focusedIdx === history.length + idx ? "bg-primary/10" : "hover:bg-secondary"
                      )}
                    >
                      <div className="text-base">{example.icon}</div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-foreground">{example.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">· {example.tag}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="px-4 py-2.5 border-t border-border text-xs text-muted-foreground flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 bg-secondary border border-border rounded text-[10px]">↑↓</kbd>
              <span>navigate</span>
              <kbd className="px-1.5 py-0.5 bg-secondary border border-border rounded text-[10px]">↵</kbd>
              <span>select</span>
              <kbd className="px-1.5 py-0.5 bg-secondary border border-border rounded text-[10px]">Esc</kbd>
              <span>close</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
