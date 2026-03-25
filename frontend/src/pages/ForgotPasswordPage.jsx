import React, { useState } from "react";
import { Link } from "react-router-dom";
import { authAPI } from "../lib/api";
import { ArrowLeft, Mail, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_ac636d4a-6ca2-497e-8615-5b0c10a94a77/artifacts/vcawrcg8_repledger-logo-dark.svg";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await authAPI.requestPasswordReset(email);
      setSubmitted(true);
    } catch (error) {
      // Don't reveal if email exists or not for security
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#050709] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-[#01696F]/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-6 h-6 text-[#01696F]" />
          </div>
          <h1 className="text-xl font-semibold text-white mb-3">Check your email</h1>
          <p className="text-[14px] text-[#9CA3AF] mb-6">
            If an account exists for <span className="text-white">{email}</span>, we've sent instructions to reset your password.
          </p>
          <p className="text-[13px] text-[#6B7280] mb-6">
            Didn't receive the email? Check your spam folder or try again.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => {
                setSubmitted(false);
                setEmail("");
              }}
              className="w-full py-2.5 text-[14px] font-medium text-[#9CA3AF] hover:text-white transition-colors"
            >
              Try another email
            </button>
            <Link
              to="/login"
              className="block w-full py-2.5 text-[14px] font-medium text-[#01696F] hover:text-[#01898F] transition-colors"
            >
              Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050709] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src={LOGO_URL} alt="RepLedger" className="h-8 mx-auto mb-6" />
          <h1 className="text-xl font-semibold text-white mb-2">Reset your password</h1>
          <p className="text-[14px] text-[#9CA3AF]">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-[13px] font-medium text-[#9CA3AF] mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                data-testid="forgot-password-email"
                className="w-full h-11 pl-10 pr-4 text-[14px] bg-[#0C1116] border border-white/[0.08] rounded-md text-white placeholder-[#4B5563] focus:outline-none focus:ring-1 focus:ring-[#01696F] focus:border-[#01696F] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            data-testid="forgot-password-submit"
            className="w-full h-11 flex items-center justify-center gap-2 bg-[#01696F] hover:bg-[#017A7A] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[14px] font-medium rounded-md transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send reset link"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
