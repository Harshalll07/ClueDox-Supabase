import { useFiles } from "@/hooks/useFiles";
import { Link, useNavigate } from "react-router-dom";
import { Upload, Search, Heart, Shield, Users, Clock, File, MoreVertical, Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { format } from "date-fns";
import { viewFile } from "@/lib/fileUrl";
import { cn } from "@/lib/utils";

const STORAGE_LIMIT = 5 * 1024 * 1024 * 1024; // 5GB limit example

const Dashboard = () => {
  const { data: files, isLoading } = useFiles();
  const navigate = useNavigate();

  const allFiles = files || [];
  
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      navigate(`/search?q=${encodeURIComponent(e.currentTarget.value.trim())}`);
    }
  };
  
  // Stats calculations
  const totalFiles = allFiles.length;
  const recentFiles = allFiles.slice(0, 5);
  const aiProcessed = allFiles.filter(f => f.ai_summary || f.tags?.length > 0).length;
  
  const totalStorageUsed = allFiles.reduce((acc, current) => acc + current.file_size, 0);
  const storagePercentage = Math.min(100, (totalStorageUsed / STORAGE_LIMIT) * 100);

  // File type distribution for chart
  const fileTypes = allFiles.reduce((acc, file) => {
    let type = 'Other';
    if (file.file_type.includes('pdf')) type = 'PDF';
    else if (file.file_type.includes('image')) type = 'Image';
    else if (file.file_type.includes('word') || file.file_type.includes('document')) type = 'Document';
    else if (file.file_type.includes('sheet') || file.file_type.includes('excel')) type = 'Spreadsheet';
    
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(fileTypes).map(([name, value]) => ({ name, value }));
  const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#8b5cf6']; // Original purple/pink theme

  return (
    <AppLayout>
      <div className="flex flex-col h-full bg-[#FCFCFB] text-[#333]">
        
        {/* Dashboard Header with Search */}
        <div className="w-full max-w-[1400px] mx-auto px-6 pt-6 pb-2 shrink-0">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">
            Search By Memory
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-[#111] mb-4 drop-shadow-sm" style={{ fontFamily: "'Playfair Display', serif" }}>
            Dashboard
          </h1>
          
          <div className="relative max-w-2xl shadow-sm">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
             <input 
               type="text" 
               onKeyDown={handleSearch}
               placeholder="Search files by meaning, context, or filename (Press Enter)..." 
               className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[#EFEFEF] bg-white focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 text-[#111] placeholder:text-gray-400 transition-all font-medium text-sm"
             />
          </div>
        </div>

        <div className="w-full max-w-[1400px] mx-auto px-6 py-6 flex-1 overflow-y-auto">
          
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
               <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pb-20">
              
              {/* Left Column (Stats & Quick Actions) */}
              <div className="md:col-span-8 space-y-6">
                
                {/* Storage Card */}
                <div className="bg-white rounded-2xl p-6 border border-[#EFEFEF] shadow-sm">
                  <div className="flex justify-between items-end mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">Storage Overview</h3>
                      <p className="text-2xl font-bold text-[#111]">
                        {(totalStorageUsed / (1024 * 1024)).toFixed(1)} MB <span className="text-sm text-gray-400 font-medium">used of 5GB</span>
                      </p>
                    </div>
                    <div className="text-sm font-semibold text-primary">{storagePercentage.toFixed(1)}%</div>
                  </div>
                  <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                     <div 
                       className="h-full bg-primary rounded-full transition-all duration-1000" 
                       style={{ width: `${storagePercentage}%` }}
                     />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Total Files", value: totalFiles, icon: File, color: "text-blue-500", bg: "bg-blue-50" },
                    { label: "AI Processed", value: aiProcessed, icon: Shield, color: "text-emerald-500", bg: "bg-emerald-50" },
                    { label: "Shared", value: 0, icon: Users, color: "text-amber-500", bg: "bg-amber-50" },
                    { label: "Favorites", value: 2, icon: Heart, color: "text-pink-500", bg: "bg-pink-50" },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white rounded-2xl p-5 border border-[#EFEFEF] shadow-sm hover:shadow-md transition-shadow">
                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", stat.bg)}>
                         <stat.icon className={cn("w-5 h-5", stat.color)} />
                      </div>
                      <h4 className="text-2xl font-bold text-[#111] mb-1">{stat.value}</h4>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div>
                  <h3 className="text-lg font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>Quick Actions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button onClick={() => navigate('/upload')} className="group flex items-center justify-between bg-primary text-white p-5 rounded-2xl shadow-sm hover:bg-primary/90 transition-all active:scale-[0.98]">
                      <div className="text-left">
                        <h4 className="font-bold text-lg mb-1">Upload New</h4>
                        <p className="text-sm text-white/80">Support for PDF, Images, Word</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                        <Upload className="w-6 h-6" />
                      </div>
                    </button>
                    <button onClick={() => navigate('/search')} className="group flex items-center justify-between bg-white border border-[#EFEFEF] text-[#111] p-5 rounded-2xl shadow-sm hover:bg-gray-50 transition-all active:scale-[0.98]">
                      <div className="text-left">
                        <h4 className="font-bold text-lg mb-1">Smart Search</h4>
                        <p className="text-sm text-gray-500">Find anything instantly</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                        <Search className="w-6 h-6 text-gray-600" />
                      </div>
                    </button>
                  </div>
                </div>

              </div>

              {/* Right Column (Chart & Recents) */}
              <div className="md:col-span-4 space-y-6">
                
                {/* Distribution Chart */}
                <div className="bg-white rounded-2xl p-6 border border-[#EFEFEF] shadow-sm">
                  <h3 className="text-lg font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>File Distribution</h3>
                  {chartData.length > 0 ? (
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            stroke="none"
                          >
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">
                      No files to display
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 justify-center mt-2">
                    {chartData.map((entry, index) => (
                      <div key={entry.name} className="flex items-center gap-1.5 text-xs font-medium text-gray-600">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        {entry.name} ({entry.value})
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recents */}
                <div className="bg-white rounded-2xl p-6 border border-[#EFEFEF] shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>Recent Files</h3>
                    <Link to="/files" className="text-sm font-semibold text-primary hover:underline">View All</Link>
                  </div>
                  <div className="space-y-3">
                    {recentFiles.length > 0 ? (
                      recentFiles.map(file => (
                        <div key={file.id} onClick={() => file.file_url ? viewFile(file.file_url) : null} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors group">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                            <File className="w-5 h-5 text-gray-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-[#111] truncate">{file.file_name}</h4>
                            <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />
                              {format(new Date(file.upload_date), "MMM d, yyyy")}
                            </p>
                          </div>
                          <button className="p-1.5 rounded-md hover:bg-gray-200 text-gray-400 transition-colors opacity-0 group-hover:opacity-100">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-sm text-gray-500">
                        No recent files found.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
