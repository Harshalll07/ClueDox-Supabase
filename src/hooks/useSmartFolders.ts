import { useState, useCallback, useEffect } from "react";
import { Folder, Briefcase, Heart, Shield, Car, Home, Receipt, FileText, Image, IdCard } from "lucide-react";

export interface SubFolder {
  name: string;
  fileIds: string[];
  subfolders?: SubFolder[];
}

export interface SmartFolder {
  name: string;
  icon: string;
  subfolders: SubFolder[];
}

export const iconMap: Record<string, any> = {
  folder: Folder, briefcase: Briefcase, heart: Heart, shield: Shield,
  car: Car, home: Home, receipt: Receipt, "file-text": FileText, image: Image, "id-card": IdCard,
};

const SMART_FOLDERS_KEY = "Cluedox_smart_folders";
const SMART_FOLDERS_FILE_COUNT_KEY = "Cluedox_smart_folders_count";
const PINNED_FOLDERS_KEY = "Cluedox_pinned_folders";

export function useSmartFolders(userId?: string) {
  const getScopedKey = useCallback((baseKey: string) => {
    return userId ? `${baseKey}_${userId}` : baseKey;
  }, [userId]);

  const [folders, setFolders] = useState<SmartFolder[]>([]);
  const [pinnedFolders, setPinnedFolders] = useState<string[]>([]);

  // Load folders when userId changes
  useEffect(() => {
    try {
      const stored = localStorage.getItem(getScopedKey(SMART_FOLDERS_KEY));
      setFolders(JSON.parse(stored || "[]"));
    } catch {
      setFolders([]);
    }

    try {
      const stored = localStorage.getItem(getScopedKey(PINNED_FOLDERS_KEY));
      setPinnedFolders(JSON.parse(stored || "[]"));
    } catch {
      setPinnedFolders([]);
    }
  }, [userId, getScopedKey]);

  const saveFolders = useCallback((newFolders: SmartFolder[], fileCount: number) => {
    localStorage.setItem(getScopedKey(SMART_FOLDERS_KEY), JSON.stringify(newFolders));
    localStorage.setItem(getScopedKey(SMART_FOLDERS_FILE_COUNT_KEY), String(fileCount));
    setFolders(newFolders);
  }, [getScopedKey]);

  const togglePin = useCallback((folderName: string) => {
    setPinnedFolders(prev => {
      const next = prev.includes(folderName)
        ? prev.filter(n => n !== folderName)
        : [...prev, folderName];
      localStorage.setItem(getScopedKey(PINNED_FOLDERS_KEY), JSON.stringify(next));
      return next;
    });
  }, [getScopedKey]);

  const getSavedFileCount = useCallback(() => {
    return parseInt(localStorage.getItem(getScopedKey(SMART_FOLDERS_FILE_COUNT_KEY)) || "0", 10);
  }, [getScopedKey]);

  const clearFolders = useCallback(() => {
    localStorage.removeItem(getScopedKey(SMART_FOLDERS_KEY));
    localStorage.removeItem(getScopedKey(SMART_FOLDERS_FILE_COUNT_KEY));
    localStorage.removeItem(getScopedKey(PINNED_FOLDERS_KEY));
    setFolders([]);
    setPinnedFolders([]);
  }, [getScopedKey]);

  const getAllFileIdsInFolder = useCallback((item: SmartFolder | SubFolder): string[] => {
    let ids: string[] = [];
    if ("fileIds" in item) {
      ids = [...item.fileIds];
    }
    if (item.subfolders) {
      item.subfolders.forEach(sub => {
        ids = [...ids, ...getAllFileIdsInFolder(sub)];
      });
    }
    return Array.from(new Set(ids));
  }, []);

  const getFolderByPath = useCallback((path: string[]): SmartFolder | SubFolder | null => {
    if (path.length === 0) return null;
    let current: any = folders.find(f => f.name === path[0]);
    if (!current) return null;
    
    for (let i = 1; i < path.length; i++) {
      current = current.subfolders?.find((sf: any) => sf.name === path[i]);
      if (!current) return null;
    }
    return current;
  }, [folders]);

  return {
    folders,
    setFolders,
    saveFolders,
    pinnedFolders,
    togglePin,
    getSavedFileCount,
    getAllFileIdsInFolder,
    getFolderByPath,
    clearFolders,
  };
}
