/**
 * Minimal client-side event tracking for analytics
 * Events are stored in the backend for later analysis
 */

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Event names enum
export const EventNames = {
  DASHBOARD_LOADED: "dashboard.loaded",
  AGENT_CREATED: "agent.created",
  QUICKSTART_OPENED: "quickstart.opened",
  BADGE_COPIED: "badge.copied",
  FEEDBACK_OPENED: "feedback.opened",
  FEEDBACK_SUBMITTED: "feedback.submitted",
  AGENT_VIEWED: "agent.viewed",
  PUBLIC_PROFILE_VIEWED: "public_profile.viewed",
};

/**
 * Track a client-side event
 * @param {string} eventName - The event name from EventNames
 * @param {object} context - Optional context data
 */
export async function trackEvent(eventName, context = {}) {
  try {
    const token = localStorage.getItem("token");
    
    // Only track if user is logged in
    if (!token) return;

    await fetch(`${API_URL}/api/client-events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        event_name: eventName,
        context,
      }),
    });
  } catch (error) {
    // Silently fail - analytics should never break the app
    console.debug("Event tracking failed:", error);
  }
}

export default trackEvent;
