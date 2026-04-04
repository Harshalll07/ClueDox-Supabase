import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AppLayout from "./AppLayout";
import { CommunityTypes } from "@/components/community/CommunityTypes";
import { CommunityList } from "@/components/community/CommunityList";
import { CommunityDetails } from "@/components/community/CommunityDetails";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

const CommunityPage = () => {
  const [view, setView] = useState<"types" | "list" | "details">("types");
  const [communityType, setCommunityType] = useState<"my" | "joined">("my");
  const [selectedCommunity, setSelectedCommunity] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"files" | "members">("files");

  const [communities, setCommunities] = useState<any[]>([]);
  const [isLoadingCommunities, setIsLoadingCommunities] = useState(true);

  const [files, setFiles] = useState<any[]>([]);
  const [isFilesLoading, setIsFilesLoading] = useState(false);

  const [members, setMembers] = useState<any[]>([]);
  const [isMembersLoading, setIsMembersLoading] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const fetchCommunities = useCallback(async (silent = false) => {
    if (!silent) setIsLoadingCommunities(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: myData } = await supabase
        .from("teams")
        .select("*")
        .eq("owner_id", user.id);

      const myComms = (myData || []).map(t => ({ ...t, type: "my" }));

      const { data: joinedData } = await supabase
        .from("team_members")
        .select("*, teams(*)")
        .eq("user_id", user.id);

      const joinedComms = (joinedData || [])
        .filter(m => m.teams && m.teams.owner_id !== user.id)
        .map(m => ({ ...(m.teams as any), type: "joined" }));

      setCommunities([...myComms, ...joinedComms]);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setIsLoadingCommunities(false);
    }
  }, []);

  const fetchDetails = useCallback(async (silent = false) => {
    if (!selectedCommunity) return;

    if (!silent && activeTab === "files") setIsFilesLoading(true);
    if (!silent && activeTab === "members") setIsMembersLoading(true);

    try {
      if (activeTab === "files" || silent) {
        // 1. Fetch files owned by the team
        const { data: teamFiles } = await supabase
          .from("files")
          .select("*")
          .eq("team_id", selectedCommunity.id);

        // 2. Fetch files shared with this team via shared_resources
        const { data: sharedData } = await (supabase as any)
          .from("shared_resources")
          .select("*, files(*)")
          .eq("team_id", selectedCommunity.id)
          .eq("resource_type", "file");

        const ownedFiles = (teamFiles || []).map(f => ({
          ...f,
          name: f.file_name || "Unnamed File",
          shared: false
        }));

        const sharedFiles = (sharedData || [])
          .filter((s: any) => s.files)
          .map((s: any) => ({
            ...s.files,
            name: s.files.file_name || "Unnamed (Shared)",
            permission: s.permission,
            shared: true
          }));

        setFiles([...ownedFiles, ...sharedFiles]);
      }

      if (activeTab === "members" || silent) {
        const { data: membersData } = await supabase
          .from("team_members")
          .select(`
            *,
            profiles:user_id ( full_name )
          `)
          .eq("team_id", selectedCommunity.id);

        const mappedMembers = (membersData || []).map((m: any) => ({
          ...m,
          name: m.profiles?.full_name || `User (${m.user_id?.substring(0, 5) || "N/A"})`
        }));
        setMembers(mappedMembers);
      }
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) {
        setIsFilesLoading(false);
        setIsMembersLoading(false);
      }
    }
  }, [selectedCommunity, activeTab]);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities, view]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails, activeTab]);

  useEffect(() => {
    const channel = supabase
      .channel("teams-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "teams" },
        () => fetchCommunities(true)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "team_members" },
        () => {
          fetchCommunities(true);
          if (selectedCommunity) fetchDetails(true);
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "files" },
        () => {
          if (selectedCommunity) fetchDetails(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCommunities, fetchDetails, selectedCommunity]);

  const handleCreateCommunity = async () => {
    const name = window.prompt("Enter new community name:");
    if (!name || name.trim() === "") return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const tempCommunity = {
      id: "temp-" + Date.now(),
      name: name,
      owner_id: user.id,
      type: "my"
    };

    setCommunities((prev) => [tempCommunity, ...prev]);

    try {
      const { data, error } = await supabase
        .from("teams")
        .insert({ name, owner_id: user.id })
        .select()
        .single();

      if (error) throw error;

      await supabase.from("team_members").insert({
        team_id: data.id,
        user_id: user.id,
        role: "owner",
      });

      setCommunities((prev) =>
        prev.map(c => c.id === tempCommunity.id ? { ...data, type: "my" } : c)
      );

      toast.success("Community created successfully!");
    } catch (error: any) {
      setCommunities((prev) => prev.filter(c => c.id !== tempCommunity.id));
      toast.error(error.message || "Failed to create community");
    }
  };

  const handleDeleteCommunity = async () => {
    if (!deleteTarget) return;

    const id = deleteTarget.id;
    const prev = communities;

    // 1. Optimistic remove
    setCommunities(prev.filter(c => c.id !== id));
    setDeleteTarget(null);

    // Escape out of specific views gracefully eliminating errors referencing null states
    if (selectedCommunity?.id === id) {
      setView("list");
      setSelectedCommunity(null);
    }

    // 2. Cascade DB Delete
    try {
      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Community deleted completely!");
    } catch (error: any) {
      // rollback optimism
      setCommunities(prev);
      toast.error(error.message || "Failed to delete community. Validate privileges.");
    }
  };

  const navigateToList = (type: "my" | "joined") => {
    setCommunityType(type);
    setView("list");
  };

  const navigateToDetails = (community: any) => {
    setSelectedCommunity(community);
    setActiveTab("files");
    setView("details");
  };

  const goBackFromList = () => {
    setView("types");
  };

  const goBackFromDetails = () => {
    setView("list");
    setSelectedCommunity(null);
  };

  return (
    <AppLayout>
      <div className="bg-[#F7F7F5] dark:bg-[#0B0B0C] text-gray-900 dark:text-gray-100 min-h-screen transition-colors duration-300">
        <div className="max-w-6xl mx-auto px-6 py-6 space-y-8 relative">
          <AnimatePresence mode="wait">
            {view === "types" && (
              <CommunityTypes
                key="types"
                communities={communities}
                isLoading={isLoadingCommunities}
                onSelect={navigateToList}
                onAddCommunity={handleCreateCommunity}
              />
            )}

            {view === "list" && (
              <CommunityList
                key="list"
                type={communityType}
                communities={communities}
                isLoading={isLoadingCommunities}
                onSelect={navigateToDetails}
                onDelete={(c) => setDeleteTarget(c)}
                onBack={goBackFromList}
              />
            )}

            {view === "details" && selectedCommunity && (
              <CommunityDetails
                key="details"
                community={selectedCommunity}
                files={files}
                members={members}
                isFilesLoading={isFilesLoading}
                isMembersLoading={isMembersLoading}
                onBack={goBackFromDetails}
                onDelete={() => setDeleteTarget(selectedCommunity)}
                activeTab={activeTab}
                setActiveTab={setActiveTab as any}
              />
            )}
          </AnimatePresence>

          {/* Delete Confirmation Modal Overlay */}
          <AnimatePresence>
            {deleteTarget && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-[100] px-4"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="bg-white dark:bg-[#111113] rounded-3xl p-6 sm:p-8 w-full max-w-sm shadow-xl border border-gray-100 dark:border-gray-800"
                >
                  <div className="w-12 h-12 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl flex items-center justify-center mb-5 border border-red-100 dark:border-red-900/30">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Delete Community</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
                    Are you sure you want to delete <span className="font-semibold text-gray-900 dark:text-gray-100">"{deleteTarget.name}"</span>? This action cannot be undone and will permanently remove all files inside.
                  </p>

                  <div className="flex flex-col sm:flex-row justify-end gap-3">
                    <button
                      onClick={() => setDeleteTarget(null)}
                      className="px-5 py-2.5 rounded-xl font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#1A1A1C] transition-colors w-full sm:w-auto border border-gray-200 dark:border-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteCommunity}
                      className="px-5 py-2.5 rounded-xl font-medium bg-red-600 hover:bg-red-700 text-white transition-colors shadow-sm active:scale-95 w-full sm:w-auto"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </AppLayout>
  );
};

export default CommunityPage;
