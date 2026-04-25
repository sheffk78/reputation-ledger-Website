import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { adminAPI } from "../lib/api";
import { 
  MessageSquare, 
  Shield, 
  LogOut,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  Calendar,
  Mail,
  X
} from "lucide-react";

export default function AdminFeedbackPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [feedback, setFeedback] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const limit = 20;

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (!accessDenied && !loading) {
      loadFeedback();
    }
  }, [page]);

  const checkAdminAccess = async () => {
    try {
      await adminAPI.verifyAccess();
      await loadFeedback();
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

  const loadFeedback = async () => {
    try {
      const data = await adminAPI.getFeedback(page, limit);
      setFeedback(data.feedback);
      setTotal(data.total);
    } catch (error) {
      console.error("Failed to load feedback:", error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const totalPages = Math.ceil(total / limit);

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
                <MessageSquare className="w-4 h-4" />
                User Feedback
              </div>
            </li>
          </ul>
        </nav>

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
              User Feedback
            </h1>
          </div>
        </header>

        <div className="p-8">
          {/* Stats */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-gray-400">{total} feedback submissions</p>
          </div>

          {/* Feedback Table */}
          <div className="card-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-3 px-4 text-gray-500 font-medium w-40">Date</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium w-56">User</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Message</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {feedback.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center">
                        <MessageSquare className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                        <p className="text-gray-500">No feedback yet</p>
                      </td>
                    </tr>
                  ) : (
                    feedback.map((item) => (
                      <tr 
                        key={item.id} 
                        className="border-b border-white/[0.03] hover:bg-white/[0.02]"
                      >
                        <td className="py-3 px-4 text-gray-400 text-xs whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-gray-600" />
                            {new Date(item.created_at).toLocaleString()}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-gray-600" />
                            <span className="text-white text-xs">
                              {item.email_override || item.user_email}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-gray-300 text-xs">
                          <p className="truncate max-w-md">
                            {item.message}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => setSelectedFeedback(item)}
                            className="text-xs text-[#01696F] hover:text-[#018080] transition-colors"
                            data-testid={`view-feedback-${item.id}`}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-xs text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Feedback Detail Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedFeedback(null)}
          />
          <div className="relative bg-[#0C1116] border border-white/10 rounded-sm w-full max-w-lg mx-4 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <h3 className="text-lg font-semibold text-white font-['Space_Grotesk']">
                Feedback Details
              </h3>
              <button
                onClick={() => setSelectedFeedback(null)}
                className="p-1.5 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/[0.05]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">From</p>
                <p className="text-white">
                  {selectedFeedback.email_override || selectedFeedback.user_email}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Submitted</p>
                <p className="text-gray-300 text-sm">
                  {new Date(selectedFeedback.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Message</p>
                <div className="bg-[#050709] border border-white/[0.06] rounded-lg p-4 max-h-64 overflow-y-auto">
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">
                    {selectedFeedback.message}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
