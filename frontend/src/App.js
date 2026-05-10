import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";

// Pages
import HomePage from "./pages/HomePage";
import DevelopersPage from "./pages/DevelopersPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import AgentDetailPage from "./pages/AgentDetailPage";
import PublicAgentPage from "./pages/PublicAgentPage";
import SettingsPage from "./pages/SettingsPage";
import AdminPage from "./pages/AdminPage";
import AdminUserDetailPage from "./pages/AdminUserDetailPage";
import AdminAgentDetailPage from "./pages/AdminAgentDetailPage";
import AdminFeedbackPage from "./pages/AdminFeedbackPage";
import PricingPage from "./pages/PricingPage";
import PlaygroundPage from "./pages/PlaygroundPage";
import ChangelogPage from "./pages/ChangelogPage";
import DocsPage from "./pages/DocsPage";
import BlogPage from "./pages/BlogPage";
import BlogPostPage from "./pages/BlogPostPage";
import NotFoundPage from "./pages/NotFoundPage";

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050709] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Public route that redirects if already logged in
function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050709] flex items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public marketing pages */}
      <Route path="/" element={<HomePage />} />
      <Route path="/developers" element={<DevelopersPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/changelog" element={<ChangelogPage />} />
      <Route path="/docs" element={<DocsPage />} />
      <Route path="/blog" element={<BlogPage />} />
      <Route path="/blog/:slug" element={<BlogPostPage />} />
      
      {/* Public agent profile */}
      <Route path="/a/:agentId" element={<PublicAgentPage />} />

      {/* Auth routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <SignupPage />
          </PublicRoute>
        }
      />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/agents/:agentId"
        element={
          <ProtectedRoute>
            <AgentDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      
      {/* Admin route (requires is_admin check in component) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPage />
          </ProtectedRoute>
        }
      />
      
      {/* Admin user detail route */}
      <Route
        path="/admin/users/:userId"
        element={
          <ProtectedRoute>
            <AdminUserDetailPage />
          </ProtectedRoute>
        }
      />
      
      {/* Admin agent detail route */}
      <Route
        path="/admin/agents/:agentId"
        element={
          <ProtectedRoute>
            <AdminAgentDetailPage />
          </ProtectedRoute>
        }
      />
      
      {/* Admin feedback route */}
      <Route
        path="/admin/feedback"
        element={
          <ProtectedRoute>
            <AdminFeedbackPage />
          </ProtectedRoute>
        }
      />

      {/* Playground route (public with sandbox mode) */}
      <Route path="/playground" element={<PlaygroundPage />} />

      {/* Catch all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#050709]">
          <AppRoutes />
          
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#0C1116",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                color: "#F9FAFB",
              },
            }}
          />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
