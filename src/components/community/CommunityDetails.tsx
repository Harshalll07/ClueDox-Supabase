import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, UserPlus, FileText, User, Trash2, Shield, ChevronRight, Folder, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { CommunityInviteModal } from "./CommunityInviteModal";
import { useUploadStore } from "@/contexts/UploadContext";
import { toast } from "sonner";

export const CommunityDetails = ({
    community,
    files,
    folders,
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
    folders: any[];
    members: any[];
    isFilesLoading: boolean;
    isMembersLoading: boolean;
    onBack: () => void;
    onDelete: () => void;
    activeTab: string;
    setActiveTab: (t: string) => void;
}) => {
    const [navigationStack, setNavigationStack] = useState<any[]>([]);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
    const { addUpload } = useUploadStore();
    
    // Breadcrumb logic
    const navigateToFolder = (folder: any) => {
        setNavigationStack([...navigationStack, folder]);
    };

    const navigateBackTo = (index: number) => {
        if (index === -1) {
            setNavigationStack([]);
        } else {
            setNavigationStack(navigationStack.slice(0, index + 1));
        }
    };

    const currentFolder = navigationStack[navigationStack.length - 1];
    
    // Filter items based on current folder
    const communityFolders = currentFolder 
        ? folders.filter(f => f.parent_id === currentFolder.id)
        : folders.filter(f => !f.parent_id); 
    
    const communityFiles = currentFolder 
        ? files.filter(f => f.folder_id === currentFolder.id)
        : files.filter(f => !f.folder_id);
        
    const communityMembers = members;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full space-y-6"
        >
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-white dark:bg-[#111113] rounded-2xl border border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-2.5 hover:bg-gray-50 dark:hover:bg-[#1A1A1C] border border-transparent dark:border-gray-800 rounded-xl transition-all text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 active:scale-95"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <button 
                                onClick={() => navigateBackTo(-1)}
                                className="text-gray-500 hover:text-indigo-600 font-medium text-sm transition-colors"
                            >
                                Community
                            </button>
                            {navigationStack.map((folder, i) => (
                                <React.Fragment key={folder.id}>
                                    <ChevronRight className="w-3 h-3 text-gray-400" />
                                    <button 
                                        onClick={() => navigateBackTo(i)}
                                        className={cn(
                                            "font-medium text-sm transition-colors",
                                            i === navigationStack.length - 1 
                                                ? "text-gray-900 dark:text-gray-100" 
                                                : "text-gray-500 hover:text-indigo-600"
                                        )}
                                    >
                                        {folder.name}
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
                            {currentFolder ? currentFolder.name : community.name}
                        </h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {community.type === "my" && (
                        <button
                            onClick={onDelete}
                            className="p-2.5 text-gray-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-500 rounded-xl transition-colors shrink-0"
                            title="Delete Community"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                    
                    <button 
                        onClick={() => setIsInviteModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500 text-white rounded-xl font-medium transition-colors active:scale-[0.98]"
                    >
                        <UserPlus className="w-4 h-4" /> Invite
                    </button>

                    <div className="flex items-center gap-2">
                        <input
                            type="file"
                            id="community-upload"
                            className="hidden"
                            multiple
                            onChange={async (e) => {
                                const fileList = Array.from(e.target.files || []);
                                if (fileList.length === 0) return;
                                
                                for (const file of fileList) {
                                    await addUpload(file, { 
                                        folderId: currentFolder?.id, 
                                        isCommunity: true 
                                    });
                                }
                            }}
                        />
                        <label
                            htmlFor="community-upload"
                            className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-[#1A1A1C] hover:bg-gray-50 dark:hover:bg-[#252529] text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-800 rounded-xl font-medium transition-all cursor-pointer active:scale-[0.98] shadow-sm hover:shadow-md"
                        >
                            <Upload className="w-4 h-4 text-indigo-500 shadow-sm" /> Upload
                        </label>
                    </div>
                </div>
            </div>

            <CommunityInviteModal
                open={isInviteModalOpen}
                onOpenChange={setIsInviteModalOpen}
                folderId={currentFolder?.id || community.id}
                folderName={currentFolder?.name || community.name}
            />

            {/* Content Area */}
            <div>
                {/* Tabs */}
                <div className="flex items-center gap-4 mb-6 border-b border-gray-100 dark:border-gray-800 pb-px px-2">
                    <button
                        onClick={() => setActiveTab("files")}
                        className={cn(
                            "relative px-4 py-3 text-sm font-semibold transition-colors",
                            activeTab === 'files' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
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
                            activeTab === 'members' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                        )}
                    >
                        Members
                        {activeTab === 'members' && (
                            <motion.div layoutId="details-tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-t-full" />
                        )}
                    </button>
                </div>

                {/* Tab Content */}
                <div className="bg-white dark:bg-[#111113] rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden min-h-[400px]">
                    <AnimatePresence mode="wait">
                        {activeTab === "files" ? (
                            <motion.div
                                key="files"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                                className="divide-y divide-gray-100 dark:divide-gray-800"
                            >
                                {isFilesLoading ? (
                                    <div className="p-5 animate-pulse space-y-3">
                                        <div className="h-16 bg-gray-100 dark:bg-[#1A1A1C] rounded-xl" />
                                        <div className="h-16 bg-gray-100 dark:bg-[#1A1A1C] rounded-xl" />
                                        <div className="h-16 bg-gray-100 dark:bg-[#1A1A1C] rounded-xl" />
                                    </div>
                                ) : (communityFolders.length > 0 || communityFiles.length > 0) ? (
                                    <>
                                        {/* Folders List */}
                                        {communityFolders.map((folder) => (
                                            <div 
                                                key={folder.id} 
                                                onClick={() => navigateToFolder(folder)}
                                                className="flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-[#1A1A1C] transition-colors group cursor-pointer"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-100 dark:border-indigo-900/20 group-hover:bg-white dark:group-hover:bg-[#2A2A2E] transition-colors shrink-0">
                                                        <Folder className="w-5 h-5 fill-current" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{folder.name}</span>
                                                        <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Folder</span>
                                                    </div>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:translate-x-0.5 transition-all" />
                                            </div>
                                        ))}

                                        {/* Files List */}
                                        {communityFiles.map((file) => (
                                            <div key={file.id} className="flex items-center justify-between p-5 hover:bg-gray-50 dark:hover:bg-[#1A1A1C] transition-colors group cursor-pointer">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1A1A1C] text-gray-500 dark:text-gray-400 flex items-center justify-center border border-gray-200 dark:border-gray-700 group-hover:bg-gray-50 dark:group-hover:bg-[#2A2A2E] transition-colors shrink-0">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate max-w-[200px] sm:max-w-xs">{file.name || file.file_name}</span>
                                                        <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold uppercase tracking-wider">File</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    {file.shared && (
                                                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100/50 dark:border-indigo-900/30">
                                                            <Shield className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                                                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tight">{file.permission}</span>
                                                        </div>
                                                    )}
                                                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-500 dark:group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all" />
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-24 text-gray-400 dark:text-gray-600">
                                        <FileText className="w-12 h-12 text-gray-200 dark:text-gray-800 mb-3" />
                                        <p className="font-medium">No resources found in this folder.</p>
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
                                className="divide-y divide-gray-100 dark:divide-gray-800"
                            >
                                {isMembersLoading ? (
                                    <div className="p-5 animate-pulse space-y-3">
                                        <div className="h-16 bg-gray-100 dark:bg-[#1A1A1C] rounded-xl" />
                                        <div className="h-16 bg-gray-100 dark:bg-[#1A1A1C] rounded-xl" />
                                    </div>
                                ) : communityMembers.length > 0 ? (
                                    communityMembers.map((member, i) => (
                                        <div key={member.id} className="flex items-center gap-4 p-5 hover:bg-gray-50 dark:hover:bg-[#1A1A1C] transition-colors group cursor-pointer">
                                            <div className="w-10 h-10 rounded-full bg-white dark:bg-[#1A1A1C] border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:bg-gray-50 dark:group-hover:bg-[#2A2A2E] transition-colors">
                                                <User className="w-5 h-5" />
                                            </div>
                                            <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{member.name}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-24 text-gray-400 dark:text-gray-600">
                                        <User className="w-12 h-12 text-gray-200 dark:text-gray-800 mb-3" />
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
