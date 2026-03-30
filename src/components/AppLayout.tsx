import { ReactNode, useState } from "react";
import { Menu } from "lucide-react";
import AppSidebar from "./AppSidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import BottomNavBar from "@/components/ui/bottom-nav-bar";
import { SupportChat } from "@/components/SupportChat";
import { NotificationBell } from "@/components/NotificationBell";

const AppLayout = ({ children }: { children: ReactNode }) => {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#0A1610] p-2 md:p-4 overflow-hidden">
      {/* The floating white app window */}
      <div className="flex-1 flex overflow-hidden bg-[#FCFCFB] rounded-2xl shadow-2xl border border-white/10 relative">

        {/* Mobile overlay */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 rounded-2xl"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar - hidden on mobile */}
        {!isMobile && (
          <div className="w-64 shrink-0 h-full border-r border-[#EFEFEF]">
            <AppSidebar onClose={() => setSidebarOpen(false)} />
          </div>
        )}

        {/* Mobile sidebar drawer */}
        {isMobile && (
          <div
            className={`absolute inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} border-r border-[#EFEFEF] bg-[#FCFCFB]`}
          >
            <AppSidebar onClose={() => setSidebarOpen(false)} />
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 h-full overflow-y-auto min-w-0 bg-[#FCFCFB] relative">
          {/* Mobile Header */}
          {isMobile && !sidebarOpen && (
            <div className="sticky top-0 z-20 flex items-center justify-between p-4 bg-[#FCFCFB]/80 backdrop-blur-md border-b border-[#EFEFEF]">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2.5 rounded-xl bg-white border border-[#EFEFEF] shadow-sm hover:bg-zinc-50 transition-colors active:scale-95"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5 text-zinc-700" />
              </button>
              <div className="text-xl font-serif font-bold text-zinc-800" style={{ fontFamily: "'Playfair Display', serif" }}>Cluedox</div>
              <NotificationBell />
            </div>
          )}

          {/* Content */}
          <div className="h-full pb-20 md:pb-0">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      {isMobile && <BottomNavBar />}

      <SupportChat />
    </div>
  );
};

export default AppLayout;
