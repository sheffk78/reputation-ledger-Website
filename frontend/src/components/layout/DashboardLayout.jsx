import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { 
  LayoutDashboard, 
  Bot, 
  Key, 
  FileCode, 
  LogOut,
  ChevronRight
} from "lucide-react";

const LOGO_URL = "/repledger-logo-dark.svg";

const navItems = [
  { path: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { path: "/dashboard/agents", label: "Agents", icon: Bot },
  { path: "/dashboard/api-key", label: "API Key", icon: Key },
  { path: "/docs", label: "Docs", icon: FileCode },
];

export function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#050709]">
      {/* Top navbar */}
      <header className="h-16 border-b border-white/10 bg-[#0C1116]/80 backdrop-blur-xl fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center justify-between h-full px-6">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src={LOGO_URL} 
              alt="RepLedger" 
              className="h-7"
            />
          </Link>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#9CA3AF]">{user?.email}</span>
            <button
              onClick={handleLogout}
              data-testid="logout-btn"
              className="flex items-center gap-2 text-sm text-[#9CA3AF] hover:text-white transition-colors duration-150"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside className="w-60 min-h-[calc(100vh-64px)] bg-[#0C1116] border-r border-white/10 fixed left-0 top-16">
          <nav className="py-6">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path !== "/dashboard" && location.pathname.startsWith(item.path));
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  className={`flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? "text-[#01696F] bg-[#01696F]/10 border-r-2 border-[#01696F]"
                      : "text-[#9CA3AF] hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 ml-60 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
