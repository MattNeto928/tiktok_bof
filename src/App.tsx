
import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { AppProvider } from "./lib/store";
import UploadPage from "./pages/UploadPage";
import DashboardPage from "./pages/DashboardPage";
import GalleryPage from "./pages/GalleryPage";
import SettingsPage from "./pages/SettingsPage";
import {
  Upload,
  LayoutDashboard,
  Film,
  Settings,
  Zap,
} from "lucide-react";

const NAV_ITEMS = [
  { path: "/upload", label: "Upload", icon: Upload },
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/gallery", label: "Gallery", icon: Film },
  { path: "/settings", label: "Settings", icon: Settings },
];

function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-dark-800 border-r border-dark-600 flex flex-col z-20">
      {/* Logo */}
      <div className="p-5 border-b border-dark-600">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">TikTok BoF</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest">Video Pipeline</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                  : "text-slate-400 hover:text-slate-300 hover:bg-dark-700 border border-transparent"
              }`
            }
          >
            <item.icon className="w-4.5 h-4.5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-dark-600">
        <p className="text-[10px] text-slate-600 text-center">
          Powered by fal.ai • Nano Banana • Grok Video
        </p>
      </div>
    </aside>
  );
}

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-64 p-8">
            <Routes>
              <Route path="/" element={<Navigate to="/upload" replace />} />
              <Route path="/upload" element={<UploadPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
