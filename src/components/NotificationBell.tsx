import { useState, useMemo } from "react";
import {
  Bell, CheckCheck, FileText, UserPlus,
  MessageCircle, AlertCircle, Trash2, Calendar,
  Sparkles, ShieldAlert, CreditCard, Users
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNotifications, useUnreadCount, useMarkRead, useMarkAllRead, type AppNotification } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { format, isToday, isYesterday, parseISO } from "date-fns";

const typeStyles: Record<string, { icon: any; color: string; bg: string }> = {
  file_shared: {
    icon: FileText,
    color: "text-blue-600",
    bg: "bg-blue-50"
  },
  community_invite: {
    icon: UserPlus,
    color: "text-purple-600",
    bg: "bg-purple-50"
  },
  community_join: {
    icon: Users,
    color: "text-indigo-600",
    bg: "bg-indigo-50"
  },
  community_file: {
    icon: FileText,
    color: "text-violet-600",
    bg: "bg-violet-50"
  },
  subscription_warning: {
    icon: AlertCircle,
    color: "text-amber-600",
    bg: "bg-amber-50"
  },
  subscription_expired: {
    icon: ShieldAlert,
    color: "text-red-600",
    bg: "bg-red-50"
  },
  reminder_alert: {
    icon: Calendar,
    color: "text-emerald-600",
    bg: "bg-emerald-50"
  },
  file_uploaded: {
    icon: CheckCheck,
    color: "text-green-600",
    bg: "bg-green-50"
  },
  default: {
    icon: Bell,
    color: "text-gray-600",
    bg: "bg-gray-50"
  }
};

export function NotificationBell() {
  const { data: notifications, isLoading } = useNotifications();
  const unread = useUnreadCount();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // GROUP NOTIFICATIONS BY TIME
  const grouped = useMemo(() => {
    if (!notifications) return {};

    return notifications.reduce((acc: Record<string, AppNotification[]>, n) => {
      const date = parseISO(n.created_at);
      let group = "Older";
      if (isToday(date)) group = "Today";
      else if (isYesterday(date)) group = "Yesterday";
      else group = format(date, "MMMM d");

      if (!acc[group]) acc[group] = [];
      acc[group].push(n);
      return acc;
    }, {});
  }, [notifications]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative p-2 rounded-xl transition-all duration-300",
            unread > 0 ? "text-foreground bg-card shadow-sm border border-border" : "text-muted-foreground hover:bg-accent"
          )}
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <AnimatePresence>
            {unread > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-background shadow-sm"
              >
                {unread > 9 ? "9+" : unread}
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-[380px] p-0 bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-3xl overflow-hidden" align="end">
        {/* HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-card/50">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-foreground tracking-tight">Inbox</h4>
            {unread > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-wider">
                {unread} New
              </span>
            )}
          </div>
          {unread > 0 && (
            <button
              onClick={() => markAllRead.mutate()}
              className="text-xs font-bold text-primary hover:text-primary/80 flex items-center gap-1.5 transition-colors group"
            >
              <CheckCheck className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              Mark all read
            </button>
          )}
        </div>

        {/* NOTIFICATION LIST (Uses results from app_notifications ONLY) */}
        <div className="max-h-[480px] overflow-y-auto py-2">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-4 animate-pulse">
                  <div className="w-10 h-10 bg-muted rounded-xl" />
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-2.5 bg-muted rounded w-1/3" />
                    <div className="h-3 bg-muted rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : Object.keys(grouped).length > 0 ? (
            Object.entries(grouped).map(([group, filteredNotifications]) => (
              <div key={group} className="mb-4">
                <p className="px-5 py-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{group}</p>
                <div className="space-y-0.5">
                  {filteredNotifications.map((n) => {
                    const style = typeStyles[n.type] || typeStyles.default;
                    const Icon = style.icon;
                    return (
                      <motion.button
                        key={n.id}
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        onClick={() => {
                          if (!n.is_read) markRead.mutate(n.id);
                          if (n.link) navigate(n.link);
                          setOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-start gap-4 px-5 py-4 text-left transition-all relative group",
                          !n.is_read
                            ? "bg-primary/5 hover:bg-primary/10"
                            : "hover:bg-accent/40"
                        )}
                      >
                        {/* UNREAD INDICATOR */}
                        {!n.is_read && (
                          <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary shadow-sm" />
                        )}

                        {/* ICON */}
                        <div className={cn(
                          "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                          style.bg, style.color
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>

                        {/* CONTENT */}
                        <div className="flex-1 min-w-0 pr-2">
                          <p className={cn(
                            "text-sm font-semibold leading-tight",
                            !n.is_read ? "text-foreground" : "text-muted-foreground"
                          )}>
                            {n.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                            {n.description}
                          </p>
                          <p className="text-[10px] font-bold text-muted-foreground mt-2 uppercase tracking-tight">
                            {format(parseISO(n.created_at), "h:mm a")}
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="py-24 text-center px-8">
              <div className="w-16 h-16 bg-muted rounded-[28px] flex items-center justify-center mx-auto mb-4">
                <Bell className="w-7 h-7 text-muted-foreground mx-auto" />
              </div>
              <p className="text-foreground font-bold">Inbox is empty</p>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                When you get community invites or shared files, they'll pop up here.
              </p>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
