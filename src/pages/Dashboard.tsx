import { useFiles } from "@/hooks/useFiles";
import { Link, useNavigate } from "react-router-dom";
import { Upload, Search, Clock, File, Folder, MoreVertical } from "lucide-react";
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
      <div className="flex flex-col h-full bg-transparent text-gray-900 dark:text-gray-100">
        <div className="w-full max-w-[1400px] mx-auto px-6 pt-2 pb-2 shrink-0">
          <div className="min-h-full bg-transparent dark:bg-transparent text-gray-900 dark:text-gray-100">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div></div>
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-gray-100">Suggested Folders</h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Recent activity</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {folderEntries.length > 0 ? (
                    folderEntries.map(([folderName, files]) => (
                      <div
                        key={folderName}
                        onClick={() => navigate(`/files?folder=${encodeURIComponent(folderName)}`)}
                        role="button"
                        tabIndex={0}
                        className="relative group text-left bg-white dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl p-4 hover:shadow-md transition"
                      >
                        <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                        </div>
                        <div className="flex justify-center items-center h-12 text-gray-400 dark:text-gray-400">
                          <Folder className="w-6 h-6" />
                        </div>
                        <p className="mt-3 truncate text-sm font-medium text-gray-800 dark:text-gray-200">{folderName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{files.length} files</p>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center text-sm text-gray-500 dark:text-gray-400">No suggested folders available.</div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
                <div className="xl:col-span-8 space-y-6">
                  <div className="rounded-xl bg-white dark:bg-slate-800 p-5 border border-gray-200 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-slate-900">Storage Usage</h2>
                      <span className="text-sm font-semibold text-purple-600">{storagePercentage.toFixed(1)}%</span>
                    </div>
                    <p className="text-2xl font-bold text-slate-900 mb-2">
                      {(totalStorageUsed / (1024 * 1024)).toFixed(1)} MB used of 5 GB
                    </p>
                    <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${storagePercentage}%`, background: "linear-gradient(90deg, #7C3AED 0%, #6D28D9 100%)" }}
                      />
                    </div>
                  </div>

                  <div className="rounded-xl bg-white dark:bg-slate-800 p-5 border border-gray-200 dark:border-slate-700 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        onClick={() => navigate("/upload")}
                        className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 text-left hover:shadow-md transition"
                      >
                        <p className="text-base font-bold">Upload New</p>
                        <p className="text-sm text-white/90">Support for PDF, Images, Word</p>
                      </button>
                      <button
                        onClick={() => navigate("/search")}
                        className="rounded-xl border border-gray-200 bg-white dark:bg-slate-800 p-4 text-left hover:shadow-md transition"
                      >
                        <p className="text-base font-bold text-slate-900">Smart Search</p>
                        <p className="text-sm text-gray-500">Find anything instantly</p>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="xl:col-span-4 space-y-6">
                  <div className="rounded-xl bg-white dark:bg-slate-800 p-5 border border-gray-200 dark:border-slate-700 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">File Distribution</h2>
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
                      <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No files to display</div>
                    )}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {chartData.map((entry, index) => (
                        <div key={entry.name} className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                          {entry.name} ({entry.value})
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl bg-white dark:bg-slate-800 p-5 border border-gray-200 dark:border-slate-700 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-slate-900">Recent Files</h2>
                      <Link to="/files" className="text-sm font-semibold text-purple-600 hover:underline">
                        View All
                      </Link>
                    </div>
                    <div className="space-y-3">
                      {recentFiles.length > 0 ? (
                        recentFiles.map((file) => (
                          <div
                            key={file.id}
                            onClick={() => (file.file_url ? viewFile(file.file_url) : null)}
                            className="flex items-center gap-3 rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition"
                          >
                            <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-purple-50 text-purple-500">
                              <File className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-900">{file.file_name}</p>
                              <p className="mt-0.5 text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {format(new Date(file.upload_date), "MMM d, yyyy")}
                              </p>
                            </div>
                            <button className="rounded-md p-1.5 text-gray-400 hover:bg-gray-200 transition-opacity opacity-0 group-hover:opacity-100">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6 text-sm text-gray-500">No recent files found.</div>
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
