import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Globe, Plus, FolderPlus, UserPlus, Crown, Shield, User, 
  ChevronRight, Upload, FileText, Loader2, MessageCircle, 
  Share2, Eye, Download, Sparkles
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { 
  useTeams, useTeamMembers, useTeamFolders, useCreateTeam, 
  useCreateTeamFolder, useInviteMember, useTeamFolderFiles 
} from "@/hooks/useTeams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CollaboratorAvatars } from "@/components/CollaboratorAvatars";
import ShareDialog from "@/components/ShareDialog";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FileContextMenu } from "@/components/FileContextMenu";
import { viewFile, downloadFile } from "@/lib/fileUrl";

const CommunityFileItem = ({ file, folderId, teamId, isEditor }: { file: any; folderId: string; teamId: string; isEditor: boolean }) => {
  const navigate = useNavigate();
  const isReady = file.file_status === "ready";
  const isAnalysing = file.file_status === "analysing";

  return (
    <FileContextMenu
      resource={{ id: file.id, name: file.file_name, type: "file" }}
      isEditor={isEditor}
      actions={{
        onOpen: () => viewFile(file.file_url),
        onDownload: () => downloadFile(file.file_url, file.file_name),
        onChat: () => navigate(`/chat?fileId=${file.id}`),
        onAnalyze: async () => {
          toast.info("Starting AI analysis...");
          await supabase.functions.invoke("analyze-file", {
            body: { fileId: file.id, fileName: file.file_name, fileType: file.file_type }
          });
          toast.success("Analysis started!");
        },
      }}
    >
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-primary/5 group transition-all cursor-pointer">
        <div className="relative">
          <FileText className={cn("w-4 h-4", isReady ? "text-emerald-500" : "text-muted-foreground/50")} />
          {isAnalysing && (
            <div className="absolute -top-1 -right-1">
              <Loader2 className="w-2.5 h-2.5 animate-spin text-amber-500" />
            </div>
          )}
        </div>
        <span className="text-sm font-medium flex-1 truncate">{file.file_name}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={(e) => { e.stopPropagation(); navigate(`/chat?fileId=${file.id}`); }}>
            <MessageCircle className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={(e) => { e.stopPropagation(); viewFile(file.file_url); }}>
            <Eye className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </FileContextMenu>
  );
};

const CommunityFolderItem = ({ 
  folder, teamId, isEditor, isExpanded, onToggle, onUpload 
}: { 
  folder: any; teamId: string; isEditor: boolean; isExpanded: boolean; onToggle: () => void; onUpload: (fid: string) => void 
}) => {
  const { data: files, isLoading } = useTeamFolderFiles(isExpanded ? folder.id : null);
  const navigate = useNavigate();

  return (
    <FileContextMenu
      resource={{ id: folder.id, name: folder.name, type: "folder" }}
      isEditor={isEditor}
      actions={{
        onOpen: onToggle,
        onChat: () => navigate(`/chat?userFolderId=${folder.id}`),
      }}
    >
      <div className="space-y-1">
        <div 
          onClick={onToggle}
          className={cn(
            "flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer group",
            isExpanded ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-card/50 border-border/40 hover:border-primary/30"
          )}
        >
          <div className={cn("p-2 rounded-lg", isExpanded ? "bg-primary/20 text-primary" : "bg-secondary/50 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary")}>
            <FolderPlus className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">{folder.name}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Shared Directory</p>
          </div>
          <div className="flex items-center gap-2">
             <Button
              size="sm"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); onUpload(folder.id); }}
              className="h-8 gap-1.5 text-[10px] font-bold uppercase rounded-lg hover:bg-primary/10 hover:text-primary"
            >
              <Upload className="w-3.5 h-3.5" />
            </Button>
            <ChevronRight className={cn("w-4 h-4 text-muted-foreground transition-transform duration-300", isExpanded && "rotate-90")} />
          </div>
        </div>
        
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden ml-6 pl-4 border-l-2 border-primary/10 mt-1 space-y-1"
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-primary/40" /></div>
              ) : files && files.length > 0 ? (
                files.map((file: any) => (
                  <CommunityFileItem key={file.id} file={file} folderId={folder.id} teamId={teamId} isEditor={isEditor} />
                ))
              ) : (
                <p className="text-[10px] text-muted-foreground py-2 italic font-medium">No files in this folder yet.</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </FileContextMenu>
  );
};

