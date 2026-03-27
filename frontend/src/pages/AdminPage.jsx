import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { adminAPI } from "../lib/api";
import { toast } from "sonner";
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
  TrendingUp,
  Key,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Briefcase,
  Terminal,
  Plus,
  Copy,
  Trash2,
  ExternalLink
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";

// Navigation items
const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "clients", label: "Clients", icon: Briefcase },
  { id: "users", label: "Users", icon: Users },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "feedback", label: "Feedback", icon: MessageSquare, isLink: true, href: "/admin/feedback" },
  { id: "logs", label: "Logs", icon: FileText },
  { id: "admin-api", label: "Admin API", icon: Terminal },
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
  const [apiKeys, setApiKeys] = useState([]);
  const [apiKeysTotal, setApiKeysTotal] = useState(0);
  const [apiKeyStatusFilter, setApiKeyStatusFilter] = useState(null);
  const [agentTierFilter, setAgentTierFilter] = useState(null);
  const [agentPublicFilter, setAgentPublicFilter] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLogsTotal, setAuditLogsTotal] = useState(0);
  const [auditLogsPage, setAuditLogsPage] = useState(1);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditEventFilter, setAuditEventFilter] = useState(null);

  // Client provisioning state
  const [clientDialogOpen, setClientDialogOpen] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const [clientFormData, setClientFormData] = useState({
    email: "",
    password: "",
    agents: [{ name: "", description: "", is_public: false }],
    webhooks: [],
  });
  const [clientFormErrors, setClientFormErrors] = useState({});
  const [setupResult, setSetupResult] = useState(null);
  const [setupResultDialogOpen, setSetupResultDialogOpen] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      await adminAPI.verifyAccess();
      
      const [statsData, usersData, agentsData, apiKeysData] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getUsers(50),
        adminAPI.getAgents(50),
        adminAPI.getApiKeys(50),
      ]);
      
      setStats(statsData);
      setUsers(usersData.users);
      setUsersTotal(usersData.total);
      setAgents(agentsData.agents);
      setAgentsTotal(agentsData.total);
      setApiKeys(apiKeysData.api_keys);
      setApiKeysTotal(apiKeysData.total);
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

  // Fetch API keys with optional status filter
  const fetchApiKeys = async (statusFilter = null) => {
    try {
      const data = await adminAPI.getApiKeys(50, 0, statusFilter);
      setApiKeys(data.api_keys);
      setApiKeysTotal(data.total);
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
    }
  };

  // Handle API key status filter change
  const handleApiKeyStatusFilter = (newStatus) => {
    setApiKeyStatusFilter(newStatus);
    fetchApiKeys(newStatus);
  };

  // Fetch agents with filters
  const fetchAgents = async (tierFilter = null, publicFilter = null) => {
    try {
      const filters = {};
      if (tierFilter) filters.tier = tierFilter;
      if (publicFilter !== null) filters.is_public = publicFilter;
      
      const data = await adminAPI.getAgents(50, 0, filters);
      setAgents(data.agents);
      setAgentsTotal(data.total);
    } catch (error) {
      console.error("Failed to fetch agents:", error);
    }
  };

  // Handle agent filter changes
  const handleAgentFilters = (tierFilter, publicFilter) => {
    setAgentTierFilter(tierFilter);
    setAgentPublicFilter(publicFilter);
    fetchAgents(tierFilter, publicFilter);
  };

  // Fetch audit logs
  const fetchAuditLogs = async (page = 1, eventType = null) => {
    setAuditLogsLoading(true);
    try {
      const data = await adminAPI.getAuditLogs(page, 50, eventType);
      setAuditLogs(data.logs);
      setAuditLogsTotal(data.total);
      setAuditLogsPage(page);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setAuditLogsLoading(false);
    }
  };

  // Handle audit event filter change
  const handleAuditEventFilter = (eventType) => {
    setAuditEventFilter(eventType);
    fetchAuditLogs(1, eventType);
  };

  // Load audit logs when switching to logs section
  useEffect(() => {
    if (activeSection === "logs" && auditLogs.length === 0 && !auditLogsLoading) {
      fetchAuditLogs(1, auditEventFilter);
    }
  }, [activeSection]);

  // Handle full setup submission for client provisioning
  const handleFullSetup = async (e) => {
    e.preventDefault();

    // Basic validation
    const errors = {};
    if (!clientFormData.email) errors.email = "Email is required.";
    if (!clientFormData.password || clientFormData.password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    }

    // Validate agents have names
    const validAgents = clientFormData.agents.filter(a => a.name.trim());
    if (validAgents.length === 0) {
      errors.agents = "At least one agent with a name is required.";
    }

    if (Object.keys(errors).length > 0) {
      setClientFormErrors(errors);
      return;
    }

    setCreatingClient(true);
    setClientFormErrors({});

    try {
      const payload = {
        email: clientFormData.email,
        password: clientFormData.password,
        agents: validAgents.map(a => ({
          name: a.name.trim(),
          description: a.description?.trim() || null,
          is_public: a.is_public,
        })),
        webhooks: clientFormData.webhooks
          .filter(w => w.url.trim())
          .map(w => ({
            url: w.url.trim(),
            events: w.events,
            description: w.description?.trim() || null,
          })),
      };

      const result = await adminAPI.fullSetup(payload);
      setSetupResult(result);
      setClientDialogOpen(false);
      setSetupResultDialogOpen(true);

      // Refresh users list
      const usersData = await adminAPI.getUsers(50);
      setUsers(usersData.users);
      setUsersTotal(usersData.total);

      // Refresh stats
      const statsData = await adminAPI.getStats();
      setStats(statsData);

      toast.success("Client provisioned successfully");
    } catch (error) {
      if (error.response?.status === 409) {
        setClientFormErrors({ email: "A user with this email already exists." });
      } else {
        const msg = error.response?.data?.error?.message || "Failed to provision client.";
        toast.error(msg);
      }
    } finally {
      setCreatingClient(false);
    }
  };

  // Reset client form
  const resetClientForm = () => {
    setClientFormData({
      email: "",
      password: "",
      agents: [{ name: "", description: "", is_public: false }],
      webhooks: [],
    });
    setClientFormErrors({});
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
              
              // Handle link items (like Feedback)
              if (item.isLink) {
                return (
                  <li key={item.id}>
                    <Link
                      to={item.href}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.03] transition-colors"
                      data-testid={`nav-${item.id}`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    </Link>
                  </li>
                );
              }
              
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
                        <th className="text-left py-3 px-4 text-gray-500 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr 
                          key={u.id} 
                          className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer"
                          onClick={() => navigate(`/admin/users/${u.id}`)}
                        >
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
                          <td className="py-3 px-4 text-gray-500">
                            <ChevronRight className="w-4 h-4" />
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
                {/* Filters */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Tier:</span>
                    <select
                      value={agentTierFilter || ""}
                      onChange={(e) => handleAgentFilters(e.target.value || null, agentPublicFilter)}
                      className="bg-[#0C1116] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#01696F]"
                      data-testid="agent-tier-filter"
                    >
                      <option value="">All</option>
                      <option value="Platinum">Platinum</option>
                      <option value="Gold">Gold</option>
                      <option value="Silver">Silver</option>
                      <option value="Bronze">Bronze</option>
                      <option value="Unrated">Unrated</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Visibility:</span>
                    <select
                      value={agentPublicFilter ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        handleAgentFilters(agentTierFilter, val === "" ? null : val === "true");
                      }}
                      className="bg-[#0C1116] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#01696F]"
                      data-testid="agent-public-filter"
                    >
                      <option value="">All</option>
                      <option value="true">Public</option>
                      <option value="false">Private</option>
                    </select>
                  </div>
                </div>
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
                        <th className="text-left py-3 px-4 text-gray-500 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {agents.map((a) => (
                        <tr 
                          key={a.agent_id} 
                          className="border-b border-white/[0.03] hover:bg-white/[0.02] cursor-pointer"
                          onClick={() => navigate(`/admin/agents/${a.agent_id}`)}
                          data-testid={`agent-row-${a.agent_id}`}
                        >
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
                          <td className="py-3 px-4 text-gray-500">
                            <ChevronRight className="w-4 h-4" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* API Keys Section */}
          {activeSection === "api-keys" && (
            <div data-testid="admin-api-keys">
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-gray-400">{apiKeysTotal} total API keys</p>
                {/* Status filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Filter:</span>
                  <select
                    value={apiKeyStatusFilter || ""}
                    onChange={(e) => handleApiKeyStatusFilter(e.target.value || null)}
                    className="bg-[#0C1116] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#01696F]"
                    data-testid="api-key-status-filter"
                  >
                    <option value="">All</option>
                    <option value="active">Active</option>
                    <option value="revoked">Revoked</option>
                  </select>
                </div>
              </div>
              <div className="card-surface overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">User Email</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Partial Key</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Status</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Created</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Last Used</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiKeys.map((key) => (
                        <tr key={key.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                          <td className="py-3 px-4 text-white">{key.user_email}</td>
                          <td className="py-3 px-4 font-mono text-gray-400">{key.partial_key}</td>
                          <td className="py-3 px-4">
                            {key.status === "active" ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400 font-medium">
                                <CheckCircle2 className="w-3 h-3" />
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400 font-medium">
                                <XCircle className="w-3 h-3" />
                                Revoked
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-500 text-xs">
                            {new Date(key.created_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-gray-500 text-xs">
                            {key.last_used_at 
                              ? new Date(key.last_used_at).toLocaleDateString() 
                              : <span className="text-gray-600">Never</span>
                            }
                          </td>
                        </tr>
                      ))}
                      {apiKeys.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-500">
                            No API keys found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Logs Section - Audit Logs */}
          {activeSection === "logs" && (
            <div data-testid="admin-logs">
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-gray-400">{auditLogsTotal} total audit events</p>
                {/* Event type filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Filter:</span>
                  <select
                    value={auditEventFilter || ""}
                    onChange={(e) => handleAuditEventFilter(e.target.value || null)}
                    className="bg-[#0C1116] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#01696F]"
                    data-testid="audit-event-filter"
                  >
                    <option value="">All Events</option>
                    <option value="user.signup">User Signup</option>
                    <option value="user.login">User Login</option>
                    <option value="api_key.created">API Key Created</option>
                    <option value="api_key.regenerated">API Key Regenerated</option>
                    <option value="agent.created">Agent Created</option>
                    <option value="agent.flagged">Agent Flagged</option>
                    <option value="agent.public_toggled">Agent Public Toggled</option>
                    <option value="outcome.logged">Outcome Logged</option>
                  </select>
                </div>
              </div>
              
              <div className="card-surface overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Timestamp</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Event</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Actor</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogsLoading ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center">
                            <Loader2 className="w-5 h-5 text-[#01696F] animate-spin mx-auto" />
                          </td>
                        </tr>
                      ) : auditLogs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-500">
                            No audit logs found
                          </td>
                        </tr>
                      ) : (
                        auditLogs.map((log) => (
                          <tr key={log.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                            <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              <EventTypeBadge eventType={log.event_type} />
                            </td>
                            <td className="py-3 px-4 text-white text-xs">
                              {log.actor_email || (log.actor_type === "system" ? "System" : "Unknown")}
                            </td>
                            <td className="py-3 px-4 text-gray-400 text-xs max-w-md truncate">
                              {log.description || "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Pagination */}
              {auditLogsTotal > 50 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-gray-500">
                    Page {auditLogsPage} of {Math.ceil(auditLogsTotal / 50)}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => fetchAuditLogs(auditLogsPage - 1, auditEventFilter)}
                      disabled={auditLogsPage <= 1 || auditLogsLoading}
                      className="px-3 py-1.5 text-xs text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => fetchAuditLogs(auditLogsPage + 1, auditEventFilter)}
                      disabled={auditLogsPage >= Math.ceil(auditLogsTotal / 50) || auditLogsLoading}
                      className="px-3 py-1.5 text-xs text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========== CLIENTS SECTION ========== */}
          {activeSection === "clients" && (
            <div data-testid="admin-clients">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white font-['Space_Grotesk']">
                    Client Management
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Provision and manage client accounts
                  </p>
                </div>
                <button
                  onClick={() => {
                    resetClientForm();
                    setClientDialogOpen(true);
                  }}
                  className="flex items-center gap-1.5 bg-[#01696F] hover:bg-[#028C94] text-white h-9 px-4 text-[13px] rounded-sm transition-colors"
                  data-testid="new-client-btn"
                >
                  <Plus className="w-4 h-4" />
                  New Client
                </button>
              </div>

              {/* Client list (users table) */}
              <div className="card-surface p-4 mb-4">
                <p className="text-xs text-gray-500 mb-3">
                  All user accounts. Clients provisioned by Kit show <code className="text-[#01696F]">kit@agentictrust.com</code> in audit logs.
                </p>
              </div>

              <div className="card-surface overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Email</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Agents</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Outcomes</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Admin</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                          <td className="py-3 px-4">
                            <span className="text-white text-xs">{u.email}</span>
                            <br />
                            <code className="text-[10px] text-gray-500">{u.id}</code>
                          </td>
                          <td className="py-3 px-4 text-gray-300 text-xs">{u.agent_count}</td>
                          <td className="py-3 px-4 text-gray-300 text-xs">{u.outcome_count}</td>
                          <td className="py-3 px-4">
                            {u.is_admin ? (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400">
                                admin
                              </span>
                            ) : (
                              <span className="text-gray-500 text-xs">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">
                            {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* New Client Dialog */}
              <Dialog open={clientDialogOpen} onOpenChange={setClientDialogOpen}>
                <DialogContent className="bg-[#0D1117] border border-white/[0.06] text-white max-w-lg max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-semibold font-['Space_Grotesk']">
                      Provision New Client
                    </DialogTitle>
                    <DialogDescription className="text-gray-400 text-sm">
                      Create a user account, API key, agents, and webhooks in one step.
                    </DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleFullSetup} className="space-y-5 mt-4">
                    {/* Email */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Client Email *</label>
                      <input
                        type="email"
                        value={clientFormData.email}
                        onChange={(e) => setClientFormData({ ...clientFormData, email: e.target.value })}
                        placeholder="client@company.com"
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#01696F]"
                        data-testid="client-email-input"
                      />
                      {clientFormErrors.email && (
                        <p className="text-red-400 text-xs mt-1">{clientFormErrors.email}</p>
                      )}
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5">Password *</label>
                      <input
                        type="text"
                        value={clientFormData.password}
                        onChange={(e) => setClientFormData({ ...clientFormData, password: e.target.value })}
                        placeholder="Minimum 8 characters"
                        className="w-full bg-white/[0.03] border border-white/[0.08] rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#01696F] font-mono text-[12px]"
                        data-testid="client-password-input"
                      />
                      {clientFormErrors.password && (
                        <p className="text-red-400 text-xs mt-1">{clientFormErrors.password}</p>
                      )}
                      <p className="text-[10px] text-gray-500 mt-1">
                        Visible for provisioning purposes. Share securely with the client.
                      </p>
                    </div>

                    {/* Agents */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-gray-400">Agents</label>
                        <button
                          type="button"
                          onClick={() => setClientFormData({
                            ...clientFormData,
                            agents: [...clientFormData.agents, { name: "", description: "", is_public: false }]
                          })}
                          className="text-[11px] text-[#01696F] hover:text-[#028C94] transition-colors"
                        >
                          + Add agent
                        </button>
                      </div>
                      {clientFormErrors.agents && (
                        <p className="text-red-400 text-xs mb-2">{clientFormErrors.agents}</p>
                      )}
                      <div className="space-y-3">
                        {clientFormData.agents.map((agent, i) => (
                          <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-gray-500">Agent {i + 1}</span>
                              {clientFormData.agents.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...clientFormData.agents];
                                    updated.splice(i, 1);
                                    setClientFormData({ ...clientFormData, agents: updated });
                                  }}
                                  className="text-[11px] text-red-400 hover:text-red-300"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                            <input
                              type="text"
                              value={agent.name}
                              onChange={(e) => {
                                const updated = [...clientFormData.agents];
                                updated[i] = { ...updated[i], name: e.target.value };
                                setClientFormData({ ...clientFormData, agents: updated });
                              }}
                              placeholder="Agent name (e.g., support-bot)"
                              className="w-full bg-white/[0.03] border border-white/[0.08] rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#01696F] mb-2"
                            />
                            <input
                              type="text"
                              value={agent.description}
                              onChange={(e) => {
                                const updated = [...clientFormData.agents];
                                updated[i] = { ...updated[i], description: e.target.value };
                                setClientFormData({ ...clientFormData, agents: updated });
                              }}
                              placeholder="Description (optional)"
                              className="w-full bg-white/[0.03] border border-white/[0.08] rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#01696F] mb-2"
                            />
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={agent.is_public}
                                onChange={(e) => {
                                  const updated = [...clientFormData.agents];
                                  updated[i] = { ...updated[i], is_public: e.target.checked };
                                  setClientFormData({ ...clientFormData, agents: updated });
                                }}
                                className="rounded-sm border-white/10"
                              />
                              <span className="text-xs text-gray-400">Public profile</span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Webhooks */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs text-gray-400">Webhooks</label>
                        <button
                          type="button"
                          onClick={() => setClientFormData({
                            ...clientFormData,
                            webhooks: [...clientFormData.webhooks, { url: "", events: ["outcome.created"], description: "" }]
                          })}
                          className="text-[11px] text-[#01696F] hover:text-[#028C94] transition-colors"
                        >
                          + Add webhook
                        </button>
                      </div>
                      <div className="space-y-3">
                        {clientFormData.webhooks.map((webhook, i) => (
                          <div key={i} className="bg-white/[0.02] border border-white/[0.06] rounded p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-gray-500">Webhook {i + 1}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...clientFormData.webhooks];
                                  updated.splice(i, 1);
                                  setClientFormData({ ...clientFormData, webhooks: updated });
                                }}
                                className="text-[11px] text-red-400 hover:text-red-300"
                              >
                                Remove
                              </button>
                            </div>
                            <input
                              type="url"
                              value={webhook.url}
                              onChange={(e) => {
                                const updated = [...clientFormData.webhooks];
                                updated[i] = { ...updated[i], url: e.target.value };
                                setClientFormData({ ...clientFormData, webhooks: updated });
                              }}
                              placeholder="https://company.com/webhook"
                              className="w-full bg-white/[0.03] border border-white/[0.08] rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#01696F]"
                            />
                          </div>
                        ))}
                        {clientFormData.webhooks.length === 0 && (
                          <p className="text-xs text-gray-500 py-2">
                            No webhooks. Click "+ Add webhook" to configure notifications.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => setClientDialogOpen(false)}
                        className="text-[#9CA3AF] hover:text-white hover:bg-white/5 h-9 px-4 text-[13px] rounded-sm transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={creatingClient}
                        className="flex items-center gap-1.5 bg-[#01696F] hover:bg-[#028C94] text-white h-9 px-4 text-[13px] rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        data-testid="provision-client-btn"
                      >
                        {creatingClient ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Provisioning...
                          </>
                        ) : (
                          "Provision Client"
                        )}
                      </button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Setup Result Dialog */}
              <Dialog open={setupResultDialogOpen} onOpenChange={setSetupResultDialogOpen}>
                <DialogContent className="bg-[#0D1117] border border-white/[0.06] text-white max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg font-semibold font-['Space_Grotesk']">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      Client Provisioned
                    </DialogTitle>
                  </DialogHeader>

                  {setupResult && (
                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="text-xs text-gray-500">Email</label>
                        <p className="text-white text-sm font-medium">{setupResult.email}</p>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500">User ID</label>
                        <p className="text-gray-300 text-xs font-mono">{setupResult.user_id}</p>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500">API Key</label>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="flex-1 bg-black/30 px-3 py-2 rounded text-xs text-[#01696F] font-mono break-all">
                            {setupResult.api_key}
                          </code>
                          <button
                            onClick={async () => {
                              await navigator.clipboard.writeText(setupResult.api_key);
                              toast.success("API key copied");
                            }}
                            className="p-2 rounded hover:bg-white/5 text-[#6B7280] hover:text-white transition-colors flex-shrink-0"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-gray-500">Agents Created</label>
                        <div className="space-y-1.5 mt-1">
                          {setupResult.agents.map((agent) => (
                            <div key={agent.agent_id} className="flex items-center gap-2">
                              <Bot className="w-3.5 h-3.5 text-[#01696F]" />
                              <span className="text-white text-sm">{agent.name}</span>
                              <code className="text-[10px] text-gray-500">{agent.agent_id}</code>
                            </div>
                          ))}
                        </div>
                      </div>

                      {setupResult.webhooks_created > 0 && (
                        <div>
                          <label className="text-xs text-gray-500">Webhooks</label>
                          <p className="text-gray-300 text-sm">{setupResult.webhooks_created} configured</p>
                        </div>
                      )}

                      <div className="bg-amber-500/10 border border-amber-500/20 rounded p-3 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-200">
                          Save the API key now. It will not be shown again.
                        </p>
                      </div>

                      <button
                        onClick={() => setSetupResultDialogOpen(false)}
                        className="w-full bg-[#01696F] hover:bg-[#028C94] text-white h-9 px-4 text-[13px] rounded-sm transition-colors"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* ========== ADMIN API SECTION ========== */}
          {activeSection === "admin-api" && (
            <div data-testid="admin-api-docs">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-white font-['Space_Grotesk']">
                  Admin API
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Programmatic access for internal tooling
                </p>
              </div>

              {/* Authentication */}
              <div className="card-surface p-5 mb-6">
                <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#01696F]" />
                  Authentication
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Admin API endpoints accept either a valid user JWT (from an admin account) or a static Admin API Key via header.
                </p>
                <div className="bg-black/30 rounded p-4 font-mono text-sm">
                  <p className="text-gray-500 mb-2"># Using Admin API Key header</p>
                  <p className="text-white">
                    <span className="text-purple-400">curl</span> -X POST <span className="text-green-400">"https://api.repledger.com/api/admin/users"</span> \
                  </p>
                  <p className="text-white pl-4">
                    -H <span className="text-amber-400">"X-Admin-API-Key: your_admin_api_key"</span> \
                  </p>
                  <p className="text-white pl-4">
                    -H <span className="text-amber-400">"Content-Type: application/json"</span> \
                  </p>
                  <p className="text-white pl-4">
                    -d <span className="text-cyan-400">'{`{"email": "client@company.com", "password": "secure123"}`}'</span>
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  The Admin API Key is set via the <code className="text-[#01696F]">ADMIN_API_KEY</code> environment variable on the backend.
                </p>
              </div>

              {/* Endpoints */}
              <div className="card-surface p-5">
                <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#01696F]" />
                  Admin Endpoints
                </h3>

                <div className="space-y-4">
                  {/* POST /admin/users */}
                  <div className="border border-white/[0.06] rounded p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">POST</span>
                      <code className="text-sm text-white">/api/admin/users</code>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">
                      Create a new user with an auto-generated API key.
                    </p>
                    <div className="bg-black/20 rounded p-3 text-xs font-mono">
                      <p className="text-gray-500 mb-1">Request body:</p>
                      <pre className="text-cyan-400">{`{
  "email": "client@company.com",
  "password": "securepassword123",
  "is_admin": false
}`}</pre>
                    </div>
                  </div>

                  {/* POST /admin/full-setup */}
                  <div className="border border-white/[0.06] rounded p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">POST</span>
                      <code className="text-sm text-white">/api/admin/full-setup</code>
                    </div>
                    <p className="text-sm text-gray-400 mb-2">
                      Create user + API key + agents + webhooks in one call.
                    </p>
                    <div className="bg-black/20 rounded p-3 text-xs font-mono">
                      <p className="text-gray-500 mb-1">Request body:</p>
                      <pre className="text-cyan-400">{`{
  "email": "client@company.com",
  "password": "securepassword123",
  "agents": [
    { "name": "support-bot", "description": "Customer support", "is_public": true }
  ],
  "webhooks": [
    { "url": "https://company.com/webhook", "events": ["outcome.created"] }
  ]
}`}</pre>
                    </div>
                  </div>

                  {/* GET /admin/lookup/user */}
                  <div className="border border-white/[0.06] rounded p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">GET</span>
                      <code className="text-sm text-white">/api/admin/lookup/user?email=...</code>
                    </div>
                    <p className="text-sm text-gray-400">
                      Look up a user by email address. Returns user ID and basic info.
                    </p>
                  </div>

                  {/* GET /admin/lookup/agent */}
                  <div className="border border-white/[0.06] rounded p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">GET</span>
                      <code className="text-sm text-white">/api/admin/lookup/agent?agent_id=...</code>
                    </div>
                    <p className="text-sm text-gray-400">
                      Look up an agent by ID or name. Returns agent details and score.
                    </p>
                  </div>

                  {/* GET /admin/stats */}
                  <div className="border border-white/[0.06] rounded p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">GET</span>
                      <code className="text-sm text-white">/api/admin/stats</code>
                    </div>
                    <p className="text-sm text-gray-400">
                      Get platform-wide statistics: total users, agents, outcomes, and recent activity.
                    </p>
                  </div>

                  {/* GET /admin/users */}
                  <div className="border border-white/[0.06] rounded p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">GET</span>
                      <code className="text-sm text-white">/api/admin/users</code>
                    </div>
                    <p className="text-sm text-gray-400">
                      List all users with pagination. Query params: <code className="text-[#01696F]">limit</code>, <code className="text-[#01696F]">skip</code>
                    </p>
                  </div>

                  {/* GET /admin/agents */}
                  <div className="border border-white/[0.06] rounded p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-500/20 text-blue-400">GET</span>
                      <code className="text-sm text-white">/api/admin/agents</code>
                    </div>
                    <p className="text-sm text-gray-400">
                      List all agents with filtering. Query params: <code className="text-[#01696F]">limit</code>, <code className="text-[#01696F]">skip</code>, <code className="text-[#01696F]">tier</code>, <code className="text-[#01696F]">is_public</code>
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/[0.06]">
                  <p className="text-xs text-gray-500">
                    For complete API documentation, visit the{" "}
                    <Link to="/docs" className="text-[#01696F] hover:text-[#028C94] transition-colors">
                      API Docs
                    </Link>
                    {" "}page.
                  </p>
                </div>
              </div>
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

// Event Type Badge Component
function EventTypeBadge({ eventType }) {
  const eventColors = {
    "user.signup": "bg-green-500/20 text-green-400",
    "user.login": "bg-blue-500/20 text-blue-400",
    "api_key.created": "bg-purple-500/20 text-purple-400",
    "api_key.regenerated": "bg-purple-500/20 text-purple-400",
    "agent.created": "bg-teal-500/20 text-teal-400",
    "agent.flagged": "bg-red-500/20 text-red-400",
    "agent.public_toggled": "bg-amber-500/20 text-amber-400",
    "outcome.logged": "bg-cyan-500/20 text-cyan-400",
  };
  
  const eventLabels = {
    "user.signup": "User Signup",
    "user.login": "User Login",
    "api_key.created": "API Key Created",
    "api_key.regenerated": "API Key Regenerated",
    "agent.created": "Agent Created",
    "agent.flagged": "Agent Flagged",
    "agent.public_toggled": "Public Toggled",
    "outcome.logged": "Outcome Logged",
  };
  
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${eventColors[eventType] || "bg-gray-500/20 text-gray-400"}`}>
      {eventLabels[eventType] || eventType}
    </span>
  );
}
