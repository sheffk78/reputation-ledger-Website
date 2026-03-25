import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authAPI } from "../lib/api";
import { Lock, Loader2, CheckCircle, AlertCircle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_ac636d4a-6ca2-497e-8615-5b0c10a94a77/artifacts/vcawrcg8_repledger-logo-dark.svg";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError("Missing reset token. Please use the link from your email.");
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authAPI.confirmPasswordReset(token, password);
      setSuccess(true);
    } catch (err) {
      const errorMessage = err.response?.data?.error?.message || "Failed to reset password. The link may be expired.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-[#050709] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-6 h-6 text-green-500" />
          </div>
          <h1 className="text-xl font-semibold text-white mb-3">Password reset successful</h1>
          <p className="text-[14px] text-[#9CA3AF] mb-6">
            Your password has been updated. You can now sign in with your new password.
          </p>
          <Link
            to="/login"
            data-testid="go-to-login"
            className="inline-flex items-center justify-center w-full h-11 bg-[#01696F] hover:bg-[#017A7A] text-white text-[14px] font-medium rounded-md transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  // Error state (no token)
  if (error && !token) {
    return (
      <div className="min-h-screen bg-[#050709] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <h1 className="text-xl font-semibold text-white mb-3">Invalid reset link</h1>
          <p className="text-[14px] text-[#9CA3AF] mb-6">
            {error}
          </p>
          <Link
            to="/forgot-password"
            className="inline-flex items-center justify-center w-full h-11 bg-[#01696F] hover:bg-[#017A7A] text-white text-[14px] font-medium rounded-md transition-colors"
          >
            Request new reset link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050709] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src={LOGO_URL} alt="RepLedger" className="h-8 mx-auto mb-6" />
          <h1 className="text-xl font-semibold text-white mb-2">Create new password</h1>
          <p className="text-[14px] text-[#9CA3AF]">
            Enter your new password below.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-md">
            <p className="text-[13px] text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-[13px] font-medium text-[#9CA3AF] mb-1.5">
              New Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
                minLength={6}
                data-testid="reset-password-input"
                className="w-full h-11 pl-10 pr-10 text-[14px] bg-[#0C1116] border border-white/[0.08] rounded-md text-white placeholder-[#4B5563] focus:outline-none focus:ring-1 focus:ring-[#01696F] focus:border-[#01696F] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-[13px] font-medium text-[#9CA3AF] mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" />
              <input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                required
                minLength={6}
                data-testid="reset-password-confirm"
                className="w-full h-11 pl-10 pr-4 text-[14px] bg-[#0C1116] border border-white/[0.08] rounded-md text-white placeholder-[#4B5563] focus:outline-none focus:ring-1 focus:ring-[#01696F] focus:border-[#01696F] transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            data-testid="reset-password-submit"
            className="w-full h-11 flex items-center justify-center gap-2 bg-[#01696F] hover:bg-[#017A7A] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[14px] font-medium rounded-md transition-colors"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Resetting...
              </>
            ) : (
              "Reset password"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-[13px] text-[#6B7280] hover:text-white transition-colors"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
