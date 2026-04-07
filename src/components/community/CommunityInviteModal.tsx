import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Mail, Loader2 } from "lucide-react";
import { userService } from "@/services/userService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CommunityInviteModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    folderId: string;
    folderName: string;
}

export const CommunityInviteModal = ({
    open,
    onOpenChange,
    folderId,
    folderName
}: CommunityInviteModalProps) => {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"viewer" | "editor" | "admin">("viewer");
    const [isLoading, setIsLoading] = useState(false);

    const handleInvite = async () => {
        if (!email.trim()) {
            toast.error("Please enter an email address");
            return;
        }

        setIsLoading(true);
        try {
            // 1. Find user ID by email
            const userId = await userService.getUserIdByEmail(email);
            if (!userId) {
                toast.error("User not found. Ensure they have signed up for ClueDox.");
                return;
            }

            // 2. Add to permissions table
            const { error: permError } = await (supabase as any).from('permissions').insert({
                folder_id: folderId,
                user_id: userId,
                role: role
            });

            if (permError) {
                if (permError.code === '23505') {
                    toast.error("User already has access to this folder.");
                } else {
                    throw permError;
                }
                return;
            }

            toast.success(`Succesfully invited to ${folderName}`);
            setEmail("");
            onOpenChange(false);
        } catch (error: any) {
            console.error("Invitation failed:", error);
            toast.error(error.message || "Failed to send invitation");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 sm:p-8">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-3 text-2xl font-bold text-gray-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                        <UserPlus className="w-6 h-6 text-indigo-600" />
                        Invite to Workspace
                    </DialogTitle>
                    <p className="text-sm text-gray-500 mt-2">
                        Grant access to <span className="font-semibold text-gray-900">"{folderName}"</span> via email.
                    </p>
                </DialogHeader>

                <div className="space-y-6 my-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">User Email</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="colleague@company.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-11 h-12 rounded-2xl bg-gray-50 border-gray-100 focus:ring-indigo-500/20"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Permission Role</label>
                        <Select value={role} onValueChange={(v: any) => setRole(v)}>
                            <SelectTrigger className="h-12 rounded-2xl bg-gray-50 border-gray-100">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-gray-100">
                                <SelectItem value="viewer">
                                    <div className="flex flex-col text-left py-1">
                                        <span className="font-semibold text-sm">Viewer</span>
                                        <span className="text-[10px] text-gray-500">Read-only access</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="editor">
                                    <div className="flex flex-col text-left py-1">
                                        <span className="font-semibold text-sm">Editor</span>
                                        <span className="text-[10px] text-gray-500">Can upload and manage files</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="admin">
                                    <div className="flex flex-col text-left py-1">
                                        <span className="font-semibold text-sm">Admin</span>
                                        <span className="text-[10px] text-gray-500">Full access and invite others</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter className="mt-4">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="rounded-2xl h-12 border-gray-100 text-gray-500 font-semibold"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleInvite}
                        disabled={isLoading || !email}
                        className="group relative rounded-2xl h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-all active:scale-[0.98]"
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <div className="flex items-center gap-2">
                                Invite <UserPlus className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
