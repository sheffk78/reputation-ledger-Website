import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { settingsAPI } from "../lib/api";
import { ArrowLeft, LogOut, Bell, Mail, Loader2, Check, Building2, Link2 } from "lucide-react";
import { toast } from "sonner";
import { OrganizationLinkForm } from "../components/CrossToolComponents";

const LOGO_URL = "/repledger-logo-dark.svg";

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    email_outcome_notifications: true,
    email_flag_notifications: true,
    email_weekly_summary: false,
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const data = await settingsAPI.getNotificationPreferences();
      setPreferences(data.preferences);
    } catch (error) {
      console.error("Failed to load preferences:", error);
      toast.error("Failed to load notification preferences");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key) => {
    const newPreferences = {
      ...preferences,
      [key]: !preferences[key],
    };
    
    setPreferences(newPreferences);
    setSaving(true);
    
    try {
      await settingsAPI.updateNotificationPreferences(newPreferences);
      toast.success("Preferences saved");
    } catch (error) {
      console.error("Failed to save preferences:", error);
      toast.error("Failed to save preferences");
      // Revert on error
      setPreferences(preferences);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050709] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#01696F] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050709]">
      {/* Header */}
      <header className="h-14 border-b border-white/[0.08] bg-[#050709]">
        <div className="container-app flex items-center justify-between h-full">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="RepLedger" className="h-6" />
            <span className="text-[11px] font-medium text-[#01696F] uppercase tracking-wider">Settings</span>
          </div>
          
          <div className="flex items-center gap-5">
            <span className="text-[13px] text-[#6B7280]">{user?.email}</span>
            <button
              onClick={handleLogout}
              data-testid="logout-btn"
              className="flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="container-app py-8">
        <div className="max-w-2xl space-y-8">
          {/* Back link */}
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1.5 text-[13px] text-[#6B7280] hover:text-white transition-colors"
            data-testid="back-to-dashboard"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to dashboard
          </Link>

          {/* Page title */}
          <div>
            <h1 className="text-[20px] font-semibold text-white tracking-tight">Settings</h1>
            <p className="text-[13px] text-[#6B7280] mt-1">Manage your notification preferences</p>
          </div>

          {/* Notification Preferences Card */}
          <div className="card-surface p-6" data-testid="notification-settings">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-sm bg-[#01696F]/15 flex items-center justify-center">
                <Bell className="w-4 h-4 text-[#01696F]" />
              </div>
              <div>
                <h2 className="text-[14px] font-semibold text-white">Email Notifications</h2>
                <p className="text-[12px] text-[#6B7280]">Configure when you receive email notifications</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Outcome Notifications */}
              <ToggleRow
                title="Outcome Notifications"
                description="Receive an email when new outcomes are recorded for your agents"
                enabled={preferences.email_outcome_notifications}
                onChange={() => handleToggle("email_outcome_notifications")}
                disabled={saving}
                testId="toggle-outcome-notifications"
              />

              {/* Flag Notifications */}
              <ToggleRow
                title="Flag Notifications"
                description="Receive an email when flags are created on your agents or outcomes"
                enabled={preferences.email_flag_notifications}
                onChange={() => handleToggle("email_flag_notifications")}
                disabled={saving}
                testId="toggle-flag-notifications"
              />

              {/* Weekly Summary */}
              <ToggleRow
                title="Weekly Summary"
                description="Receive a weekly email summary of your agents' performance"
                enabled={preferences.email_weekly_summary}
                onChange={() => handleToggle("email_weekly_summary")}
                disabled={saving}
                testId="toggle-weekly-summary"
              />
            </div>
          </div>

          {/* Email Address Info */}
          <div className="card-surface p-5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-sm bg-[#1F2933] flex items-center justify-center">
                <Mail className="w-4 h-4 text-[#6B7280]" />
              </div>
              <div className="flex-1">
                <p className="text-[13px] text-[#9CA3AF]">
                  Notifications will be sent to:
                </p>
                <p className="text-[13px] text-white font-medium">{user?.email}</p>
              </div>
            </div>
          </div>
          
          {/* Organization Section */}
          <OrganizationLinkForm 
            user={user} 
            onLink={async (linkToken) => {
              // Call the org link API
              const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/v1/org/link`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ link_token: linkToken })
              });
              
              if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Failed to link organization');
              }
              
              const data = await response.json();
              toast.success(`Linked to ${data.organization_id}! ${data.agents_updated} agents updated.`);
              
              // Reload the page to reflect the new org
              window.location.reload();
            }} 
          />
        </div>
      </main>
    </div>
  );
}

// Toggle Row Component
function ToggleRow({ title, description, enabled, onChange, disabled, testId }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0 last:pb-0 first:pt-0">
      <div className="flex-1 pr-4">
        <p className="text-[13px] font-medium text-white">{title}</p>
        <p className="text-[12px] text-[#6B7280] mt-0.5">{description}</p>
      </div>
      <button
        onClick={onChange}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#01696F] focus:ring-offset-2 focus:ring-offset-[#0C1116] disabled:opacity-50 ${
          enabled ? "bg-[#01696F]" : "bg-[#1F2933]"
        }`}
        data-testid={testId}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
