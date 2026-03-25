import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { parseApiError, validateEmail, validatePassword, validateRequired } from "../lib/utils";

const LOGO_URL = "https://customer-assets.emergentagent.com/job_ac636d4a-6ca2-497e-8615-5b0c10a94a77/artifacts/vcawrcg8_repledger-logo-dark.svg";

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

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const { signup } = useAuth();
  const navigate = useNavigate();

  const validateField = (field, value) => {
    switch (field) {
      case "email":
        return validateEmail(value);
      case "password":
        return validatePassword(value, 6);
      case "confirmPassword":
        if (!value) return "Please confirm your password.";
        if (value !== password) return "Passwords do not match.";
        return null;
      default:
        return null;
    }
  };

  const handleBlur = (field) => {
    setTouched({ ...touched, [field]: true });
    const value = field === "email" ? email : field === "password" ? password : confirmPassword;
    const error = validateField(field, value);
    setErrors({ ...errors, [field]: error });
  };

  const handleChange = (field, value) => {
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
    
    switch (field) {
      case "email":
        setEmail(value);
        break;
      case "password":
        setPassword(value);
        // Re-validate confirmPassword if it was touched
        if (touched.confirmPassword && confirmPassword) {
          const confirmError = value !== confirmPassword ? "Passwords do not match." : null;
          setErrors(prev => ({ ...prev, confirmPassword: confirmError }));
        }
        break;
      case "confirmPassword":
        setConfirmPassword(value);
        break;
      default:
        break;
    }
  };

  const validateForm = () => {
    const newErrors = {
      email: validateEmail(email),
      password: validatePassword(password, 6),
      confirmPassword: !confirmPassword 
        ? "Please confirm your password." 
        : confirmPassword !== password 
          ? "Passwords do not match." 
          : null
    };
    
    setErrors(newErrors);
    setTouched({ email: true, password: true, confirmPassword: true });
    
    return !Object.values(newErrors).some(Boolean);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await signup(email, password);
      navigate("/dashboard");
    } catch (error) {
      const parsed = parseApiError(error);
      
      // Set field-specific errors if available
      if (parsed.fields && Object.keys(parsed.fields).length > 0) {
        setErrors(prev => ({ ...prev, ...parsed.fields }));
      } else {
        // Show general error message
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
              Create your account
            </h1>
            <p className="text-[13px] text-[#6B7280] mt-2">
              Start building your agents' track record
            </p>
          </div>

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
                data-testid="signup-email-input"
                className={`form-input ${errors.email && touched.email ? "border-red-400 focus:border-red-400" : ""}`}
                aria-invalid={errors.email && touched.email ? "true" : "false"}
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              <FieldError message={touched.email && errors.email} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password" className="form-label">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => handleChange("password", e.target.value)}
                onBlur={() => handleBlur("password")}
                placeholder="At least 6 characters"
                data-testid="signup-password-input"
                className={`form-input ${errors.password && touched.password ? "border-red-400 focus:border-red-400" : ""}`}
                aria-invalid={errors.password && touched.password ? "true" : "false"}
              />
              <FieldError message={touched.password && errors.password} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="confirmPassword" className="form-label">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                onBlur={() => handleBlur("confirmPassword")}
                placeholder="Repeat your password"
                data-testid="signup-confirm-password-input"
                className={`form-input ${errors.confirmPassword && touched.confirmPassword ? "border-red-400 focus:border-red-400" : ""}`}
                aria-invalid={errors.confirmPassword && touched.confirmPassword ? "true" : "false"}
              />
              <FieldError message={touched.confirmPassword && errors.confirmPassword} />
            </div>

            <Button
              type="submit"
              disabled={loading}
              data-testid="signup-submit-btn"
              className="w-full bg-[#01696F] hover:bg-[#028C94] text-white h-11 text-[13px] font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
              )}
            </Button>
          </form>

          {/* Login link */}
          <p className="text-center mt-8 text-[13px] text-[#6B7280]">
            Already have an account?{" "}
            <Link 
              to="/login" 
              className="text-[#01696F] hover:text-[#028C94] font-medium"
              data-testid="login-link"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
