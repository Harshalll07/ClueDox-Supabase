import { useState, useEffect } from "react";
import { NavLink as RouterNavLink, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Upload, FolderOpen,
  Search, Bell, MessageCircle, FolderTree,
  ArrowLeftRight, Smartphone, BarChart3, HardDrive, Globe,
  ChevronDown, LogOut, Settings, Moon, Sun, User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTheme } from "@/hooks/useTheme";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/upload", icon: Upload, label: "Upload" },
  { to: "/files", icon: FolderOpen, label: "Files" },
  { to: "/search", icon: Search, label: "Search" },
  { to: "/chat", icon: MessageCircle, label: "AI Chat" },
  { to: "/smart-folders", icon: FolderTree, label: "Smart Folders" },
  { to: "/compare", icon: ArrowLeftRight, label: "Compare" },
  { to: "/reminders", icon: Bell, label: "Reminders" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/community", icon: Globe, label: "Community" },
  { to: "/google-drive", icon: HardDrive, label: "Google Drive" },
  { to: "/whatsapp", icon: Smartphone, label: "WhatsApp" }
];

const Sidebar = ({ collapsed }: { collapsed?: boolean }) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (data?.user) {
        const user = data.user;
        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "User";
        setUserName(name);
      } else {
        setUserName("User");
      }
    };

    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const user = session?.user;
        if (user) {
          const name =
            user.user_metadata?.full_name ||
            user.email?.split("@")[0] ||
            "User";
          setUserName(name);
        } else {
          setUserName("User");
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/");
  };

  if (!userName) return null;

  return (
    <aside className="h-full flex flex-col bg-transparent text-foreground overflow-visible relative transition-all duration-300 ease-in-out">
      {/* LOGO */}
      <div className={cn("py-6 border-b border-border/60 flex items-center transition-all duration-300", collapsed ? "justify-center px-0" : "px-6")}>
        {collapsed ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-sm ring-1 ring-indigo-600/20"
          >
            C
          </motion.div>
        ) : (
          <motion.span
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-xl tracking-tight text-foreground font-bold"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Cluedox
          </motion.span>
        )}
      </div>

      {/* NAV */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto scrollbar-hide relative">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.to); // or exact match if needed

          return (
            <RouterNavLink
              key={item.to}
              to={item.to}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ease-out whitespace-nowrap overflow-hidden group hover:scale-[1.02]",
                isActive
                  ? "bg-accent text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                collapsed && "justify-center px-0"
              )}
              title={collapsed ? item.label : undefined}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className="absolute left-0 top-2 bottom-2 w-1 bg-indigo-600 rounded-r-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}

              <Icon className={cn(
                "shrink-0 transition-all duration-200 ease-out",
                collapsed ? "w-6 h-6" : "w-5 h-5",
                isActive ? "text-indigo-600 scale-110" : "text-muted-foreground group-hover:text-foreground group-hover:scale-110"
              )} />

              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -5 }}
                    transition={{ duration: 0.2 }}
                    className="font-medium text-sm truncate"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </RouterNavLink>
          );
        })}
      </nav>

      {/* USER SECTION */}
      <div className="p-3 border-t border-border/60 relative">
        {/* DROPDOWN MENU */}
        <AnimatePresence>
          {isUserMenuOpen && !collapsed && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute bottom-[calc(100%+8px)] left-3 right-3 bg-card/95 backdrop-blur-xl border border-border/60 shadow-xl rounded-2xl p-2 z-50 origin-bottom"
            >
              <button
                onClick={toggleTheme}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-xl hover:bg-accent active:scale-[0.97] transition-all duration-200"
              >
                {isDark ? <Sun className="w-4 h-4 text-muted-foreground transition-transform group-hover:scale-110" /> : <Moon className="w-4 h-4 text-muted-foreground transition-transform group-hover:scale-110" />}
                {isDark ? "Light Mode" : "Dark Mode"}
              </button>
              <button
                onClick={() => {
                  navigate('/settings');
                  setIsUserMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-xl hover:bg-accent active:scale-[0.97] transition-all duration-200"
              >
                <Settings className="w-4 h-4 text-muted-foreground transition-transform group-hover:scale-110" />
                Settings
              </button>
              <div className="h-px bg-border/60 my-1 mx-2" />
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-red-600 hover:text-red-700 rounded-xl hover:bg-destructive/10 active:scale-[0.97] transition-all duration-200"
              >
                <LogOut className="w-4 h-4 text-red-500 transition-transform group-hover:scale-110" />
                Sign Out
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User Card Button */}
        <button
          onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          className={cn(
            "w-full flex items-center gap-3 p-2 rounded-2xl bg-card/50 backdrop-blur-md transition-all duration-200 ease-out hover:bg-accent border border-transparent hover:border-border/50 hover:shadow-md hover:-translate-y-[1px] active:scale-[0.97]",
            collapsed && "justify-center"
          )}
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-sm border border-indigo-200/50 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                <p className="text-xs font-medium text-muted-foreground truncate">Free Plan</p>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", isUserMenuOpen ? "rotate-180" : "")} />
            </>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;