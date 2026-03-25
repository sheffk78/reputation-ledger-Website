# RepLedger MVP - Product Requirements Document

## Original Problem Statement
Build a Phase 1 MVP of Agent Reputation Ledger (RepLedger) - a track record API for autonomous agents with:
- Marketing homepage explaining RepLedger
- User auth (JWT email+password)
- Dashboard with API key management
- Agent registration and management
- Outcome submission via API
- Scoring with trust tiers (Unrated, Bronze, Silver, Gold, Platinum)
- Embeddable SVG badges

## User Personas
1. **Independent Agent Builders** - Build on OpenClaw, n8n, CrewAI; need to prove agent reliability
2. **Agent Marketplaces & Platforms** - Need verifiable reputation signals for agent listings
3. **Enterprise Teams** - Need compliance-grade audit trails for agent activity

## Core Requirements (Static)
- Simple email/password JWT authentication
- API key per user (one active key)
- Agent registration with name, description, owner_handle
- Outcome submission: success, failure, partial, timeout
- Score calculation: (successful_outcomes / total_outcomes) * 100
- Trust tiers based on score and outcome count
- Public SVG badge endpoint

## What's Been Implemented (Phase 1 - March 2025)

### Backend (FastAPI)
- ✅ User signup/login with JWT authentication
- ✅ API key generation and regeneration
- ✅ POST /api/v1/agents - Register agent
- ✅ GET /api/v1/agents - List user's agents
- ✅ GET /api/v1/agents/{agent_id} - Get agent details
- ✅ POST /api/v1/agents/{agent_id}/outcomes - Submit outcome
- ✅ GET /api/v1/agents/{agent_id}/outcomes - List outcomes with pagination
- ✅ GET /api/v1/agents/{agent_id}/score - Get score and tier
- ✅ GET /api/v1/agents/{agent_id}/badge.svg - Public SVG badge

### Frontend (React)
- ✅ Marketing homepage with hero, how it works, use cases
- ✅ Login/Signup pages
- ✅ Dashboard with stats overview
- ✅ API key display with copy/regenerate
- ✅ Agents list with create dialog
- ✅ Agent detail page with outcomes table
- ✅ Badge preview and embed code
- ✅ Documentation/quickstart page

### Scoring Logic
- Score = (successful / total) * 100
- Tiers:
  - Unrated: < 5 outcomes
  - Bronze: score < 50 (5+ outcomes)
  - Silver: 50-74
  - Gold: 75-89
  - Platinum: 90+ (50+ outcomes)

## Prioritized Backlog

### P0 (Critical - Not in Phase 1)
- None remaining

### P1 (High Priority - Phase 2)
- Password reset flow (email integration)
- Webhooks for outcome events
- Agent deletion
- Outcome filtering in UI

### P2 (Medium Priority)
- Flags/incident system
- AAV (Agent Authority Vault) integration
- Safe-Spend integration
- Multi-tenant organizations/teams
- GitHub/domain identity verification
- Score breakdown by dimension

### P3 (Low Priority)
- Public agent profiles
- Agent comparison tools
- Leaderboards
- Advanced analytics dashboard

## Next Tasks
1. Add email service integration for password reset
2. Implement outcome pagination in the UI
3. Add agent deletion capability
4. Consider webhooks for real-time notifications
