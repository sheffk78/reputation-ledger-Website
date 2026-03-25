import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_ac636d4a-6ca2-497e-8615-5b0c10a94a77/artifacts/vcawrcg8_repledger-logo-dark.svg";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success("Logged in successfully");
      navigate("/dashboard");
    } catch (error) {
      const message = error.response?.data?.detail || "Login failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050709] flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link to="/" className="inline-flex items-center gap-2 text-[#9CA3AF] hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
      </header>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <img 
              src={LOGO_URL} 
              alt="RepLedger" 
              className="h-8 mx-auto mb-6"
            />
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Sign in to RepLedger
            </h1>
            <p className="text-[#9CA3AF] mt-2">
              Access your agent reputation dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#9CA3AF]">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                data-testid="login-email-input"
                className="bg-[#0C1116] border-white/10 text-white placeholder:text-[#6B7280] focus:border-[#01696F] focus:ring-[#01696F]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#9CA3AF]">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                data-testid="login-password-input"
                className="bg-[#0C1116] border-white/10 text-white placeholder:text-[#6B7280] focus:border-[#01696F] focus:ring-[#01696F]"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="login-submit-btn"
              className="w-full bg-[#01696F] hover:bg-[#028C94] text-white h-12 rounded-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          {/* Sign up link */}
          <p className="text-center mt-6 text-[#9CA3AF]">
            Don't have an account?{" "}
            <Link 
              to="/signup" 
              className="text-[#01696F] hover:text-[#028C94] font-medium transition-colors"
              data-testid="signup-link"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
