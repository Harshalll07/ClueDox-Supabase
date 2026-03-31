import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Copy, Check, Link2, Clock, Eye, Loader2, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSharing, ResourceRole } from "@/hooks/useSharing";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trash2, UserPlus, Shield, User as UserIcon, Crown } from "lucide-react";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resourceId: string;
  resourceName: string;
  resourceType: "file" | "folder";
}

const EXPIRY_OPTIONS = [
  { value: "5", label: "5 minutes" },
  { value: "10", label: "10 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "1440", label: "1 day" },
  { value: "none", label: "No expiry" },
];

const ShareDialog = ({ open, onOpenChange, resourceId, resourceName, resourceType }: ShareDialogProps) => {
  const [expiry, setExpiry] = useState("60");
  const [viewOnce, setViewOnce] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Collaboration state
  const { collaborators, createShare, removeShare } = useSharing(resourceId, resourceType);
  const [searchEmail, setSearchEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<ResourceRole>("viewer");
  const [linkRole, setLinkRole] = useState<ResourceRole>("viewer");
  const [isSearching, setIsSearching] = useState(false);

  const generateLink = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { toast.error("Please log in"); return; }

      const expiresAt = expiry !== "none"
        ? new Date(Date.now() + parseInt(expiry) * 60 * 1000).toISOString()
        : null;

      const { data, error } = await supabase
        .from("shared_links")
        .insert({
          file_id: resourceType === "file" ? resourceId : null,
          folder_id: resourceType === "folder" ? resourceId : null,
          user_id: session.user.id,
          expires_at: expiresAt,
          view_once: viewOnce,
          role: linkRole,
        } as any)
        .select("token")
        .single();

      if (error) throw error;

      // Use published domain if available, otherwise current origin
      const origin = window.location.origin;
      const link = `${origin}/shared/${data.token}`;
      setShareLink(link);
      toast.success("Share link created!");
    } catch (e) {
      toast.error("Failed to create share link");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (!shareLink) return;
    await navigator.clipboard.writeText(shareLink);
    setCopied(true);
    toast.success("Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setShareLink(null);
      setCopied(false);
      setExpiry("60");
      setViewOnce(false);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Share {resourceType === "file" ? "File" : "Folder"}
          </DialogTitle>
        </DialogHeader>

        <div className="text-sm font-medium px-1 truncate text-muted-foreground mb-2">
          {resourceName}
        </div>

        <Tabs defaultValue="people" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-xl mb-4">
            <TabsTrigger value="people" className="rounded-lg">People</TabsTrigger>
            <TabsTrigger value="links" className="rounded-lg">Links</TabsTrigger>
          </TabsList>

          <TabsContent value="people" className="space-y-4 pt-0">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  placeholder="Enter email or name..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="w-full bg-secondary/50 border border-border rounded-xl pl-4 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <Select value={selectedRole} onValueChange={(v: any) => setSelectedRole(v)}>
                <SelectTrigger className="w-28 rounded-xl shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                size="sm" 
                className="rounded-xl px-4"
                onClick={async () => {
                  if (!searchEmail) return;
                  setIsSearching(true);
                  // Basic simulation of user lookup - in real app, query public.profiles
                  const { data: profile, error } = await supabase
                    .from("profiles")
                    .select("user_id, full_name")
                    .or(`full_name.ilike.%${searchEmail}%,phone_number.ilike.%${searchEmail}%`)
                    .limit(1)
                    .maybeSingle();
                  
                  if (profile) {
                    await createShare.mutateAsync({ targetUserId: profile.user_id, role: selectedRole });
                    setSearchEmail("");
                  } else {
                    toast.error("User not found or their profile name does not match.");
                  }
                  setIsSearching(false);
                }}
                disabled={isSearching || createShare.isPending}
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              </Button>
            </div>

            <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Current Access</p>
              {collaborators.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4 italic">No collaborators yet</p>
              ) : (
                collaborators.map((collab) => (
                  <div key={collab.id} className="flex items-center gap-3 p-2 rounded-xl bg-secondary/30 border border-border/30">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                        {collab.profiles?.full_name?.split(" ").map(n => n[0]).join("") || "??"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold truncate">{collab.profiles?.full_name}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{collab.role}</p>
                    </div>
                    <button 
                      onClick={() => removeShare.mutate(collab.id)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="links" className="space-y-4 pt-0">
            {!shareLink ? (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium px-1">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    Link expires after
                  </Label>
                  <Select value={expiry} onValueChange={setExpiry}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPIRY_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm font-medium px-1">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    Whom this link gives
                  </Label>
                  <Select value={linkRole} onValueChange={(v: any) => setLinkRole(v)}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="viewer">Viewer (Read-only)</SelectItem>
                      <SelectItem value="editor">Editor (Can edit)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/50 border border-border/50">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <Label className="text-sm font-medium">View once</Label>
                      <p className="text-xs text-muted-foreground">Link invalid after first view</p>
                    </div>
                  </div>
                  <Switch checked={viewOnce} onCheckedChange={setViewOnce} />
                </div>

                <Button onClick={generateLink} disabled={loading} className="w-full rounded-xl gap-2 font-semibold">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  Generate {linkRole === "editor" ? "Edit" : "View"} Link
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary/50 border border-border/50">
                  <input
                    readOnly
                    value={shareLink}
                    className="flex-1 bg-transparent text-sm text-foreground outline-none truncate"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyLink}
                    className={cn("rounded-lg shrink-0 gap-1.5 h-8", copied && "text-green-500 border-green-500/50")}
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShareLink(null)} className="w-full text-xs text-muted-foreground">
                  Create another link
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default ShareDialog;
