import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { adminAPI } from "../lib/api";
import { 
  Users, 
  Bot, 
  Shield, 
  LogOut,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Globe,
  Calendar,
  Mail,
  Zap,
  ShieldCheck,
  ShieldOff,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";

export default function AdminUserDetailPage() {
  const { userId } = useParams();
  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadUserData();
  }, [userId]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Verify admin access first
      await adminAPI.verifyAccess();
      
      // Load user details
      const data = await adminAPI.getUser(userId);
      setUserData(data);
    } catch (err) {
      console.error("Failed to load user:", err);
      if (err.response?.status === 403) {
        setAccessDenied(true);
      } else if (err.response?.status === 401) {
        navigate("/login");
      } else if (err.response?.status === 404) {
        setError("User not found");
      } else {
        setError("Failed to load user details");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleToggleAdmin = async () => {
    try {
      setActionLoading(true);
      const updatedUser = await adminAPI.toggleUserRole(userId, !userData.is_admin);
      setUserData(prev => ({ ...prev, is_admin: updatedUser.is_admin }));
      toast.success(updatedUser.is_admin ? "User promoted to admin" : "Admin privileges removed");
    } catch (err) {
      console.error("Failed to toggle admin status:", err);
      const message = err.response?.data?.error?.message || "Failed to update user role";
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    try {
      setActionLoading(true);
      await adminAPI.deleteUser(userId);
      toast.success("User deleted successfully");
      navigate("/admin");
    } catch (err) {
      console.error("Failed to delete user:", err);
      const message = err.response?.data?.error?.message || "Failed to delete user";
      toast.error(message);
    } finally {
      setActionLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const isSelf = currentUser?.id === userId;

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
          You do not have admin privileges.
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

  if (error) {
    return (
      <div className="min-h-screen bg-[#050709] flex flex-col items-center justify-center px-6">
        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-6">
          <Users className="w-8 h-8 text-gray-500" />
        </div>
        <h1 className="text-2xl font-semibold text-white mb-2 font-['Space_Grotesk']">
          {error}
        </h1>
        <Link 
          to="/admin"
          className="mt-6 px-6 py-2.5 bg-[#01696F] hover:bg-[#015858] text-white font-medium rounded-lg transition-colors"
        >
          Back to Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050709] flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-[#1F2933]/50 flex flex-col">
        <div className="p-6 border-b border-[#1F2933]/50">
          <Link to="/admin" className="flex items-center gap-3">
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

        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            <li>
              <Link
                to="/admin"
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.03] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Overview
              </Link>
            </li>
            <li className="pt-4">
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-[#01696F]/15 text-[#01696F]">
                <Users className="w-4 h-4" />
                User Details
              </div>
            </li>
          </ul>
        </nav>

        <div className="p-4 border-t border-[#1F2933]/50">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-[#01696F]/20 flex items-center justify-center">
              <span className="text-[#01696F] text-sm font-medium">
                {currentUser?.email?.[0]?.toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{currentUser?.email}</p>
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
        <header className="sticky top-0 z-10 bg-[#050709]/95 backdrop-blur-sm border-b border-[#1F2933]/50 px-8 py-4">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-xl font-semibold text-white font-['Space_Grotesk']">
              User Details
            </h1>
          </div>
        </header>

        <div className="p-8">
          {/* User Info Card */}
          <div className="card-surface p-6 mb-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#01696F]/20 flex items-center justify-center">
                  <span className="text-[#01696F] text-xl font-semibold">
                    {userData?.email?.[0]?.toUpperCase()}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white font-['Space_Grotesk']">
                    {userData?.email}
                  </h2>
                  <div className="flex items-center gap-3 mt-1">
                    {userData?.is_admin ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400 font-medium">
                        Admin
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-gray-500/20 text-gray-400">
                        User
                      </span>
                    )}
                    <span className="text-xs text-gray-500">ID: {userData?.id?.slice(0, 8)}...</span>
                  </div>
                </div>
              </div>
              
              {/* Action Buttons */}
              {!isSelf && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleToggleAdmin}
                    disabled={actionLoading}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      userData?.is_admin
                        ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                        : "bg-[#01696F]/10 text-[#01696F] hover:bg-[#01696F]/20"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    data-testid="toggle-admin-btn"
                  >
                    {userData?.is_admin ? (
                      <>
                        <ShieldOff className="w-4 h-4" />
                        Remove Admin
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Make Admin
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="delete-user-btn"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete User
                  </button>
                </div>
              )}
              {isSelf && (
                <span className="text-xs text-gray-500 px-3 py-1.5 rounded-lg bg-gray-800">
                  This is your account
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-gray-500 text-xs">Created</p>
                  <p className="text-white">
                    {new Date(userData?.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Bot className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-gray-500 text-xs">Agents</p>
                  <p className="text-white">{userData?.agent_count}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Zap className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-gray-500 text-xs">Outcomes</p>
                  <p className="text-white">{userData?.outcome_count}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-gray-500 text-xs">Email</p>
                  <p className="text-white truncate">{userData?.email}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Agents Table */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                User's Agents ({userData?.agents?.length || 0})
              </h3>
            </div>

            {userData?.agents?.length > 0 ? (
              <div className="card-surface overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Name</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Agent ID</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Score</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Tier</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Outcomes</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Public</th>
                        <th className="text-left py-3 px-4 text-gray-500 font-medium">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userData?.agents?.map((agent) => (
                        <tr key={agent.agent_id} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                          <td className="py-3 px-4">
                            <div>
                              <p className="text-white font-medium">{agent.name}</p>
                              {agent.description && (
                                <p className="text-gray-500 text-xs truncate max-w-[200px]">
                                  {agent.description}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-400 font-mono text-xs">
                            {agent.agent_id}
                          </td>
                          <td className="py-3 px-4 text-white font-mono">{agent.score}</td>
                          <td className="py-3 px-4">
                            <TierBadge tier={agent.tier} />
                          </td>
                          <td className="py-3 px-4 text-gray-400">{agent.outcome_count}</td>
                          <td className="py-3 px-4">
                            {agent.is_public ? (
                              <Globe className="w-4 h-4 text-green-500" />
                            ) : (
                              <span className="text-gray-600">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-500 text-xs">
                            {new Date(agent.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="card-surface p-12 text-center">
                <Bot className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">This user has no agents yet.</p>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#0C1116] border border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete User</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete <span className="text-white font-medium">{userData?.email}</span>?
              <br /><br />
              This will permanently delete:
            </AlertDialogDescription>
            <ul className="list-disc list-inside mt-2 text-gray-500 text-sm">
              <li>The user account</li>
              <li>{userData?.agent_count} agent{userData?.agent_count !== 1 ? 's' : ''}</li>
              <li>{userData?.outcome_count} outcome{userData?.outcome_count !== 1 ? 's' : ''}</li>
              <li>All associated flags and webhooks</li>
            </ul>
            <p className="text-red-400 text-sm mt-4">This action cannot be undone.</p>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-transparent border-white/10 text-gray-400 hover:bg-white/5 hover:text-white"
              disabled={actionLoading}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={actionLoading}
              className="bg-red-600 text-white hover:bg-red-700"
              data-testid="confirm-delete-user-btn"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Delete User"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

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
