import React from "react";
import { 
  User, Shield, Crown, Trash2, UserPlus, 
  MoreVertical, ShieldCheck, UserCog 
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuLabel,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";

interface MemberContextMenuProps {
  member: {
    user_id: string;
    role: string;
    name?: string;
  };
  isOwner: boolean;
  isSelf: boolean;
  canManage: boolean;
  actions: {
    onChangeRole?: (role: string) => void;
    onRemove?: () => void;
    onInvite?: () => void;
  };
  children: React.ReactNode;
}

export const MemberContextMenu = ({ 
  member, 
  isOwner, 
  isSelf,
  canManage,
  actions, 
  children 
}: MemberContextMenuProps) => {
  const roles = [
    { id: 'admin', label: 'Admin', icon: ShieldCheck, desc: 'Can manage resources' },
    { id: 'member', label: 'Member', icon: User, desc: 'Can add & view files' },
    { id: 'viewer', label: 'Viewer', icon: User, desc: 'Can only view files' },
  ];

  return (
    <ContextMenu>
      <ContextMenuContent className="w-64 rounded-2xl border border-border/50 bg-card/95 backdrop-blur-md shadow-2xl p-1.5">
        <ContextMenuLabel className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60 px-2 py-2">
          <UserCog className="w-3 h-3" />
          Manage Member
        </ContextMenuLabel>
        <ContextMenuSeparator className="bg-border/40 my-1" />

        {canManage && member.role !== 'owner' ? (
          <>
            {isOwner && (
              <ContextMenuSub>
                <ContextMenuSubTrigger className="gap-3 rounded-lg cursor-pointer py-2 px-3">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Change Role</span>
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="w-56 rounded-xl border border-border/50 bg-card/95 backdrop-blur-md p-1 shadow-xl">
                  {roles.map((role) => (
                    <ContextMenuItem 
                      key={role.id} 
                      onClick={() => actions.onChangeRole?.(role.id)}
                      className={cn(
                        "flex flex-col items-start gap-0.5 rounded-lg py-2 px-3 cursor-pointer",
                        member.role === role.id ? "bg-primary/10 text-primary" : "hover:bg-secondary/80"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <role.icon className="w-3.5 h-3.5" />
                        <span className="text-sm font-bold">{role.label}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground leading-tight">{role.desc}</span>
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
            )}

            <ContextMenuItem 
              onClick={actions.onRemove} 
              className="gap-3 rounded-lg cursor-pointer focus:bg-destructive/10 focus:text-destructive transition-colors py-2 px-3"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm font-medium">{isSelf ? "Leave Community" : "Remove from Community"}</span>
            </ContextMenuItem>
          </>
        ) : (
           <ContextMenuItem disabled className="gap-3 rounded-lg py-2 px-3 opacity-50">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">No permissions to manage</span>
          </ContextMenuItem>
        )}

        <ContextMenuSeparator className="bg-border/40 my-1" />

        <ContextMenuItem 
          onClick={actions.onInvite} 
          className="gap-3 rounded-lg cursor-pointer py-2 px-3 focus:bg-primary focus:text-white mb-1"
        >
          <UserPlus className="w-4 h-4" />
          <span className="text-sm font-semibold">Invite More Users</span>
        </ContextMenuItem>
      </ContextMenuContent>
      <ContextMenuTrigger className="contents">
        {children}
      </ContextMenuTrigger>
    </ContextMenu>
  );
};
