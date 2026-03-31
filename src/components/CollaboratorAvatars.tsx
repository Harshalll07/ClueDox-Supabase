import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSharing, ResourceShare } from "@/hooks/useSharing";
import { Crown, Shield, User, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollaboratorAvatarsProps {
  resourceId?: string;
  resourceType?: "file" | "folder";
  ownerId?: string;
  size?: "xs" | "sm" | "md" | "lg";
}

export const CollaboratorAvatars = ({ 
  resourceId, 
  resourceType = "folder",
  ownerId,
  size = "sm"
}: CollaboratorAvatarsProps) => {
  const { collaborators, isCollaboratorsLoading } = useSharing(resourceId, resourceType);

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase();
  };

  const sizeClasses = {
    xs: "h-6 w-6",
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12"
  };

  const innerSizeClasses = {
    xs: "text-[8px]",
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm"
  };

  const roleIconSizes = {
    xs: "w-2.5 h-2.5",
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4"
  };

  const roleIcons = {
    owner: <Crown className={cn(roleIconSizes[size], "text-warning")} />,
    editor: <Shield className={cn(roleIconSizes[size], "text-primary")} />,
    viewer: <User className={cn(roleIconSizes[size], "text-muted-foreground")} />,
  };

  if (isCollaboratorsLoading) {
    return (
      <div className="flex -space-x-2 overflow-hidden">
        {[1, 2, 3].map(i => (
          <div key={i} className={cn("inline-block rounded-full ring-2 ring-background bg-secondary animate-pulse", sizeClasses[size])} />
        ))}
      </div>
    );
  }

  const displayCollaborators = [...collaborators];

  if (displayCollaborators.length === 0 && !ownerId) return null;

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2 overflow-hidden">
        <TooltipProvider>
          {displayCollaborators.slice(0, 5).map((share) => (
            <Tooltip key={share.id}>
              <TooltipTrigger asChild>
                <div className={cn("relative inline-block rounded-full ring-2 ring-background cursor-pointer hover:translate-y-[-2px] transition-transform", sizeClasses[size])}>
                  <Avatar className="h-full w-full">
                    <AvatarFallback className={cn("bg-primary/10 text-primary font-bold", innerSizeClasses[size])}>
                      {getInitials(share.profiles?.full_name || "Unknown User")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 border border-border shadow-sm">
                    {roleIcons[share.role as keyof typeof roleIcons] || roleIcons.viewer}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <p className="font-bold">{share.profiles?.full_name}</p>
                  <p className="text-[10px] opacity-70 capitalize">{share.role}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>

        {displayCollaborators.length > 5 && (
          <Popover>
            <PopoverTrigger asChild>
              <button className={cn("flex items-center justify-center rounded-full border-2 border-background bg-secondary font-medium hover:bg-secondary/80 transition-colors", sizeClasses[size], innerSizeClasses[size])}>
                +{displayCollaborators.length - 5}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">Collaborators</p>
                {displayCollaborators.map((share) => (
                  <div key={share.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[8px]">{getInitials(share.profiles?.full_name || "??")}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{share.profiles?.full_name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{share.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
};
