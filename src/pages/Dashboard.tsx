import { useFiles } from "@/hooks/useFiles";
import { Link, useNavigate } from "react-router-dom";
import { Upload, Search, Clock, File, Folder, MoreVertical, Database, FileText, Bot, Zap, LayoutGrid, CheckCircle } from "lucide-react";
import AppLayout from "./AppLayout";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { format } from "date-fns";
import { viewFile } from "@/lib/fileUrl";
import { cn } from "@/lib/utils";

const STORAGE_LIMIT = 5 * 1024 * 1024 * 1024; // 5GB limit example

const Dashboard = () => {
  const { data: files, isLoading } = useFiles();
  const navigate = useNavigate();

  const allFiles = files || [];

  const totalFiles = allFiles.length;
  const recentFiles = allFiles.slice(0, 5);
  const aiProcessed = allFiles.filter((f) => f.ai_summary || f.tags?.length > 0).length;
  const recentActivityCount = allFiles.filter(file => {
    const uploadDate = new Date(file.upload_date);
    const now = new Date();
    return (now.getTime() - uploadDate.getTime()) <= 24 * 60 * 60 * 1000;
  }).length;

  const totalStorageUsed = allFiles.reduce((acc, current) => acc + current.file_size, 0);
  const storagePercentage = Math.min(100, (totalStorageUsed / STORAGE_LIMIT) * 100);

  const fileTypes = allFiles.reduce((acc, file) => {
    let type = "Other";
    if (file.file_type.includes("pdf")) type = "PDF";
    else if (file.file_type.includes("image")) type = "Image";
    else if (file.file_type.includes("word") || file.file_type.includes("document")) type = "Document";
    else if (file.file_type.includes("sheet") || file.file_type.includes("excel")) type = "Spreadsheet";

    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(fileTypes).map(([name, value]) => ({ name, value }));
  const COLORS = ["#6366f1", "#a855f7", "#ec4899", "#f43f5e", "#8b5cf6"];

  const folderGroups = recentFiles.reduce((acc, file) => {
    const folderName = (file as any).folder_name || "Ungrouped";
    if (!acc[folderName]) acc[folderName] = [];
    acc[folderName].push(file);
    return acc;
  }, {} as Record<string, typeof recentFiles>);

  const folderEntries = Object.entries(folderGroups);

  return (
    <AppLayout>
      <div className="flex flex-col h-full bg-[#F7F7F5] dark:bg-[#0B0B0C] text-gray-900 dark:text-gray-100 transition-colors duration-300">
        <div className="w-full max-w-[1400px] mx-auto px-6 pt-2 pb-2 shrink-0">
          <div className="min-h-full bg-transparent">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div></div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">Suggested Folders</h2>
                  <span className="text-sm text-muted-foreground">Recent activity</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {folderEntries.length > 0 ? (
                    folderEntries.map(([folderName, files]) => (
                      <div
                        key={folderName}
                        onClick={() => navigate(`/files?folder=${encodeURIComponent(folderName)}`)}
                        role="button"
                        tabIndex={0}
                        className="relative group text-left bg-card border border-border rounded-xl p-4 hover:shadow-md transition"
                      >
                        <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="flex justify-center items-center h-12 text-muted-foreground">
                          <Folder className="w-6 h-6" />
                        </div>
                        <p className="mt-3 truncate text-sm font-medium text-foreground">{folderName}</p>
                        <p className="text-xs text-muted-foreground">{files.length} files</p>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center text-sm text-muted-foreground">No suggested folders available.</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                <div className="xl:col-span-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Card 1: Storage */}
                    <div className="rounded-2xl bg-card p-6 border border-border shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
                          <Database className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/30 px-2 py-1 rounded-lg">
                          {storagePercentage.toFixed(1)}%
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground">Storage Usage</h3>
                      <p className="text-2xl font-bold text-foreground mt-1">
                        {(totalStorageUsed / (1024 * 1024)).toFixed(1)} MB
                      </p>
                      <div className="mt-4 h-2 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 transition-all duration-500"
                          style={{ width: `${storagePercentage}%` }}
                        />
                      </div>
                    </div>

                    {/* Card 2: Total Files */}
                    <div className="rounded-2xl bg-card p-6 border border-border shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                          <FileText className="w-5 h-5" />
                        </div>
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground">Total Files</h3>
                      <p className="text-2xl font-bold text-foreground mt-1">{totalFiles}</p>
                      <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-500" /> All systems active
                      </p>
                    </div>

                    {/* Card 3: AI Processed */}
                    <div className="rounded-2xl bg-card p-6 border border-border shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                          <Bot className="w-5 h-5" />
                        </div>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          Smart
                        </span>
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground">AI Processed</h3>
                      <p className="text-2xl font-bold text-foreground mt-1">{aiProcessed}</p>
                      <p className="text-xs text-muted-foreground mt-4">Automated tags & summaries</p>
                    </div>

                    {/* Card 4: Recent Activity */}
                    <div className="rounded-2xl bg-card p-6 border border-border shadow-sm hover:shadow-md transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
                          <Zap className="w-5 h-5" />
                        </div>
                      </div>
                      <h3 className="text-sm font-medium text-muted-foreground">Today's Activity</h3>
                      <p className="text-2xl font-bold text-foreground mt-1">{recentActivityCount} files</p>
                      <p className="text-xs text-muted-foreground mt-4">Uploaded in the last 24h</p>
                    </div>

                    {/* Quick Actions (Repositioned below cards) */}
                    <div className="md:col-span-2 rounded-2xl bg-muted p-6 border border-dashed border-border transition-all">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div>
                          <h4 className="text-sm font-bold text-foreground">Quick Actions</h4>
                          <p className="text-xs text-muted-foreground">Speed up your workflow</p>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <button
                            onClick={() => navigate("/upload")}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95"
                          >
                            <Upload className="w-4 h-4" /> Upload
                          </button>
                          <button
                            onClick={() => navigate("/search")}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-card border border-border text-foreground rounded-xl text-sm font-bold hover:bg-accent transition-all active:scale-95"
                          >
                            <Search className="w-4 h-4" /> Search
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="xl:col-span-4 space-y-6">
                  <div className="rounded-xl bg-card p-5 border border-border shadow-sm">
                    <h2 className="text-lg font-semibold text-foreground mb-4">File Distribution</h2>
                    {chartData.length > 0 ? (
                      <div className="h-[220px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={80}
                              paddingAngle={3}
                              dataKey="value"
                              stroke="none"
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 8px rgb(0 0 0 / 0.1)" }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">No files to display</div>
                    )}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {chartData.map((entry, index) => (
                        <div key={entry.name} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          {entry.name} ({entry.value})
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl bg-card p-5 border border-border shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-foreground">Recent Files</h2>
                      <Link to="/files" className="text-sm font-semibold text-primary hover:underline">
                        View All
                      </Link>
                    </div>
                    <div className="space-y-3">
                      {recentFiles.length > 0 ? (
                        recentFiles.map((file) => (
                          <div
                            key={file.id}
                            onClick={() => (file.file_url ? viewFile(file.file_url) : null)}
                            className="flex items-center gap-3 rounded-lg p-3 hover:bg-accent cursor-pointer transition"
                          >
                            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                              <File className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-foreground">{file.file_name}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(file.upload_date), "MMM d, yyyy")}
                              </p>
                            </div>
                            <button className="rounded-md p-1.5 text-muted-foreground hover:bg-accent transition-opacity opacity-0 group-hover:opacity-100">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-sm text-muted-foreground">No recent files found.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
