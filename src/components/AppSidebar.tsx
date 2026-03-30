import { NavLink as RouterNavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Plus, X, ChevronDown, LayoutDashboard, Upload, FolderOpen,
  Search, Bell, LogOut, Moon, Sun, MessageCircle, FolderTree,
  ArrowLeftRight, Settings, Smartphone, BarChart3, Users, HardDrive
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
  { to: "/teams", icon: Users, label: "Teams" },
  { to: "/google-drive", icon: HardDrive, label: "Google Drive" },
  { to: "/whatsapp", icon: Smartphone, label: "WhatsApp" }
];

const AppSidebar = ({ onClose }: { onClose?: () => void }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate("/");
  };

  return (
    <aside className="h-full w-full flex flex-col bg-[#FCFCFB] text-[#333] font-sans">
      {/* Header / Logo */}
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          {/* We keep the elegant serif typography for Sortifi as well since it's the design aesthetic */}
          <h1 className="text-2xl font-bold text-[#111]" style={{ fontFamily: "'Playfair Display', serif" }}>Cluedox</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/upload')} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#EFEFEF] hover:bg-[#E5E5E5] transition-colors rounded-full text-xs font-semibold text-[#444]">
            <Plus className="w-3 h-3" /> New
          </button>
          {onClose && (
            <button onClick={onClose} className="p-1.5 lg:hidden hover:bg-[#EDECE9] rounded-md transition-colors text-[#666]">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-6 scrollbar-hide">

        {/* Workspace / Nav Items */}
        <div>
          <h3 className="px-3 text-[11px] font-semibold text-[#888] uppercase tracking-wider mb-2">Workspace</h3>
          <div className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <RouterNavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={cn(
                    "flex items-center justify-between px-3 py-[7px] rounded-lg text-[13px] font-medium transition-colors group",
                    isActive ? "bg-[#EFEFEF] text-[#111]" : "text-[#555] hover:bg-[#F3F3F3]"
                  )}
                >
                  <div className="flex items-center gap-3 truncate">
                    <item.icon className={cn("shrink-0", isActive ? "w-4 h-4 text-[#111]" : "w-4 h-4 text-[#6B7A6F]")} strokeWidth={isActive ? 2.5 : 2} />
                    <span className="truncate">{item.label}</span>
                  </div>
                </RouterNavLink>
              );
            })}
          </div>
        </div>

      </nav>

      {/* Footer / User Profile & Settings */}
      <div className="p-4 border-t border-[#EFEFEF]">
        <div className="flex items-center justify-between px-3 mb-4 text-[#888]">
          <button onClick={toggleTheme} className="hover:text-[#333] transition-colors flex items-center gap-2 text-xs font-medium" title="Toggle Theme">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={() => navigate('/settings')} className="hover:text-[#333] transition-colors" title="Settings">
            <Settings className="w-4 h-4" />
          </button>
          <button onClick={handleSignOut} className="hover:text-[#333] transition-colors" title="Sign Out">
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        <div className="w-full flex items-center justify-between p-2 rounded-lg bg-[#F5F5F4]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded bg-[#1B3B2B] flex items-center justify-center text-white font-bold text-xs">
              U
            </div>
            <div className="text-left">
              <p className="text-[13px] font-bold text-[#111] leading-none mb-1">User</p>
              <p className="text-[10px] text-[#888] font-medium leading-none">Cluedox Plan</p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-[#888]" />
        </div>
      </div>
    </aside>
  );
};

export default AppSidebar;
