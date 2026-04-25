import { useState } from "react";
import { MessageSquare, X, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function FeedbackModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) {
      toast.error("Please enter your feedback");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      
      await axios.post(
        `${API_URL}/api/feedback`,
        {
          message: message.trim(),
          email: email !== user?.email ? email : undefined
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      toast.success("Thanks — your feedback was sent.");
      setMessage("");
      setEmail(user?.email || "");
      onClose();
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      toast.error("Failed to send feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#0C1116] border border-white/10 rounded-sm w-full max-w-md mx-4 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#01696F]/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-[#01696F]" />
            </div>
            <h2 className="text-lg font-semibold text-white font-['Space_Grotesk']">
              Share feedback
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/[0.05]"
            data-testid="close-feedback-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">
              What's working? What's confusing?
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what you think..."
              rows={5}
              className="w-full bg-[#050709] border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#01696F] resize-none"
              data-testid="feedback-message"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">
              Email <span className="text-gray-600">(optional)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full bg-[#050709] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-[#01696F]"
              data-testid="feedback-email"
            />
            <p className="text-xs text-gray-600 mt-1">
              We'll use this if we need to follow up
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !message.trim()}
            className="w-full py-2.5 bg-[#01696F] hover:bg-[#015858] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            data-testid="submit-feedback-btn"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send feedback"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
