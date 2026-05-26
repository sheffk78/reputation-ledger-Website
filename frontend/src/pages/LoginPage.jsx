import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { parseApiError, validateEmail, validateRequired } from "../lib/utils";

const LOGO_URL = "/repledger-logo-dark.svg";

// Inline error message component
function FieldError({ message }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1.5 text-[12px] text-red-400 mt-1.5" role="alert">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      {message}
    </p>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [generalError, setGeneralError] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleBlur = (field) => {
    setTouched({ ...touched, [field]: true });
    let error = null;
    if (field === "email") {
      error = validateEmail(email);
    } else if (field === "password") {
      error = validateRequired(password, "Password");
    }
    setErrors({ ...errors, [field]: error });
  };

  const handleChange = (field, value) => {
    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
    if (generalError) {
      setGeneralError(null);
    }
    
    if (field === "email") {
      setEmail(value);
    } else if (field === "password") {
      setPassword(value);
    }
  };

  const validateForm = () => {
    const newErrors = {
      email: validateEmail(email),
      password: validateRequired(password, "Password")
    };
    
    setErrors(newErrors);
    setTouched({ email: true, password: true });
    
    return !Object.values(newErrors).some(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGeneralError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (error) {
      const parsed = parseApiError(error);
      
      // Set field-specific errors if available
      if (parsed.fields && Object.keys(parsed.fields).length > 0) {
        setErrors(prev => ({ ...prev, ...parsed.fields }));
      } else if (parsed.code === "INVALID_CREDENTIALS") {
        // Show inline for credentials error
        setGeneralError(parsed.message);
      } else {
        // Show toast for other errors
        toast.error(parsed.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050709] flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-10">
            <img 
              src={LOGO_URL} 
              alt="RepLedger" 
              className="h-7 mx-auto mb-8"
            />
            <h1 className="text-[18px] font-semibold text-white tracking-tight">
              Sign in to RepLedger
            </h1>
            <p className="text-[13px] text-[#6B7280] mt-2">
              Access your agent reputation dashboard
            </p>
          </div>

          {/* General Error Alert */}
          {generalError && (
            <div 
              className="mb-5 p-3 bg-red-400/10 border border-red-400/20 rounded-md flex items-start gap-2"
              role="alert"
              data-testid="login-error-alert"
            >
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-[13px] text-red-400">{generalError}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-1">
              <Label htmlFor="email" className="form-label">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => handleChange("email", e.target.value)}
                onBlur={() => handleBlur("email")}
                placeholder="you@example.com"
                data-testid="login-email-input"
                className={`form-input ${errors.email && touched.email ? "border-red-400 focus:border-red-400" : ""}`}
                aria-invalid={errors.email && touched.email ? "true" : "false"}
              />
              <FieldError message={touched.email && errors.email} />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="form-label">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-[12px] text-[#6B7280] hover:text-[#01696F] transition-colors"
                  data-testid="forgot-password-link"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => handleChange("password", e.target.value)}
                onBlur={() => handleBlur("password")}
                placeholder="Enter your password"
                data-testid="login-password-input"
                className={`form-input ${errors.password && touched.password ? "border-red-400 focus:border-red-400" : ""}`}
                aria-invalid={errors.password && touched.password ? "true" : "false"}
              />
              <FieldError message={touched.password && errors.password} />
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="login-submit-btn"
              className="w-full bg-[#01696F] hover:bg-[#028C94] text-white h-11 text-[13px] font-medium"
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
          <p className="text-center mt-8 text-[13px] text-[#6B7280]">
            Don't have an account?{" "}
            <Link 
              to="/signup" 
              className="text-[#01696F] hover:text-[#028C94] font-medium"
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
