import { ReactNode, useState, useEffect } from "react";
import { Menu, Search } from "lucide-react";
import Sidebar from "./Sidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { CommandPalette } from "@/components/CommandPalette";
import { SupportChat } from "@/components/SupportChat";
import { useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

const AppLayout = ({ children }: { children: ReactNode }) => {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      setScrolled(target.scrollTop > 10);
    };

    const scrollContainer = document.getElementById("main-scroll-container");
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (scrollContainer) scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, []);



  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-visible font-sans selection:bg-indigo-100 selection:text-indigo-900 transition-colors duration-300">

      {/* SIDEBAR */}
      {!isMobile && (
        <div
          className={cn(
            "fixed top-0 left-0 h-screen z-50 bg-card/80 backdrop-blur-xl border-r border-border/60 shadow-[2px_0_10px_rgba(0,0,0,0.02)]",
            "transition-all duration-300 ease-in-out",
            collapsed ? "w-[76px]" : "w-64"
          )}
        >
          <Sidebar collapsed={collapsed} />
        </div>
      )}

      {/* MAIN CONTENT WRAPPER */}
      <main
        className={cn(
          "flex-1 flex flex-col transition-all duration-300 ease-in-out relative",
          !isMobile && (collapsed ? "ml-[76px]" : "ml-64")
        )}
      >
        {/* TOPBAR */}
        <div
          className={cn(
            "sticky top-0 z-40 h-16 flex items-center justify-between px-6 transition-all duration-200 border-b bg-background/80 backdrop-blur-xl",
            scrolled ? "border-border/60 shadow-sm" : "border-transparent shadow-none"
          )}
        >
          {/* LEFT — MENU */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200 active:scale-[0.96] border border-transparent hover:border-border/50"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* CENTER — COMMAND PALETTE TRIGGER */}
          <div className="hidden md:flex flex-1 justify-center px-8">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('toggle-command-palette'))}
              className="
                w-full max-w-xl group
                flex items-center gap-3 px-5 py-2.5
                rounded-2xl
                border border-border/60
                bg-muted/40
                hover:bg-card
                hover:shadow-xl hover:shadow-purple-500/5
                hover:scale-[1.01]
                hover:border-purple-200/50
                transition-all duration-300 ease-out
                text-muted-foreground
              "
            >
              <Search className="w-4 h-4 group-hover:text-purple-500 transition-colors" />
              <span className="text-sm font-medium flex-1 text-left truncate pr-4 text-muted-foreground group-hover:text-foreground">Search in any language (Hindi, English, Marathi...)</span>
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-background text-[10px] font-bold text-muted-foreground">
                {isMobile ? "Search" : (navigator.userAgent.includes("Mac") ? "⌘K" : "Ctrl+K")}
              </div>
            </button>
          </div>

          {/* RIGHT — NOTIFICATIONS */}
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 rounded-xl text-muted-foreground hover:bg-accent transition-colors">
              <Search className="w-5 h-5" />
            </button>
            <NotificationBell />
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div id="main-scroll-container" className="flex-1 overflow-y-auto w-full relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="min-h-full pb-10"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <CommandPalette />
      <SupportChat />
    </div>
  );
};

export default AppLayout