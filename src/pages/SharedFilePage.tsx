import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, FileText, AlertCircle, Download, Eye, Folder, ExternalLink, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SharedFile {
  type: "file";
  fileName: string;
  fileType: string;
  fileSize?: number;
  signedUrl: string;
  role: "viewer" | "editor";
}

interface SharedFolder {
  type: "folder";
  folderName: string;
  folderId: string;
  files: any[];
  role: "viewer" | "editor";
}

const SharedFilePage = () => {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resource, setResource] = useState<SharedFile | SharedFolder | null>(null);

  useEffect(() => {
    if (!token) return;
    loadSharedResource();
  }, [token]);

  const loadSharedResource = async () => {
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-shared-file?token=${encodeURIComponent(token!)}`,
      );
      const data = await resp.json();

      if (!resp.ok) {
        setError(data.error || "This link is invalid or has expired.");
        return;
      }

      setResource(data);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (url: string, fileName: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">Accessing shared resource...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-sm mx-auto bg-card border border-border p-8 rounded-3xl shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Link Unavailable</h1>
          <p className="text-muted-foreground text-sm mb-6">{error}</p>
          <Button variant="outline" className="rounded-xl w-full" onClick={() => window.location.href = "/"}>
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // File View
  if (resource?.type === "file") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md mx-auto bg-card border border-border p-10 rounded-3xl shadow-2xl">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <FileText className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold mb-1 truncate px-2">{resource.fileName}</h1>
          <div className="flex items-center justify-center gap-2 mb-8">
            <p className="text-muted-foreground text-sm">Public Shared File</p>
            <span className="px-2 py-0.5 rounded-full bg-secondary text-[10px] uppercase font-bold tracking-wider">
              {resource.role}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => window.open(resource.signedUrl, "_blank")}
              className="rounded-2xl h-12 gap-2 text-md font-semibold shadow-lg shadow-primary/20"
            >
              <Eye className="w-5 h-5" /> View
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadFile(resource.signedUrl, resource.fileName)}
              className="rounded-2xl h-12 gap-2 text-md font-semibold hover:bg-secondary/50"
            >
              <Download className="w-5 h-5" /> Download
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Folder View
  if (resource?.type === "folder") {
    return (
      <div className="min-h-screen bg-background p-6 sm:p-12">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-6 rounded-3xl shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
                <Folder className="w-7 h-7 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-1">{resource.folderName}</h1>
                <div className="flex items-center gap-2">
                  <p className="text-muted-foreground text-sm">Public Shared Folder</p>
                  <span className="px-2 py-0.5 rounded-full bg-secondary text-[10px] uppercase font-bold tracking-wider">
                    {resource.role}
                  </span>
                </div>
              </div>
            </div>
            
            {resource.role === "editor" && (
              <Button className="rounded-xl gap-2 shadow-lg shadow-primary/20">
                <Plus className="w-4 h-4" /> Upload to Folder
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resource.files.length === 0 ? (
              <div className="col-span-full py-20 text-center opacity-40">
                <FileText className="w-12 h-12 mx-auto mb-4" />
                <p>This shared folder is empty</p>
              </div>
            ) : (
              resource.files.map((file: any) => (
                <div key={file.id} className="group flex items-center justify-between gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-accent" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{file.file_name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase">{file.file_type} · {(file.file_size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg" onClick={() => window.open(file.file_url, "_blank")}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    {resource.role === "editor" && (
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default SharedFilePage;
