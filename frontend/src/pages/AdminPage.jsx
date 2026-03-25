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
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Globe,
  Clock
} from "lucide-react";

export default function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      // Verify admin access via API
      await adminAPI.verifyAccess();
      
      // Load admin data
      const [statsData, usersData, agentsData] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getUsers(10),
        adminAPI.getAgents(10),
      ]);
      
      setStats(statsData);
      setUsers(usersData.users);
      setAgents(agentsData.agents);
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

  return (
    <div className="min-h-screen bg-[#050709]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#1F2933]/50 bg-[#050709]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-red-500/20 flex items-center justify-center">
                <Shield className="w-4 h-4 text-red-500" />
              </div>
              <span className="text-lg font-semibold text-white font-['Space_Grotesk']">
                Admin Console
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Platform Stats */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 font-['Space_Grotesk']">
            Platform Overview
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="card-surface p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-[#01696F]" />
                <span className="text-[11px] uppercase tracking-wider text-gray-500">Users</span>
              </div>
              <p className="text-2xl font-semibold text-white">{stats?.total_users || 0}</p>
            </div>
            
            <div className="card-surface p-4">
              <div className="flex items-center gap-2 mb-1">
                <Bot className="w-4 h-4 text-[#01696F]" />
                <span className="text-[11px] uppercase tracking-wider text-gray-500">Agents</span>
              </div>
              <p className="text-2xl font-semibold text-white">{stats?.total_agents || 0}</p>
            </div>
            
            <div className="card-surface p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-[#01696F]" />
                <span className="text-[11px] uppercase tracking-wider text-gray-500">Outcomes</span>
              </div>
              <p className="text-2xl font-semibold text-white">{stats?.total_outcomes || 0}</p>
            </div>
            
            <div className="card-surface p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-[#01696F]" />
                <span className="text-[11px] uppercase tracking-wider text-gray-500">24h Outcomes</span>
              </div>
              <p className="text-2xl font-semibold text-white">{stats?.outcomes_last_24_hours || 0}</p>
            </div>
            
            <div className="card-surface p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-[#01696F]" />
                <span className="text-[11px] uppercase tracking-wider text-gray-500">7d Outcomes</span>
              </div>
              <p className="text-2xl font-semibold text-white">{stats?.outcomes_last_7_days || 0}</p>
            </div>
            
            <div className="card-surface p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-[#01696F]" />
                <span className="text-[11px] uppercase tracking-wider text-gray-500">New Users (7d)</span>
              </div>
              <p className="text-2xl font-semibold text-white">{stats?.new_users_last_7_days || 0}</p>
            </div>
          </div>
        </section>

        {/* Recent Users */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 font-['Space_Grotesk']">
            Recent Users
          </h2>
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
                          <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">Admin</span>
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
        </section>

        {/* Recent Agents */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-4 font-['Space_Grotesk']">
            Recent Agents
          </h2>
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
                        <span className={`px-2 py-0.5 rounded-full text-xs ${
                          a.tier === "Platinum" ? "bg-cyan-500/20 text-cyan-400" :
                          a.tier === "Gold" ? "bg-yellow-500/20 text-yellow-400" :
                          a.tier === "Silver" ? "bg-gray-400/20 text-gray-300" :
                          a.tier === "Bronze" ? "bg-amber-600/20 text-amber-400" :
                          "bg-gray-500/20 text-gray-500"
                        }`}>
                          {a.tier}
                        </span>
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
        </section>
      </main>
    </div>
  );
}
