import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/hooks/useNotifications";
import { toast } from "sonner";

export type UploadStatus = "uploading" | "success" | "error";

export interface UploadItem {
    id: string;
    name: string;
    progress: number;
    status: UploadStatus;
    errorMessage?: string;
}

interface UploadContextType {
    uploads: UploadItem[];
    addUpload: (file: File, options?: { folderId?: string, isCommunity?: boolean }) => Promise<void>;
    removeUpload: (id: string) => void;
    isExpanded: boolean;
    setIsExpanded: (expanded: boolean) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

const MAX_SIZE = 25 * 1024 * 1024;
const PLAN_LIMITS: Record<string, number> = {
    free: 100 * 1024 * 1024,
    starter: 1024 * 1024 * 1024,
    pro: 50 * 1024 * 1024 * 1024,
};

export const UploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [uploads, setUploads] = useState<UploadItem[]>([]);
    const [isExpanded, setIsExpanded] = useState<boolean>(() => {
        const saved = localStorage.getItem("uploadPanelOpen");
        return saved !== null ? saved === "true" : true;
    });

    // Persist state to localStorage
    useEffect(() => {
        localStorage.setItem("uploadPanelOpen", isExpanded.toString());
    }, [isExpanded]);

    // Auto-open if uploads exist
    useEffect(() => {
        if (uploads.length > 0) {
            setIsExpanded(true);
        }
    }, [uploads.length]);

    const updateUpload = useCallback((id: string, updates: Partial<UploadItem>) => {
        setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));
    }, []);

    const checkStorageQuota = async (userId: string, fileSize: number) => {
        const { data: profile } = await supabase
            .from("profiles")
            .select("plan")
            .eq("user_id", userId)
            .maybeSingle();

        const plan = profile?.plan || "free";
        const limit = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

        const { data: filesData } = await supabase
            .from("files")
            .select("file_size")
            .eq("user_id", userId);

        const currentUsage = filesData?.reduce((sum, f) => sum + f.file_size, 0) || 0;
        return currentUsage + fileSize <= limit;
    };

    const addUpload = useCallback(async (file: File, options?: { folderId?: string, isCommunity?: boolean }) => {
        const id = Math.random().toString(36).substring(7);
        const newUpload: UploadItem = {
            id,
            name: file.name,
            progress: 0,
            status: "uploading",
        };

        setUploads((prev) => [newUpload, ...prev]);
        setIsExpanded(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not authenticated");

            // 1. Quota & Size check
            if (file.size > MAX_SIZE) throw new Error("File too large (Max 25MB)");
            const hasQuota = await checkStorageQuota(user.id, file.size);
            if (!hasQuota) throw new Error("Storage quota exceeded. Please upgrade.");

            // 2. Duplicate Check
            const { data: existing } = await (supabase as any).from("files").select("id").eq("user_id", user.id).eq("file_name", file.name).maybeSingle();
            let finalName = file.name;
            if (existing) {
                finalName = `${Date.now()}_${file.name}`;
            }

            const filePath = `${user.id}/${finalName}`;
            updateUpload(id, { progress: 20 });

            // 3. Storage Upload
            const { error: storageError } = await (supabase.storage.from("files") as any).upload(filePath, file);
            if (storageError) throw storageError;

            updateUpload(id, { progress: 50 });

            // 4. DB Insert
            const { data: fileRecord, error: dbError } = await (supabase as any).from("files").insert({
                user_id: user.id,
                file_name: finalName,
                file_url: filePath,
                file_type: file.type || "application/octet-stream",
                file_size: file.size,
                file_status: "uploading",
                folder_id: options?.folderId || null,
                is_community: options?.isCommunity || false,
            }).select("id").single();

            if (dbError) throw dbError;
            updateUpload(id, { progress: 80 });

            // 5. AI Magic
            await supabase.functions.invoke("analyze-file", {
                body: { fileId: fileRecord.id, fileName: finalName, fileType: file.type },
            });

            updateUpload(id, { progress: 100, status: "success" });

            // 6. Notification
            createNotification({
                user_id: user.id,
                type: "file_uploaded",
                title: "File Ready",
                message: `${file.name} is processed`,
                link: "/files",
            }).catch(e => console.error("Notification Error", e));

            // Cleanup
            setTimeout(() => {
                setUploads(prev => prev.filter(u => u.id !== id));
            }, 6000);

        } catch (error: any) {
            updateUpload(id, { status: "error", errorMessage: error.message });
            toast.error(error.message);
        }
    }, [updateUpload]);

    const removeUpload = useCallback((id: string) => {
        setUploads((prev) => prev.filter((u) => u.id !== id));
    }, []);

    return (
        <UploadContext.Provider value={{ uploads, addUpload, removeUpload, isExpanded, setIsExpanded }}>
            {children}
        </UploadContext.Provider>
    );
};

export const useUploadStore = () => {
    const context = useContext(UploadContext);
    if (!context) throw new Error("useUploadStore must be used within an UploadProvider");
    return context;
};
