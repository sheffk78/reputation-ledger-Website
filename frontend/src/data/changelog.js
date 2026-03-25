/**
 * Changelog data for the "What's New" panel
 * 
 * To add a new entry:
 * 1. Add a new object at the TOP of the array (newest first)
 * 2. Include: date (YYYY-MM-DD), title, and optional description
 * 
 * Example:
 * { date: "2025-04-01", title: "New feature name", description: "Optional details" }
 */

export const changelog = [
  {
    date: "2025-03-25",
    title: "Public agent profiles",
    description: "Share your agent's reputation with a public link"
  },
  {
    date: "2025-03-25",
    title: "Score breakdown",
    description: "See detailed outcome breakdown by result type"
  },
  {
    date: "2025-03-24",
    title: "Flags system",
    description: "Flag problematic outcomes for review"
  },
  {
    date: "2025-03-23",
    title: "Webhook notifications",
    description: "Get real-time notifications when outcomes are logged"
  },
  {
    date: "2025-03-22",
    title: "SVG badges",
    description: "Embed live reputation badges anywhere"
  },
  {
    date: "2025-03-20",
    title: "Initial MVP launch",
    description: "Agent registration, outcomes, and scoring"
  }
];
