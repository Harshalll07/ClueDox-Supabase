import { motion } from "framer-motion";
import { Users, UserCircle, Plus, Layers } from "lucide-react";

export const CommunityTypes = ({
    communities,
    isLoading,
    onSelect,
    onAddCommunity
}: {
    communities: any[],
    isLoading: boolean,
    onSelect: (type: "my" | "joined") => void,
    onAddCommunity: () => void
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full"
        >
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-gray-100 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                        Community
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Collaborate with your network, share files, and manage access in one place.
                    </p>
                </div>
                <button
                    onClick={onAddCommunity}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-[#1A1A1C] hover:bg-gray-800 dark:hover:bg-[#2A2A2E] text-white rounded-xl font-medium transition-colors shrink-0 active:scale-95 border border-transparent dark:border-gray-800"
                >
                    <Plus className="w-5 h-5" /> New Community
                </button>
            </div>

            {/* Content Section */}
            <div className="space-y-6">
                <h3 className="text-xs uppercase tracking-wide text-gray-400 dark:text-gray-500 font-semibold">
                    YOUR COMMUNITIES
                </h3>

                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-pulse">
                        <div className="h-[250px] bg-gray-100 rounded-2xl border border-gray-200" />
                        <div className="h-[250px] bg-gray-100 rounded-2xl border border-gray-200" />
                    </div>
                ) : communities.length === 0 ? (
                    <div className="text-center py-20">
                        <Layers className="w-14 h-14 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                        <p className="text-gray-400 dark:text-gray-500 text-lg font-medium">
                            Create your first community to start collaborating
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <motion.button
                            onClick={() => onSelect("my")}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.99 }}
                            className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm dark:shadow-none flex flex-col items-center justify-center transition-all duration-200 group"
                        >
                            <div className="w-16 h-16 bg-white dark:bg-[#1A1A1C] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-gray-50 dark:group-hover:bg-[#2A2A2E] transition-colors duration-200">
                                <UserCircle className="w-8 h-8" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">My Communities</h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-2 text-center text-sm font-medium">Spaces you created and manage</p>
                        </motion.button>

                        <motion.button
                            onClick={() => onSelect("joined")}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.99 }}
                            className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm dark:shadow-none flex flex-col items-center justify-center transition-all duration-200 group"
                        >
                            <div className="w-16 h-16 bg-white dark:bg-[#1A1A1C] border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-2xl flex items-center justify-center mb-5 group-hover:bg-gray-50 dark:group-hover:bg-[#2A2A2E] transition-colors duration-200">
                                <Users className="w-8 h-8" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">Joined Communities</h2>
                            <p className="text-gray-500 dark:text-gray-400 mt-2 text-center text-sm font-medium">Spaces you are a member of</p>
                        </motion.button>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
