import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { adminAPI } from "../lib/api";
import { 
  Bot, 
  Shield, 
  LogOut,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Globe,
  Calendar,
  User,
  Zap,
  Flag,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Timer,
  Pencil,
  Trash2,
  X,
  Check
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

// Result icons
const resultIcons = {
  success: { icon: CheckCircle, color: "text-green-500" },
  failure: { icon: XCircle, color: "text-red-500" },
  partial: { icon: AlertCircle, color: "text-yellow-500" },
  timeout: { icon: Timer, color: "text-gray-500" },
};

export default function AdminAgentDetailPage() {
  const { agentId } = useParams();
  const { user: currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [agentData, setAgentData] = useState(null);
  const [error, setError] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    loadAgentData();
  }, [agentId]);

  const loadAgentData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await adminAPI.verifyAccess();
      const data = await adminAPI.getAgent(agentId);
      setAgentData(data);
    } catch (err) {
      console.error("Failed to load agent:", err);
      if (err.response?.status === 403) {
        setAccessDenied(true);
      } else if (err.response?.status === 401) {
        navigate("/login");
      } else if (err.response?.status === 404) {
        setError("Agent not found");
      } else {
        setError("Failed to load agent details");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const startEditing = () => {
    setEditName(agentData?.name || "");
    setEditDescription(agentData?.description || "");
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditName("");
    setEditDescription("");
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      toast.error("Agent name is required");
      return;
    }

    try {
      setActionLoading(true);
      const updatedAgent = await adminAPI.updateAgent(agentId, {
        name: editName.trim(),
        description: editDescription.trim() || null
      });
      setAgentData(updatedAgent);
      setIsEditing(false);
      toast.success("Agent updated successfully");
    } catch (err) {
      console.error("Failed to update agent:", err);
      const message = err.response?.data?.error?.message || "Failed to update agent";
      toast.error(message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAgent = async () => {
    try {
      setActionLoading(true);
      await adminAPI.deleteAgent(agentId);
      toast.success("Agent deleted successfully");
      navigate("/admin");
    } catch (err) {
      console.error("Failed to delete agent:", err);
      const message = err.response?.data?.error?.message || "Failed to delete agent";
      toast.error(message);
    } finally {
      setActionLoading(false);
      setShowDeleteDialog(false);
    }
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
          <Bot className="w-8 h-8 text-gray-500" />
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
                <Bot className="w-4 h-4" />
                Agent Details
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
              Agent Details
            </h1>
            <span className="px-2 py-0.5 rounded text-xs bg-red-500/20 text-red-400 font-medium">
              Admin View
            </span>
          </div>
        </header>

        <div className="p-8">
          {/* Agent Info Card */}
          <div className="card-surface p-6 mb-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-[#01696F]/20 flex items-center justify-center">
                  <Bot className="w-7 h-7 text-[#01696F]" />
                </div>
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full bg-[#0C1116] border border-white/10 rounded-lg px-3 py-2 text-white text-lg font-semibold focus:outline-none focus:ring-1 focus:ring-[#01696F]"
                        placeholder="Agent name"
                        data-testid="edit-agent-name"
                      />
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        className="w-full bg-[#0C1116] border border-white/10 rounded-lg px-3 py-2 text-gray-300 text-sm focus:outline-none focus:ring-1 focus:ring-[#01696F]"
                        placeholder="Description (optional)"
                        data-testid="edit-agent-description"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-[#01696F] text-white hover:bg-[#015858] transition-colors disabled:opacity-50"
                          data-testid="save-agent-edit-btn"
                        >
                          {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-700 text-gray-300 hover:bg-gray-600 transition-colors disabled:opacity-50"
                          data-testid="cancel-agent-edit-btn"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-semibold text-white font-['Space_Grotesk']">
                          {agentData?.name}
                        </h2>
                        <TierBadge tier={agentData?.tier} />
                        {agentData?.is_public && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
                            <Globe className="w-3 h-3" />
                            Public
                          </span>
                        )}
                      </div>
                      {agentData?.description && (
                        <p className="text-sm text-gray-400 mt-1">{agentData?.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2 font-mono">{agentData?.agent_id}</p>
                    </>
                  )}
                </div>
              </div>
              
              {/* Score + Actions */}
              <div className="flex items-start gap-6">
                {!isEditing && (
                  <div className="text-right">
                    <p className="text-4xl font-bold text-white font-['Space_Grotesk']">
                      {agentData?.score}
                    </p>
                    <p className="text-xs text-gray-500">RepLedger Score</p>
                  </div>
                )}
                {!isEditing && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={startEditing}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-[#01696F]/10 text-[#01696F] hover:bg-[#01696F]/20 transition-colors"
                      data-testid="edit-agent-btn"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => setShowDeleteDialog(true)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                      data-testid="delete-agent-btn"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t border-white/[0.06]">
              <div className="flex items-center gap-3 text-sm">
                <User className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-gray-500 text-xs">Owner</p>
                  <p className="text-white truncate">{agentData?.owner_email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Zap className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-gray-500 text-xs">Outcomes</p>
                  <p className="text-white">{agentData?.outcome_count}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-gray-500 text-xs">Success Rate</p>
                  <p className="text-white">{agentData?.success_rate}%</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Flag className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-gray-500 text-xs">Flags</p>
                  <p className={agentData?.flags_count > 0 ? "text-orange-400" : "text-white"}>
                    {agentData?.flags_count}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-gray-500" />
                <div>
                  <p className="text-gray-500 text-xs">Created</p>
                  <p className="text-white">
                    {new Date(agentData?.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Score Breakdown */}
          <div className="card-surface p-6 mb-8">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
              Score Breakdown
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-semibold text-green-500">{agentData?.breakdown?.success || 0}</p>
                <p className="text-xs text-gray-500">Success</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-red-500">{agentData?.breakdown?.failure || 0}</p>
                <p className="text-xs text-gray-500">Failure</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-yellow-500">{agentData?.breakdown?.partial || 0}</p>
                <p className="text-xs text-gray-500">Partial</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-gray-500">{agentData?.breakdown?.timeout || 0}</p>
                <p className="text-xs text-gray-500">Timeout</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Outcomes */}
            <section>
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
                Recent Outcomes ({agentData?.recent_outcomes?.length || 0})
              </h3>
              {agentData?.recent_outcomes?.length > 0 ? (
                <div className="card-surface overflow-hidden">
                  <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-[#0C1116]">
                        <tr className="border-b border-white/[0.06]">
                          <th className="text-left py-2.5 px-4 text-gray-500 font-medium">Result</th>
                          <th className="text-left py-2.5 px-4 text-gray-500 font-medium">Task Type</th>
                          <th className="text-left py-2.5 px-4 text-gray-500 font-medium">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agentData?.recent_outcomes?.map((outcome) => {
                          const { icon: Icon, color } = resultIcons[outcome.result] || resultIcons.timeout;
                          return (
                            <tr key={outcome.id} className="border-b border-white/[0.03]">
                              <td className="py-2.5 px-4">
                                <div className="flex items-center gap-2">
                                  <Icon className={`w-4 h-4 ${color}`} />
                                  <span className="text-white capitalize">{outcome.result}</span>
                                </div>
                              </td>
                              <td className="py-2.5 px-4 text-gray-400">{outcome.task_type}</td>
                              <td className="py-2.5 px-4 text-gray-500 text-xs">
                                {new Date(outcome.created_at).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="card-surface p-8 text-center">
                  <Zap className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400">No outcomes recorded</p>
                </div>
              )}
            </section>

            {/* Flags */}
            <section>
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">
                Flags ({agentData?.flags_count || 0})
              </h3>
              {agentData?.flags?.length > 0 ? (
                <div className="card-surface overflow-hidden">
                  <div className="max-h-[400px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-[#0C1116]">
                        <tr className="border-b border-white/[0.06]">
                          <th className="text-left py-2.5 px-4 text-gray-500 font-medium">Reason</th>
                          <th className="text-left py-2.5 px-4 text-gray-500 font-medium">Notes</th>
                          <th className="text-left py-2.5 px-4 text-gray-500 font-medium">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agentData?.flags?.map((flag) => (
                          <tr key={flag.id} className="border-b border-white/[0.03]">
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-2">
                                <Flag className="w-4 h-4 text-orange-500" />
                                <span className="text-white">{flag.reason}</span>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-gray-400 text-xs max-w-[150px] truncate">
                              {flag.notes || "—"}
                            </td>
                            <td className="py-2.5 px-4 text-gray-500 text-xs">
                              {new Date(flag.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="card-surface p-8 text-center">
                  <Flag className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400">No flags reported</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* Delete Agent Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-[#0C1116] border border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete Agent</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete <span className="text-white font-medium">{agentData?.name}</span>?
              <br /><br />
              This will permanently delete:
            </AlertDialogDescription>
            <ul className="list-disc list-inside mt-2 text-gray-500 text-sm">
              <li>{agentData?.outcome_count} outcome{agentData?.outcome_count !== 1 ? 's' : ''}</li>
              <li>{agentData?.flags_count} flag{agentData?.flags_count !== 1 ? 's' : ''}</li>
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
              onClick={handleDeleteAgent}
              disabled={actionLoading}
              className="bg-red-600 text-white hover:bg-red-700"
              data-testid="confirm-delete-agent-btn"
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Delete Agent"
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
