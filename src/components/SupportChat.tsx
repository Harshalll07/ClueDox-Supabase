import { useState, FormEvent, useRef, useEffect, useCallback } from "react";
import { Send, Bot, Sparkles, MessageSquare, CreditCard, Upload, Zap, Volume2, VolumeX } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ChatBubble,
  ChatBubbleAvatar,
  ChatBubbleMessage,
} from "@/components/ui/chat-bubble";
import { ChatInput } from "@/components/ui/chat-input";
import {
  ExpandableChat,
  ExpandableChatHeader,
  ExpandableChatBody,
  ExpandableChatFooter,
} from "@/components/ui/expandable-chat";
import { ChatMessageList } from "@/components/ui/chat-message-list";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Message {
  id: string;
  content: string;
  sender: "ai" | "user";
  isStreaming?: boolean;
}

const SUGGESTIONS = [
  { text: "How does pricing work?", icon: CreditCard },
  { text: "How to upload files?", icon: Upload },
  { text: "What is AI search?", icon: Zap },
];

export function SupportChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current;
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, isStreaming, scrollToBottom]);

  // Track unread messages
  useEffect(() => {
    if (!isOpen && messages.length > 0 && messages[messages.length - 1].sender === "ai") {
      setUnreadCount(prev => prev + 1);
      if (soundEnabled) {
        const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3");
        audio.volume = 0.4;
        audio.play().catch(() => { });
      }
    }
  }, [messages, isOpen, soundEnabled]);

  const simulateStreaming = async (text: string, messageId: string) => {
    setIsStreaming(true);
    let currentText = "";
    const words = text.split(" ");

    for (let i = 0; i < words.length; i++) {
      currentText += words[i] + " ";
      setMessages(prev => prev.map(msg =>
        msg.id === messageId ? { ...msg, content: currentText } : msg
      ));
      await new Promise(resolve => setTimeout(resolve, 30 + Math.random() * 40));
    }

    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, isStreaming: false } : msg
    ));
    setIsStreaming(false);
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading || isStreaming) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: text.trim(),
      sender: "user"
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const conversationHistory = messages.map(m => ({
        role: m.sender === "ai" ? "assistant" : "user",
        content: m.content,
      }));
      conversationHistory.push({ role: "user", content: text.trim() });

      const { data, error } = await supabase.functions.invoke("support-chat", {
        body: { messages: conversationHistory },
      });

      if (error) throw error;

      const reply = data?.reply || "I'm not sure about that. Could you rephrase your question?";
      const aiMessageId = (Date.now() + 1).toString();

      const aiMessage: Message = {
        id: aiMessageId,
        content: "",
        sender: "ai",
        isStreaming: true
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);
      await simulateStreaming(reply, aiMessageId);

    } catch (err) {
      console.error("Chat error:", err);
      toast.error("Failed to connect to AI assistant");
      setIsLoading(false);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: "Sorry, I'm having trouble connecting. Please check your internet or try later!",
        sender: "ai"
      }]);
    }
  };

  return (
    <ExpandableChat
      position="bottom-right"
      size="md"
      className="z-[9999]"
      icon={
        <div className="flex items-center justify-center">
          <img
            src="/logo.jpeg"
            alt="Cluedox"
            className="w-7 h-7 object-contain drop-shadow-sm"
          />
        </div>
      }
      unreadCount={unreadCount}
      onClick={() => {
        if (!isOpen) {
          setIsOpen(true);
          setUnreadCount(0);
        }
      }}
    >
      <ExpandableChatHeader className="relative overflow-hidden bg-white/50 dark:bg-black/20 backdrop-blur-md">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
        <div className="flex items-center justify-between w-full pr-8">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/10 shadow-inner">
                <Bot className="w-6 h-6 text-primary" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-zinc-900 shadow-sm animate-pulse-dot" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">AI Assistant</h3>
                <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-[10px] font-bold text-primary uppercase tracking-wider">Online</span>
              </div>
              <p className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Usually replies instantly</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
            onClick={(e) => {
              e.stopPropagation();
              setSoundEnabled(!soundEnabled);
            }}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-zinc-500" /> : <VolumeX className="h-4 w-4 text-zinc-400" />}
          </Button>
        </div>
      </ExpandableChatHeader>

      <ExpandableChatBody className="bg-transparent/5">
        <ChatMessageList
          ref={scrollRef}
          className="p-4 space-y-6 scroll-smooth"
        >
          <AnimatePresence initial={false}>
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center h-full text-center space-y-6 py-8"
              >
                <div className="w-16 h-16 rounded-3xl bg-primary/5 flex items-center justify-center animate-bounce-slow">
                  <Sparkles className="w-8 h-8 text-primary/40" />
                </div>
                <div className="space-y-2 px-6">
                  <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 italic">✨ Ask anything about Cluedox</h4>
                  <p className="text-sm text-zinc-500 max-w-[240px] leading-relaxed">
                    I can help with file management, pricing, search methods, and more.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 w-full max-w-[260px]">
                  <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest text-center mb-1">Try asking</p>
                  {SUGGESTIONS.map((s, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.02, x: 5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleSendMessage(s.text)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white/40 dark:bg-zinc-900/40 border border-black/5 dark:border-white/5 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-900 transition-all shadow-sm group"
                    >
                      <s.icon className="w-4 h-4 text-primary group-hover:rotate-12 transition-transform" />
                      <span className="font-medium">{s.text}</span>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut", delay: index === messages.length - 1 ? 0 : 0 }}
                >
                  <ChatBubble
                    variant={message.sender === "ai" ? "received" : "sent"}
                    layout="ai"
                    className="max-w-[85%]"
                  >
                    {message.sender === "ai" && (
                      <ChatBubbleAvatar
                        className="w-10 h-10 border border-primary/10 shadow-sm"
                        fallback="AI"
                      />
                    )}
                    <ChatBubbleMessage
                      variant={message.sender === "ai" ? "received" : "sent"}
                      className={cn(
                        "rounded-2xl px-4 py-3 text-[14px] leading-relaxed shadow-sm",
                        message.sender === "ai"
                          ? "bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border border-black/5 dark:border-white/5 text-zinc-800 dark:text-zinc-200"
                          : "bg-gradient-to-br from-primary to-primary/90 text-white font-medium"
                      )}
                    >
                      {message.sender === "ai" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1 [&>li]:my-0.5 [&>h1]:text-sm [&>h2]:text-sm [&>h3]:text-xs [&>p]:text-[13.5px] [&_code]:text-xs [&_code]:bg-black/5 [&_code]:px-1 [&_code]:rounded animate-in fade-in duration-500">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                          {message.isStreaming && <span className="inline-block w-1.5 h-4 ml-1 bg-primary/40 animate-pulse rounded-full align-middle" />}
                        </div>
                      ) : (
                        message.content
                      )}
                    </ChatBubbleMessage>
                  </ChatBubble>
                </motion.div>
              ))
            )}

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/5 border border-primary/10">
                  <Bot className="w-5 h-5 text-primary opacity-50" />
                </div>
                <div className="bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm px-4 py-3 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-bold text-zinc-400">AI is thinking</span>
                    <div className="flex gap-1 ml-1 pt-1">
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }} className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </ChatMessageList>
      </ExpandableChatBody>

      <ExpandableChatFooter className="bg-white/50 dark:bg-black/20 backdrop-blur-md border-t border-white/10 p-3 pt-0">
        <div className="relative">
          {/* Suggestions Tooltip */}
          {messages.length > 0 && messages.length < 6 && (
            <div className="flex gap-2 overflow-x-auto pb-3 pt-4 no-scrollbar">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  disabled={isLoading || isStreaming}
                  onClick={() => handleSendMessage(s.text)}
                  className="flex-none px-3 py-1.5 rounded-full bg-white/60 dark:bg-zinc-800/60 border border-black/5 dark:border-white/5 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 hover:bg-primary/10 hover:text-primary transition-all whitespace-nowrap active:scale-95 disabled:opacity-50"
                >
                  {s.text}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="flex items-center gap-2 bg-white/80 dark:bg-zinc-900/80 rounded-2xl border border-black/5 dark:border-white/10 p-1.5 pl-3 focus-within:ring-2 focus-within:ring-primary/20 transition-all shadow-sm"
          >
            <ChatInput
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              disabled={isLoading || isStreaming}
              className="flex-1 min-h-[44px] h-[44px] text-[14px] bg-transparent border-0 focus-visible:ring-0 px-1 py-3 placeholder:text-zinc-400"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(input);
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isLoading || isStreaming || !input.trim()}
              className="h-10 w-10 shrink-0 rounded-xl bg-primary text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-30"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
          <div className="text-center mt-2">
            <p className="text-[10px] text-zinc-400 font-medium tracking-tight">AI Assistant can make mistakes. Verify important info.</p>
          </div>
        </div>
      </ExpandableChatFooter>
    </ExpandableChat>
  );
}