const CommunityPage = () => {
  const { data: teams, isLoading } = useTeams();
  const createTeam = useCreateTeam();
  const createFolder = useCreateTeamFolder();
  const inviteMember = useInviteMember();
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [expandedFolder, setExpandedFolder] = useState<string | null>(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [shareFolder, setShareFolder] = useState<{ id: string; name: string } | null>(null);
  const [uploading, setUploading] = useState<string | null>(null); // folderId
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: members } = useTeamMembers(selectedTeam);
  const { data: folders } = useTeamFolders(selectedTeam);

  useEffect(() => {
    if (teams && teams.length > 0 && !selectedTeam) {
      setSelectedTeam(teams[0].id);
    }
  }, [teams]);

  const handleCreateCommunity = async () => {
    if (!newTeamName.trim()) return;
    try {
      await createTeam.mutateAsync(newTeamName.trim());
      setNewTeamName("");
      setShowCreate(false);
      toast.success("Community created!");
    } catch (e: any) {
      toast.error(e.message || "Failed to create community");
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !selectedTeam) return;
    try {
      await createFolder.mutateAsync({ teamId: selectedTeam, name: newFolderName.trim() });
      setNewFolderName("");
      toast.success("Folder created!");
    } catch (e: any) {
      toast.error(e.message || "Failed to create folder");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, folderId: string) => {
    const file = event.target.files?.[0];
    if (!file || !selectedTeam) return;

    setUploading(folderId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Unique file path
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      // 1. Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("files")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Create DB record
      const { data: fileRecord, error: dbError } = await supabase
        .from("files")
        .insert({
          file_name: file.name,
          file_url: filePath,
          file_type: file.type,
          file_size: file.size,
          user_id: user.id,
          file_status: "analysing",
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 3. Link to community folder
      const { error: linkError } = await supabase
        .from("team_folder_files" as any)
        .insert({
          folder_id: folderId,
          file_id: fileRecord.id,
          added_by: user.id
        });

      if (linkError) throw linkError;

      // 4. Trigger AI analysis
      supabase.functions.invoke("analyze-file", {
        body: { fileId: fileRecord.id, fileName: file.name, fileType: file.type }
      }).catch(err => console.error("AI trigger failed", err));

      toast.success(`"${file.name}" uploaded. AI is scanning it now...`);
      queryClient.invalidateQueries({ queryKey: ["team-folder-files", folderId] });
    } catch (error: any) {
      toast.error(error.message || "Failed to upload file");
    } finally {
      setUploading(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const activeCommunity = teams?.find((t) => t.id === selectedTeam);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-2xl bg-primary/10">
                  <Globe className="w-8 h-8 text-primary" />
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Community</h1>
              </div>
              <p className="text-muted-foreground text-sm sm:text-base max-w-lg">
                Collaborate with your network in shared environments. Manage resources and permissions seamlessly.
              </p>
            </div>
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button size="lg" className="rounded-2xl gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                  <Plus className="w-5 h-5" /> New Community
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl border-border/50 backdrop-blur-xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">Create a Community</DialogTitle>
                </DialogHeader>
                <div className="space-y-5 pt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Community Name</label>
                    <Input 
                      placeholder="e.g. Project Apollo, Research Group" 
                      value={newTeamName} 
                      onChange={(e) => setNewTeamName(e.target.value)} 
                      onKeyDown={(e) => e.key === "Enter" && handleCreateCommunity()}
                      className="rounded-xl bg-secondary/50 border-border/40 h-12"
                    />
                  </div>
                  <Button onClick={handleCreateCommunity} disabled={createTeam.isPending} className="w-full h-12 rounded-xl text-base">
                    {createTeam.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Community"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Communities list */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">Your Communities</h3>
              <span className="text-xs font-medium bg-secondary px-2 py-0.5 rounded-full">{teams?.length || 0}</span>
            </div>
            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-2xl bg-secondary/50 animate-pulse" />)}</div>
            ) : teams && teams.length > 0 ? (
              <div className="space-y-3">
                {teams.map((team) => (
                  <motion.button
                    key={team.id}
                    onClick={() => setSelectedTeam(team.id)}
                    className={cn(
                      "w-full flex items-center gap-4 p-5 rounded-2xl border transition-all duration-300 text-left group relative overflow-hidden",
                      selectedTeam === team.id 
                        ? "border-primary/50 bg-primary/5 shadow-md" 
                        : "border-border/40 bg-card/50 hover:border-primary/30 hover:bg-card hover:shadow-sm"
                    )}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-colors shadow-inner",
                      selectedTeam === team.id ? "bg-primary/20" : "bg-secondary/80 group-hover:bg-primary/10"
                    )}>
                      <Globe className={cn("w-6 h-6", selectedTeam === team.id ? "text-primary" : "text-muted-foreground")} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-bold truncate text-foreground/90">{team.name}</p>
                      <p className="text-xs text-muted-foreground font-medium">Created {new Date(team.created_at).toLocaleDateString()}</p>
                    </div>
                    <ChevronRight className={cn("w-5 h-5 transition-transform duration-300", selectedTeam === team.id ? "text-primary translate-x-1" : "text-muted-foreground/40")} />
                  </motion.button>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 rounded-3xl border border-dashed border-border/60 bg-secondary/20">
                <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-8 h-8 text-muted-foreground/60" />
                </div>
                <h4 className="text-lg font-semibold mb-1">No communities yet</h4>
                <p className="text-sm text-muted-foreground mb-6">Start collaborating by creating your first space.</p>
                <Button variant="outline" className="rounded-xl border-primary/20 hover:bg-primary/5" onClick={() => setShowCreate(true)}>
                  Create Community
                </Button>
              </div>
            )}
          </div>

          {/* Community detail */}
          <div className="lg:col-span-8">
            <AnimatePresence mode="wait">
              {activeCommunity ? (
                <motion.div 
                  key={activeCommunity.id}
                  initial={{ opacity: 0, scale: 0.98 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-8"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card/60 p-6 rounded-3xl border border-border/30 backdrop-blur-sm">
                    <div>
                      <h2 className="text-2xl font-bold mb-1">{activeCommunity.name}</h2>
                      <div className="flex items-center gap-3">
                        <CollaboratorAvatars resourceId={activeCommunity.id} resourceType="folder" size="sm" />
                        <span className="text-xs text-muted-foreground font-medium">• {members?.length || 0} members</span>
                      </div>
                    </div>
                    <Dialog open={showInvite} onOpenChange={setShowInvite}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="secondary" className="rounded-xl gap-2 h-10 px-4 font-semibold hover:bg-primary hover:text-primary-foreground transition-all">
                          <UserPlus className="w-4 h-4" /> Invite Network
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Invite to {activeCommunity.name}</DialogTitle>
                        </DialogHeader>
                        <div className="flex gap-2 mt-4">
                          <Input 
                            placeholder="Search by full name or phone..." 
                            value={inviteEmail} 
                            onChange={(e) => setInviteEmail(e.target.value)} 
                          />
                          <Button 
                            disabled={isInviting || !inviteEmail}
                            onClick={async () => {
                              setIsInviting(true);
                              try {
                                const { data: profile } = await supabase.from('profiles').select('user_id').or(`full_name.ilike.%${inviteEmail}%,phone_number.ilike.%${inviteEmail}%`).limit(1).maybeSingle();
                                if (profile) {
                                  await inviteMember.mutateAsync({ teamId: activeCommunity.id, userId: profile.user_id, role: 'member' });
                                  toast.success("Invited successfully");
                                  setShowInvite(false);
                                  setInviteEmail("");
                                } else {
                                  toast.error("User not found or their profile name does not match.");
                                }
                              } catch (e: any) {
                                toast.error(e.message || "Failed to invite user");
                              } finally {
                                setIsInviting(false);
                              }
                            }}
                          >
                            {isInviting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Invite"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    {/* Members List Side */}
                    <div className="xl:col-span-4 space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">Active Members</h3>
                      </div>
                      <div className="bg-card/40 rounded-2xl border border-border/20 overflow-hidden divide-y divide-border/10">
                        {members?.map((m) => {
                          const roleIcons: Record<string, any> = { owner: Crown, admin: Shield, member: User, viewer: User };
                          const roleColors: Record<string, string> = { owner: "text-warning", admin: "text-primary", member: "text-muted-foreground", viewer: "text-muted-foreground" };
                          const RoleIcon = roleIcons[m.role] || User;
                          return (
                            <div key={m.id} className="flex items-center gap-4 p-4 hover:bg-secondary/20 transition-colors">
                              <div className="w-10 h-10 rounded-full bg-secondary/80 flex items-center justify-center border-2 border-background shadow-sm">
                                <RoleIcon className={cn("w-4 h-4", roleColors[m.role])} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-bold truncate">User_{m.user_id.slice(0, 5)}</p>
                                <span className={cn("text-[10px] font-bold uppercase tracking-tight px-2 py-0.5 rounded-md", 
                                  m.role === 'owner' ? "bg-warning/10 text-warning" : "bg-primary/10 text-primary"
                                )}>
                                  {m.role}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Hierarchical Folders and Content */}
                    <div className="xl:col-span-8 space-y-4">
                      <div className="flex items-center justify-between px-1">
                        <h3 className="text-xs font-bold text-muted-foreground/60 uppercase tracking-widest">Shared Resources</h3>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs rounded-lg hover:bg-primary/10 hover:text-primary">
                              <FolderPlus className="w-3.5 h-3.5" /> New Folder
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="rounded-2xl">
                            <DialogHeader><DialogTitle>New Community Folder</DialogTitle></DialogHeader>
                            <div className="pt-4 space-y-4">
                              <Input 
                                placeholder="Folder Name" 
                                value={newFolderName} 
                                onChange={(e) => setNewFolderName(e.target.value)} 
                                onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
                                className="rounded-xl"
                              />
                              <Button onClick={handleCreateFolder} className="w-full rounded-xl">Create Folder</Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>

                      {folders && folders.length > 0 ? (
                        <div className="space-y-3">
                          {folders.map((f) => {
                            const currentUserId = (supabase.auth.getUser() as any)?.data?.user?.id;
                            const userMember = members?.find(m => m.user_id === currentUserId);
                            const isEditor = activeCommunity.owner_id === currentUserId || (userMember && ['owner', 'admin', 'member'].includes(userMember.role)) || false;

                            return (
                              <div key={f.id}>
                                <CommunityFolderItem 
                                  folder={f} 
                                  teamId={activeCommunity.id}
                                  isEditor={isEditor}
                                  isExpanded={expandedFolder === f.id}
                                  onToggle={() => setExpandedFolder(expandedFolder === f.id ? null : f.id)}
                                  onUpload={(fid) => {
                                    if (fileInputRef.current) {
                                      fileInputRef.current.setAttribute('data-folder-id', fid);
                                      fileInputRef.current.click();
                                    }
                                  }}
                                />
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-20 bg-secondary/10 rounded-3xl border border-dashed border-border/40">
                          <FolderPlus className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-sm text-muted-foreground font-medium">Create shared folders to start pooling resources</p>
                        </div>
                      )}
                    </div>
                  </div>


                </motion.div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[500px] rounded-3xl border border-dashed border-border/40 bg-secondary/5 text-center p-8">
                  <div className="w-20 h-20 rounded-3xl bg-secondary/50 flex items-center justify-center mb-6 shadow-inner">
                    <Globe className="w-10 h-10 text-muted-foreground/40" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Select a Community</h3>
                  <p className="text-sm text-muted-foreground max-w-sm">Choose a space from the left to view shared resources, manage members, and collaborate on documents.</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          const folderId = e.target.getAttribute('data-folder-id');
          if (folderId) handleFileUpload(e, folderId);
        }}
        className="hidden"
      />

      {shareFolder && (
        <ShareDialog
          open={!!shareFolder}
          onOpenChange={(open) => !open && setShareFolder(null)}
          resourceId={shareFolder.id}
          resourceName={shareFolder.name}
          resourceType="folder"
        />
      )}
    </AppLayout>
  );
};

export default CommunityPage;
