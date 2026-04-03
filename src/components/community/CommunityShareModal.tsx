import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Users, Shield, Trash2, Loader2, UserPlus, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTeams, useTeamMembers } from "@/hooks/useTeams";
import { useCommunitySharing } from "@/hooks/useCommunitySharing";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface CommunityShareModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    resourceId: string;
    resourceName: string;
    resourceType: "file" | "folder";
}

export const CommunityShareModal = ({
    open,
    onOpenChange,
    resourceId,
    resourceName,
    resourceType
}: CommunityShareModalProps) => {
    const { data: teams, isLoading: teamsLoading } = useTeams();
    const [selectedTeamId, setSelectedTeamId] = useState<string>("");
    const [selectedMemberId, setSelectedMemberId] = useState<string>("all"); // "all" for entire community
    const [permission, setPermission] = useState<"view" | "edit">("view");

    // Fetch members for the selected team
    const { data: teamMembers, isLoading: membersLoading } = useTeamMembers(selectedTeamId || null);
    const [memberProfiles, setMemberProfiles] = useState<any[]>([]);

    const { shares, isLoading: sharesLoading, createCommunityShare, removeCommunityShare } = useCommunitySharing(resourceId, resourceType);

    useEffect(() => {
        if (selectedTeamId && teamMembers) {
            const fetchProfiles = async () => {
                const userIds = teamMembers.map(m => m.user_id);
                const { data: profiles, error } = await supabase
                    .from("profiles")
                    .select("user_id, full_name")
                    .in("user_id", userIds);

                if (profiles) setMemberProfiles(profiles);
            };
            fetchProfiles();
        } else {
            setMemberProfiles([]);
        }
    }, [selectedTeamId, teamMembers]);

    const handleShare = async () => {
        if (!selectedTeamId) {
            toast.error("Please select a community");
            return;
        }

        createCommunityShare.mutate({
            teamId: selectedTeamId,
            sharedWithUserId: selectedMemberId === "all" ? null : selectedMemberId,
            permission
        }, {
            onSuccess: () => {
                setSelectedMemberId("all");
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg bg-white rounded-3xl p-6 sm:p-8">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                        <Share2 className="w-6 h-6 text-indigo-600" />
                        Community Sharing
                    </DialogTitle>
                    <p className="text-sm text-gray-500 mt-2">
                        Share <span className="font-semibold text-gray-900">"{resourceName}"</span> with your communities and specific members.
                    </p>
                </DialogHeader>

                <div className="space-y-6 my-4">
                    {/* Share Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Community</label>
                            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                                <SelectTrigger className="rounded-2xl bg-gray-50 border-gray-100 h-11 focus:ring-indigo-500/20">
                                    <SelectValue placeholder="Select a community" />
                                </SelectTrigger>
                                <SelectContent>
                                    {teams?.map(team => (
                                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Share With</label>
                            <Select value={selectedMemberId} onValueChange={setSelectedMemberId} disabled={!selectedTeamId}>
                                <SelectTrigger className="rounded-2xl bg-gray-50 border-gray-100 h-11 focus:ring-indigo-500/20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Entire Community</SelectItem>
                                    {memberProfiles.map(profile => (
                                        <SelectItem key={profile.user_id} value={profile.user_id}>{profile.full_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex-1 space-y-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Permission</label>
                            <Select value={permission} onValueChange={(v: any) => setPermission(v)}>
                                <SelectTrigger className="rounded-2xl bg-gray-50 border-gray-100 h-11 focus:ring-indigo-500/20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="view">Viewer (Read-only)</SelectItem>
                                    <SelectItem value="edit">Editor (Can manage)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="pt-6">
                            <Button
                                onClick={handleShare}
                                disabled={!selectedTeamId || createCommunityShare.isPending}
                                className="rounded-2xl px-6 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all active:scale-[0.98] flex items-center gap-2"
                            >
                                {createCommunityShare.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                Share
                            </Button>
                        </div>
                    </div>

                    {/* Existing Shares List */}
                    <div className="space-y-3 pt-4">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1 flex items-center gap-2">
                            <Users className="w-3 h-3" />
                            Shared Access
                        </h3>

                        <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2 scrollbar-thin">
                            {sharesLoading ? (
                                <div className="space-y-2">
                                    <div className="h-10 bg-gray-50 rounded-xl animate-pulse" />
                                    <div className="h-10 bg-gray-50 rounded-xl animate-pulse" />
                                </div>
                            ) : shares.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-6 italic border border-dashed border-gray-100 rounded-3xl bg-gray-50/30">
                                    Not shared with any community yet.
                                </p>
                            ) : (
                                shares.map((share) => (
                                    <div key={share.id} className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-gray-100 hover:border-indigo-100 hover:shadow-sm transition-all group">
                                        <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-indigo-600 border border-gray-100 shrink-0">
                                            {share.shared_with_user_id ? <Users className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate flex items-center gap-1.5">
                                                {share.teams?.name}
                                                {share.shared_with_user_id && (
                                                    <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-lg border border-indigo-100">Direct</span>
                                                )}
                                            </p>
                                            <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                                {share.shared_with_user_id ? `${share.profiles?.full_name}` : "Entire community"} · {share.permission} access
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => removeCommunityShare.mutate(share.id)}
                                            className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                            title="Revoke access"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
