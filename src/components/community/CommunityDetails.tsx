import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, UserPlus, FileText, User, Trash2, Shield, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const CommunityDetails = ({
    community,
    files,
    members,
    isFilesLoading,
    isMembersLoading,
    onBack,
    onDelete,
    activeTab,
    setActiveTab
}: {
    community: any;
    files: any[];
    members: any[];
    isFilesLoading: boolean;
    isMembersLoading: boolean;
    onBack: () => void;
    onDelete: () => void;
    activeTab: string;
    setActiveTab: (t: string) => void;
}) => {
    // Already filtered by DB schema natively before arriving, 
    // but just checking safe matching if nested hooks drop arrays globally.
    const communityFiles = files.filter(f => !f.team_id || f.team_id === community.id);
    const communityMembers = members.filter(m => !m.team_id || m.team_id === community.id);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full space-y-6"
        >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white rounded-2xl border border-gray-200">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2.5 hover:bg-gray-50 border border-transparent rounded-xl transition-all text-gray-500 hover:text-gray-900 active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{community.name}</h1>
                        <p className="text-sm font-medium text-gray-500 flex items-center gap-2 mt-0.5">
                            <span className={cn("w-2 h-2 rounded-full", community.type === "my" ? "bg-indigo-500" : "bg-emerald-500")} />
                            {community.type === "my" ? "Owner" : "Member"} Workspace
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {community.type === "my" && (
                        <button
                            onClick={onDelete}
                            className="p-2.5 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors shrink-0"
                            title="Delete Community"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors active:scale-[0.98]">
                        <UserPlus className="w-4 h-4" /> Invite
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div>
                {/* Tabs */}
                <div className="flex items-center gap-4 mb-6 border-b border-gray-100 pb-px px-2">
                    <button
                        onClick={() => setActiveTab("files")}
                        className={cn(
                            "relative px-4 py-3 text-sm font-semibold transition-colors",
                            activeTab === 'files' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'
                        )}
                    >
                        Files
                        {activeTab === 'files' && (
                            <motion.div layoutId="details-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab("members")}
                        className={cn(
                            "relative px-4 py-3 text-sm font-semibold transition-colors",
                            activeTab === 'members' ? 'text-indigo-600' : 'text-gray-500 hover:text-gray-900'
                        )}
                    >
                        Members
                        {activeTab === 'members' && (
                            <motion.div layoutId="details-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-t-full" />
                        )}
                    </button>
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {activeTab === "files" ? (
                            <motion.div
                                key="files"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="divide-y divide-gray-100"
                            >
                                {isFilesLoading ? (
                                    <div className="p-5 animate-pulse space-y-3">
                                        <div className="h-16 bg-gray-100 rounded-xl" />
                                        <div className="h-16 bg-gray-100 rounded-xl" />
                                        <div className="h-16 bg-gray-100 rounded-xl" />
                                    </div>
                                ) : communityFiles.length > 0 ? (
                                    communityFiles.map((file, i) => (
                                        <div key={file.id} className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors group cursor-pointer">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-white text-gray-500 flex items-center justify-center border border-gray-200 group-hover:bg-gray-50 transition-colors shrink-0">
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-gray-900 text-sm truncate max-w-[200px] sm:max-w-xs">{file.name}</span>
                                                    {file.shared && (
                                                        <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">Shared Resource</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                {file.shared && (
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100/50">
                                                        <Shield className="w-3 h-3 text-indigo-500" />
                                                        <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tight">{file.permission}</span>
                                                    </div>
                                                )}
                                                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                                        <FileText className="w-12 h-12 text-gray-200 mb-3" />
                                        <p className="font-medium">No files attached yet.</p>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="members"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="divide-y divide-gray-100"
                            >
                                {isMembersLoading ? (
                                    <div className="p-5 animate-pulse space-y-3">
                                        <div className="h-16 bg-gray-100 rounded-xl" />
                                        <div className="h-16 bg-gray-100 rounded-xl" />
                                    </div>
                                ) : communityMembers.length > 0 ? (
                                    communityMembers.map((member, i) => (
                                        <div key={member.id} className="flex items-center gap-4 p-5 hover:bg-gray-50 transition-colors group cursor-pointer">
                                            <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 group-hover:bg-gray-50 transition-colors">
                                                <User className="w-5 h-5" />
                                            </div>
                                            <span className="font-semibold text-gray-900 text-sm">{member.name}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                                        <User className="w-12 h-12 text-gray-200 mb-3" />
                                        <p className="font-medium">No members found.</p>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );
};
