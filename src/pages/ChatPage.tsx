import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Loader2, FileText, X, Folder, Plus } from "lucide-react";
import AppLayout from "./AppLayout";
import { useFiles } from "@/hooks/useFiles";
import { useSmartFolders } from "@/hooks/useSmartFolders";
import { useFolders } from "@/hooks/useFolders";
import { FolderPickerModal } from "@/components/chat/FolderPickerModal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSearchParams } from "react-router-dom";
import { CollaboratorAvatars } from "@/components/CollaboratorAvatars";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/doc-chat`;

async function streamChat({
  messages,
  fileIds,
  onDelta,
  onDone,
  onError,
}: {
  messages: Msg[];
  fileIds: string[];
  onDelta: (t: string) => void;
  onDone: () => void;
  onError: (e: string) => void;
}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) { onError("Not logged in"); return; }

  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages, fileIds }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Request failed" }));
    onError(err.error || "Request failed");
    return;
  }
  if (!resp.body) { onError("No response body"); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const c = parsed.choices?.[0]?.delta?.content;
        if (c) onDelta(c);
      } catch { /* partial */ }
    }
  }
  onDone();
}

function SimpleMarkdown({ content }: { content: string }) {
  // Basic markdown rendering
  const lines = content.split("\n");
  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("### ")) return <h3 key={i} className="font-bold text-base mt-2">{line.slice(4)}</h3>;
        if (line.startsWith("## ")) return <h2 key={i} className="font-bold text-lg mt-2">{line.slice(3)}</h2>;
        if (line.startsWith("# ")) return <h1 key={i} className="font-bold text-xl mt-2">{line.slice(2)}</h1>;
        if (line.startsWith("- ")) return <li key={i} className="ml-4 list-disc">{line.slice(2)}</li>;
        if (line.startsWith("**") && line.endsWith("**")) return <p key={i} className="font-bold">{line.slice(2, -2)}</p>;
        if (line.trim() === "") return <br key={i} />;
        // Bold inline
        const parts = line.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i}>
            {parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}
          </p>
        );
      })}
    </div>
  );
}

const ChatPage = () => {
  const { data: files } = useFiles();
  const { folders, getAllFileIdsInFolder, getFolderByPath } = useSmartFolders();
  const { folders: userFolders } = useFolders();
  const [searchParams] = useSearchParams();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [selectedFolderPaths, setSelectedFolderPaths] = useState<string[][]>([]); // Array of paths [folder, sub, deep]
  const [selectedUserFolderIds, setSelectedUserFolderIds] = useState<string[]>([]);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-select file or folder from URL query param
  useEffect(() => {
    if (!files || folders.length === 0) return;

    const fileId = searchParams.get("fileId");
    if (fileId && files.some(f => f.id === fileId) && !selectedFileIds.includes(fileId)) {
      setSelectedFileIds(prev => prev.includes(fileId) ? prev : [fileId]);
    }

    const folder = searchParams.get("folder");
    const subfolder = searchParams.get("subfolder");
    const deepSub = searchParams.get("deepSub");
    const userFolderId = searchParams.get("userFolderId");

    if (folder) {
      const path = [folder];
      if (subfolder) path.push(subfolder);
      if (deepSub) path.push(deepSub);

      const pathStr = path.join("/");
      if (!selectedFolderPaths.some(p => p.join("/") === pathStr)) {
        setSelectedFolderPaths(prev => [...prev, path]);
      }
    }

    if (userFolderId && !selectedUserFolderIds.includes(userFolderId)) {
      setSelectedUserFolderIds(prev => [...prev, userFolderId]);
    }
  }, [searchParams, files, folders, userFolders]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Msg = { role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    // Collect all file IDs from selected folders
    const folderFileIds = selectedFolderPaths.flatMap(path => {
      const folder = getFolderByPath(path);
      return folder ? getAllFileIdsInFolder(folder) : [];
    });

    // Collect all file IDs from selected manual folders
    const userFolderFileIds = selectedUserFolderIds.flatMap(id => {
      const f = userFolders.find(x => x.id === id);
      return f ? f.fileIds : [];
    });

    const allContextIds = Array.from(new Set([...selectedFileIds, ...folderFileIds, ...userFolderFileIds]));

    // Help the AI by explicitly mentioning the selected folders in the context
    let contextDescription = "";
    const names = [
      ...selectedFolderPaths.map(p => p[p.length - 1]),
      ...selectedUserFolderIds.map(id => userFolders.find(x => x.id === id)?.name).filter(Boolean)
    ];

    if (names.length > 0) {
      contextDescription = `[Context: User has selected the following folders: ${names.join(", ")}. Please use these for the 'folder' context.]\n`;
    }

    await streamChat({
      messages: [...messages, { ...userMsg, content: contextDescription + userMsg.content }],
      fileIds: allContextIds,
      onDelta: upsert,
      onDone: () => setIsLoading(false),
      onError: (e) => {
        setMessages(prev => [...prev, { role: "assistant", content: `Error: ${e}` }]);
        setIsLoading(false);
      },
    });
  };

  const toggleFile = (id: string) => {
    setSelectedFileIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleFolderPath = (path: string[]) => {
    const pathStr = path.join("/");
    setSelectedFolderPaths(prev =>
      prev.some(p => p.join("/") === pathStr)
        ? prev.filter(p => p.join("/") !== pathStr)
        : [...prev, path]
    );
  };

  const toggleUserFolder = (id: string) => {
    setSelectedUserFolderIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto h-[calc(100vh-6rem)] flex flex-col">
        {/* Header */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">AI Document Chat</h1>
            <p className="text-muted-foreground text-sm mt-1">Ask questions about your documents</p>
          </div>
          <div className="flex -space-x-1">
            {selectedUserFolderIds.map(id => (
              <CollaboratorAvatars key={id} resourceId={id} resourceType="folder" size="xs" />
            ))}
            {selectedFileIds.map(id => (
              <CollaboratorAvatars key={id} resourceId={id} resourceType="file" size="xs" />
            ))}
          </div>
        </motion.div>

        {/* Context pills */}
        {(selectedFileIds.length > 0 || selectedFolderPaths.length > 0) && (
          <div className="flex flex-wrap gap-2 mb-3">
            {/* Folder Pills */}
            {selectedFolderPaths.map((path, idx) => {
              if (typeof getFolderByPath !== 'function') return null;
              const folder = getFolderByPath(path);
              const totalFiles = folder ? getAllFileIdsInFolder(folder).length : 0;
              return (
                <span key={`f-${idx}`} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-accent/10 text-accent font-medium border border-accent/20">
                  <Folder className="w-3 h-3" />
                  {path[path.length - 1]} ({totalFiles} {totalFiles === 1 ? 'file' : 'files'})
                  <button onClick={() => toggleFolderPath(path)} className="ml-1 hover:text-destructive transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            {/* User Folder Pills */}
            {selectedUserFolderIds.map(id => {
              const folder = userFolders.find(f => f.id === id);
              if (!folder) return null;
              return (
                <span key={`uf-${id}`} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-accent/10 text-accent font-medium border border-accent/20">
                  <Folder className="w-3 h-3" />
                  {folder.name} ({folder.fileIds.length} files)
                  <button onClick={() => toggleUserFolder(id)} className="ml-1 hover:text-destructive transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
            {/* File Pills */}
            {selectedFileIds.map(id => {
              const f = files?.find(f => f.id === id);
              return f ? (
                <span key={id} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-primary/10 text-primary font-medium border border-primary/20">
                  <FileText className="w-3 h-3" />
                  {f.file_name.length > 20 ? f.file_name.slice(0, 20) + "…" : f.file_name}
                  <button onClick={() => toggleFile(id)} className="ml-1 hover:text-destructive transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ) : null;
            })}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
          {messages.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-16">
              <Bot className="w-12 h-12 text-primary/30 mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">Ask me anything about your documents</p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                "What's the penalty clause in my contract?" · "When does my insurance expire?"
              </p>
            </motion.div>
          )}
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "")}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3",
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border"
                )}>
                  {msg.role === "assistant" ? <SimpleMarkdown content={msg.content} /> : <p className="text-sm">{msg.content}</p>}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-accent" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
              </div>
              <div className="bg-card border border-border rounded-2xl px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Folder/File Picker Modal */}
        <FolderPickerModal
          isOpen={showFolderPicker}
          onClose={() => setShowFolderPicker(false)}
          initialSelectedFileIds={selectedFileIds}
          initialSelectedFolderPaths={selectedFolderPaths}
          initialSelectedUserFolderIds={selectedUserFolderIds}
          onSelect={(fileIds, folderPaths, userFolderIds) => {
            setSelectedFileIds(fileIds);
            setSelectedFolderPaths(folderPaths);
            setSelectedUserFolderIds(userFolderIds || []);
          }}
        />

        {/* Input */}
        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFolderPicker(true)}
            className="shrink-0 rounded-xl text-xs gap-1.5 h-9"
          >
            <div className="bg-primary/10 p-1 rounded-md">
              <Plus className="w-3 h-3 text-primary" />
            </div>
            {selectedFileIds.length + selectedFolderPaths.length > 0
              ? `${selectedFileIds.length + selectedFolderPaths.length} selected`
              : "Add Context"}
          </Button>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
            placeholder="Ask about your documents..."
            className="flex-1 bg-secondary/50 rounded-xl px-4 py-2.5 text-sm border border-border focus:outline-none focus:border-primary/50 transition-colors"
            disabled={isLoading}
          />
          <Button onClick={send} disabled={isLoading || !input.trim()} size="sm" className="rounded-xl shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default ChatPage;
