import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Calendar, ChevronDown, ChevronRight } from "lucide-react";
import { TAG_CATEGORIES, groupTagsByCategory } from "@/lib/tagCategories";

interface SearchFiltersProps {
  allTags: string[];
  selectedTags: string[];
  toggleTag: (tag: string) => void;
  selectedTypes: string[];
  toggleType: (type: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
}

const fileTypes = ["pdf", "image", "docx", "spreadsheet"] as const;

const SearchFilters = ({
  allTags, selectedTags, toggleTag,
  selectedTypes, toggleType,
  dateFrom, dateTo, onDateFromChange, onDateToChange,
}: SearchFiltersProps) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const grouped = groupTagsByCategory(allTags);

  const toggleCategory = (catName: string) => {
    setExpandedCategory(expandedCategory === catName ? null : catName);
  };

  const selectAllInCategory = (catName: string) => {
    const tags = grouped[catName] || [];
    const allSelected = tags.every((t) => selectedTags.includes(t));
    if (allSelected) {
      tags.forEach((t) => { if (selectedTags.includes(t)) toggleTag(t); });
    } else {
      tags.forEach((t) => { if (!selectedTags.includes(t)) toggleTag(t); });
    }
  };

  const categoriesWithTags = TAG_CATEGORIES.filter(
    (cat) => (grouped[cat.name]?.length || 0) > 0
  );

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="glass rounded-xl p-4 mb-6 overflow-hidden"
    >
      {/* Categories */}
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Categories</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {categoriesWithTags.map((cat) => {
            const catTags = grouped[cat.name] || [];
            const selectedCount = catTags.filter((t) => selectedTags.includes(t)).length;
            const isExpanded = expandedCategory === cat.name;

            return (
              <div key={cat.name} className="inline-flex flex-col">
                <button
                  onClick={() => toggleCategory(cat.name)}
                  className={cn(
                    "text-xs px-3 py-1.5 rounded-full font-medium transition-colors flex items-center gap-1.5",
                    selectedCount > 0
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  )}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.name}</span>
                  <span className="text-[10px] opacity-70">({catTags.length})</span>
                  {selectedCount > 0 && selectedCount < catTags.length && (
                    <span className="bg-primary-foreground/20 text-[10px] px-1 rounded">{selectedCount}</span>
                  )}
                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                </button>
              </div>
            );
          })}
        </div>

        {/* Expanded tags for selected category */}
        <AnimatePresence>
          {expandedCategory && grouped[expandedCategory] && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="pl-2 border-l-2 border-primary/20 ml-2 mt-2"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {TAG_CATEGORIES.find(c => c.name === expandedCategory)?.icon} {expandedCategory} tags
                </span>
                <button
                  onClick={() => selectAllInCategory(expandedCategory)}
                  className="text-[10px] text-primary hover:underline"
                >
                  {(grouped[expandedCategory] || []).every(t => selectedTags.includes(t)) ? "Deselect all" : "Select all"}
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {(grouped[expandedCategory] || []).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "text-[11px] px-2.5 py-0.5 rounded-full font-medium transition-colors",
                      selectedTags.includes(tag)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* File Type */}
      <div className="mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">File Type</p>
        <div className="flex gap-1.5">
          {fileTypes.map((type) => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={cn(
                "text-xs px-3 py-1 rounded-full font-medium transition-colors capitalize",
                selectedTypes.includes(type) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          <Calendar className="w-3 h-3 inline mr-1" />
          Date Range
        </p>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="h-8 text-xs bg-secondary border-border w-36"
            placeholder="From"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="h-8 text-xs bg-secondary border-border w-36"
            placeholder="To"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { onDateFromChange(""); onDateToChange(""); }}
              className="text-xs text-destructive hover:underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default SearchFilters;
