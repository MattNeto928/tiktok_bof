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
} from "lucide-react";

const NAV_ITEMS = [
  { path: "/upload", label: "Upload", icon: Upload },
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/gallery", label: "Gallery", icon: Film },
  { path: "/settings", label: "Settings", icon: Settings },
];

function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-dark-900 border-r border-dark-700 flex flex-col z-20">
      {/* Brand */}
      <div className="px-5 py-6 border-b border-dark-700">
        <h1 className="text-[15px] font-bold text-white tracking-tight">
          TikTok BoF
        </h1>
        <p className="text-[10px] text-slate-500 mt-0.5 tracking-wide uppercase">
          Video Pipeline
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 mt-1">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? "bg-dark-700 text-white"
                  : "text-slate-500 hover:text-slate-300 hover:bg-dark-800"
              }`
            }
          >
            <item.icon className="w-[18px] h-[18px]" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-dark-700">
        <p className="text-[10px] text-dark-400 text-center">
          fal.ai · Nano Banana · Grok Video
        </p>
      </div>
    </aside>
  );
}

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <div className="flex min-h-screen bg-dark-950">
          <Sidebar />
          <main className="flex-1 ml-60 p-8">
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
