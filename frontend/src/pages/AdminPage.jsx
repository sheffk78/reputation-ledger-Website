import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { adminAPI } from "../lib/api";
import { 
  Users, 
  Bot, 
  Zap, 
  Shield, 
  LogOut,
  Loader2,
  AlertTriangle,
  Globe,
  Clock,
  LayoutDashboard,
  FileText,
  ChevronRight,
  TrendingUp
} from "lucide-react";

// Navigation items
const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "logs", label: "Logs", icon: FileText },
];

export default function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [agents, setAgents] = useState([]);
  const [agentsTotal, setAgentsTotal] = useState(0);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      await adminAPI.verifyAccess();
      
      const [statsData, usersData, agentsData] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getUsers(50),
        adminAPI.getAgents(50),
      ]);
      
      setStats(statsData);
      setUsers(usersData.users);
      setUsersTotal(usersData.total);
      setAgents(agentsData.agents);
      setAgentsTotal(agentsData.total);
    } catch (error) {
      console.error("Admin access check failed:", error);
      if (error.response?.status === 403) {
        setAccessDenied(true);
      } else if (error.response?.status === 401) {
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050709] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#01696F] animate-spin" />
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-[#050709] flex flex-col items-center justify-center px-6">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-semibold text-white mb-2 font-['Space_Grotesk']">
          Access Denied
        </h1>
        <p className="text-gray-400 text-center max-w-md mb-8">
          You do not have admin privileges. This area is restricted to authorized administrators only.
        </p>
        <Link 
          to="/dashboard"
          className="px-6 py-2.5 bg-[#01696F] hover:bg-[#015858] text-white font-medium rounded-lg transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // Calculate avg score for overview
  const avgScore = stats ? (
    agents.filter(a => a.outcome_count >= 5).length > 0
      ? (agents.filter(a => a.outcome_count >= 5).reduce((sum, a) => sum + a.score, 0) / 
         agents.filter(a => a.outcome_count >= 5).length).toFixed(1)
      : "—"
  ) : "—";

  return (
    <div className="min-h-screen bg-[#050709] flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#1F2933]/50 flex flex-col">
        {/* Logo */}
        <div className="p-6 border-b border-[#1F2933]/50">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-red-500/20 to-red-600/10 flex items-center justify-center border border-red-500/20">
              <Shield className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <span className="text-base font-semibold text-white font-['Space_Grotesk'] block">
                RepLedger
              </span>
              <span className="text-[10px] uppercase tracking-wider text-red-500 font-medium">
                Admin Console
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[#01696F]/15 text-[#01696F]"
                        : "text-gray-400 hover:text-white hover:bg-white/[0.03]"
                    }`}
                    data-testid={`nav-${item.id}`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                    {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-[#1F2933]/50">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-[#01696F]/20 flex items-center justify-center">
              <span className="text-[#01696F] text-sm font-medium">
                {user?.email?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{user?.email}</p>
              <p className="text-[10px] text-red-500 uppercase tracking-wider">Admin</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-500 hover:text-white transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-[#050709]/95 backdrop-blur-sm border-b border-[#1F2933]/50 px-8 py-4">
          <h1 className="text-xl font-semibold text-white font-['Space_Grotesk']">
            {NAV_ITEMS.find(i => i.id === activeSection)?.label}
          </h1>
        </header>

        <div className="p-8">
          {/* Overview Section */}
          {activeSection === "overview" && (
            <div className="space-y-8" data-testid="admin-overview">
              {/* Stats grid */}
              <section>
                <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
                  Platform Statistics
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  <StatCard 
                    icon={Users} 
                    label="Total Users" 
                    value={stats?.total_users || 0} 
                  />
                  <StatCard 
                    icon={Bot} 
                    label="Total Agents" 
                    value={stats?.total_agents || 0} 
                  />
                  <StatCard 
                    icon={Zap} 
                    label="Total Outcomes" 
                    value={stats?.total_outcomes || 0} 
                  />
                  <StatCard 
                    icon={Clock} 
                    label="Outcomes (7d)" 
                    value={stats?.outcomes_last_7_days || 0} 
                  />
                  <StatCard 
                    icon={TrendingUp} 
                    label="Avg. Score" 
                    value={avgScore}
                    subtitle="Agents with 5+ outcomes"
                  />
                </div>
              </section>

              {/* Activity stats */}
              <section>
                <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
                  Recent Activity
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="card-surface p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-400">24h Outcomes</span>
                      <Zap className="w-4 h-4 text-[#01696F]" />
                    </div>
                    <p className="text-3xl font-semibold text-white">{stats?.outcomes_last_24_hours || 0}</p>
                  </div>
                  <div className="card-surface p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-400">New Users (7d)</span>
                      <Users className="w-4 h-4 text-[#01696F]" />
                    </div>
                    <p className="text-3xl font-semibold text-white">{stats?.new_users_last_7_days || 0}</p>
                  </div>
                  <div className="card-surface p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-gray-400">Public Agents</span>
                      <Globe className="w-4 h-4 text-[#01696F]" />
                    </div>
                    <p className="text-3xl font-semibold text-white">
                      {agents.filter(a => a.is_public).length}
                    </p>
                  </div>
                </div>
              </section>

              {/* Quick tables */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                      Recent Users
                    </h2>
                    <button 
                      onClick={() => setActiveSection("users")}
                      className="text-xs text-[#01696F] hover:text-[#018080]"
                    >
                      View all →
                    </button>
                  </div>
                  <div className="card-surface overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="text-left py-2.5 px-4 text-gray-500 font-medium">Email</th>
                          <th className="text-left py-2.5 px-4 text-gray-500 font-medium">Agents</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.slice(0, 5).map((u) => (
                          <tr key={u.id} className="border-b border-white/[0.03]">
                            <td className="py-2.5 px-4 text-white text-xs">{u.email}</td>
                            <td className="py-2.5 px-4 text-gray-400">{u.agent_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                      Top Agents
                    </h2>
                    <button 
                      onClick={() => setActiveSection("agents")}
                      className="text-xs text-[#01696F] hover:text-[#018080]"
                    >
                      View all →
                    </button>
                  </div>
                  <div className="card-surface overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          <th className="text-left py-2.5 px-4 text-gray-500 font-medium">Name</th>
                          <th className="text-left py-2.5 px-4 text-gray-500 font-medium">Score</th>
                          <th className="text-left py-2.5 px-4 text-gray-500 font-medium">Tier</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...agents].sort((a, b) => b.score - a.score).slice(0, 5).map((a) => (
                          <tr key={a.agent_id} className="border-b border-white/[0.03]">
                            <td className="py-2.5 px-4 text-white text-xs">{a.name}</td>
                            <td className="py-2.5 px-4 text-white font-mono">{a.score}</td>
                            <td className="py-2.5 px-4">
                              <TierBadge tier={a.tier} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            </div>
          )}

          {/* Users Section */}
          {activeSection === "users" && (
            <div data-testid="admin-users">
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-gray-400">{usersTotal} total users</p>
              </div>
              <div className="card-surface overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Email</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Role</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Agents</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Outcomes</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                          <td className="py-3 px-4 text-white">{u.email}</td>
                          <td className="py-3 px-4">
                            {u.is_admin ? (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400 font-medium">Admin</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-xs bg-gray-500/20 text-gray-400">User</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-400">{u.agent_count}</td>
                          <td className="py-3 px-4 text-gray-400">{u.outcome_count}</td>
                          <td className="py-3 px-4 text-gray-500 text-xs">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Agents Section */}
          {activeSection === "agents" && (
            <div data-testid="admin-agents">
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-gray-400">{agentsTotal} total agents</p>
              </div>
              <div className="card-surface overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Name</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Owner</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Score</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Tier</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Outcomes</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Public</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agents.map((a) => (
                        <tr key={a.agent_id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                          <td className="py-3 px-4 text-white">{a.name}</td>
                          <td className="py-3 px-4 text-gray-400 text-xs">{a.owner_email}</td>
                          <td className="py-3 px-4 text-white font-mono">{a.score}</td>
                          <td className="py-3 px-4">
                            <TierBadge tier={a.tier} />
                          </td>
                          <td className="py-3 px-4 text-gray-400">{a.outcome_count}</td>
                          <td className="py-3 px-4">
                            {a.is_public ? (
                              <Globe className="w-4 h-4 text-green-500" />
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-500 text-xs">
                            {new Date(a.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Logs Section (Placeholder) */}
          {activeSection === "logs" && (
            <div data-testid="admin-logs" className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-full bg-[#1F2933] flex items-center justify-center mb-6">
                <FileText className="w-8 h-8 text-gray-500" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2 font-['Space_Grotesk']">
                Logs Coming Soon
              </h2>
              <p className="text-gray-400 text-center max-w-md">
                Activity logs and audit trails will be available in a future update. 
                This will include user actions, API calls, and system events.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon: Icon, label, value, subtitle }) {
  return (
    <div className="card-surface p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-[#01696F]" />
        <span className="text-[11px] uppercase tracking-wider text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-white">{value}</p>
      {subtitle && (
        <p className="text-[10px] text-gray-500 mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}

// Tier Badge Component
function TierBadge({ tier }) {
  const colors = {
    Platinum: "bg-cyan-500/20 text-cyan-400",
    Gold: "bg-yellow-500/20 text-yellow-400",
    Silver: "bg-gray-400/20 text-gray-300",
    Bronze: "bg-amber-600/20 text-amber-400",
    Unrated: "bg-gray-500/20 text-gray-500",
  };
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[tier] || colors.Unrated}`}>
      {tier}
    </span>
  );
}
