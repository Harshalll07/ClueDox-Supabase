import { motion } from "framer-motion";
import { ArrowLeft, Globe, ChevronRight, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const CommunityList = ({
    type,
    communities,
    isLoading,
    onSelect,
    onDelete,
    onBack
}: {
    type: string;
    communities: any[];
    isLoading: boolean;
    onSelect: (c: any) => void;
    onDelete: (c: any) => void;
    onBack: () => void;
}) => {
    const filtered = communities.filter(c => c.type === type);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full"
        >
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-gray-50 rounded-xl transition-colors text-gray-500 hover:text-gray-900 border border-transparent active:scale-95"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-3xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {type === "my" ? "My Communities" : "Joined Communities"}
                </h2>
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    <div className="animate-pulse space-y-3">
                        <div className="h-[90px] bg-gray-100 rounded-2xl" />
                        <div className="h-[90px] bg-gray-100 rounded-2xl" />
                        <div className="h-[90px] bg-gray-100 rounded-2xl" />
                    </div>
                ) : filtered.length === 0 ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                        <Globe className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400 font-medium text-lg">No communities found in this section.</p>
                    </motion.div>
                ) : (
                    filtered.map((community, i) => (
                        <motion.button
                            key={community.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05, duration: 0.2 }}
                            whileHover={{ x: 4 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => onSelect(community)}
                            className={cn(
                                "w-full flex items-center justify-between p-5 bg-white rounded-2xl border border-gray-200 transition-colors duration-200 group relative",
                                community.id.startsWith("temp-") ? "border-indigo-200 bg-indigo-50/20 opacity-80 cursor-wait" : "hover:border-gray-300"
                            )}
                            disabled={community.id.startsWith("temp-")}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 text-gray-600 flex items-center justify-center transition-colors group-hover:bg-gray-50">
                                    <Globe className="w-5 h-5" />
                                </div>
                                <div className="flex flex-col items-start gap-1">
                                    <span className="font-bold text-lg text-gray-900">{community.name}</span>
                                    {community.id.startsWith("temp-") && (
                                        <span className="text-xs text-indigo-500 font-medium">Creating...</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {community.type === "my" && !community.id.startsWith("temp-") && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete(community); }}
                                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                        title="Delete Community"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
                            </div>
                        </motion.button>
                    ))
                )}
            </div>
        </motion.div>
    );
};
