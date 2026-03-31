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

export function useSmartFolders() {
  const [folders, setFolders] = useState<SmartFolder[]>(() => {
    try { return JSON.parse(localStorage.getItem(SMART_FOLDERS_KEY) || "[]"); }
    catch { return []; }
  });

  const [pinnedFolders, setPinnedFolders] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(PINNED_FOLDERS_KEY) || "[]"); }
    catch { return []; }
  });

  const saveFolders = useCallback((newFolders: SmartFolder[], fileCount: number) => {
    localStorage.setItem(SMART_FOLDERS_KEY, JSON.stringify(newFolders));
    localStorage.setItem(SMART_FOLDERS_FILE_COUNT_KEY, String(fileCount));
    setFolders(newFolders);
  }, []);

  const togglePin = useCallback((folderName: string) => {
    setPinnedFolders(prev => {
      const next = prev.includes(folderName)
        ? prev.filter(n => n !== folderName)
        : [...prev, folderName];
      localStorage.setItem(PINNED_FOLDERS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const getSavedFileCount = useCallback(() => {
    return parseInt(localStorage.getItem(SMART_FOLDERS_FILE_COUNT_KEY) || "0", 10);
  }, []);

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
  };
}
