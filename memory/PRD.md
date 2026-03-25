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
- Developer documentation
- Email notifications (welcome, password reset, outcome alerts)
- Webhooks for real-time outcome event notifications

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
- Email notifications via Postmark
- Webhook subscriptions for outcome events

## What's Been Implemented

### Phase 1 - Core MVP (March 2025)
#### Backend (FastAPI)
- ✅ User signup/login with JWT authentication
- ✅ API key generation and regeneration
- ✅ POST /api/v1/agents - Register agent
- ✅ GET /api/v1/agents - List user's agents
- ✅ GET /api/v1/agents/{agent_id} - Get agent details with score
- ✅ POST /api/v1/agents/{agent_id}/outcomes - Submit outcome
- ✅ GET /api/v1/agents/{agent_id}/outcomes - List outcomes
- ✅ GET /api/v1/agents/{agent_id}/score - Get score and tier
- ✅ GET /api/v1/agents/{agent_id}/badge.svg - Public SVG badge

#### Frontend (React)
- ✅ Marketing homepage with hero, how it works, who it's for, why not reviews, CTA
- ✅ Developers/docs page with quickstart (5 steps) and API reference
- ✅ Login/Signup pages with RepLedger branding
- ✅ Dashboard with API key block, agents table (tier, score, outcomes)
- ✅ Agent detail page with score card, badge embed, outcomes table
- ✅ Brand styling: dark #050709, teal #01696F, Space Grotesk/Inter/JetBrains Mono

### Phase 1.1 - Email & Webhooks (December 2025)
#### Backend
- ✅ Postmark email integration (services/email_service.py)
- ✅ Welcome email on user signup
- ✅ Password reset flow (request + confirm endpoints)
- ✅ Outcome notification emails
- ✅ Webhook CRUD: POST/GET/DELETE /api/v1/webhooks
- ✅ Webhook delivery on outcome.created events
- ✅ Webhook delivery logging

#### Frontend
- ✅ Webhooks management section on Dashboard
- ✅ Add Webhook dialog with URL input
- ✅ Webhook list display with event tags
- ✅ Delete webhook with confirmation
- ✅ API docs updated with webhook endpoints
- ✅ API Quickstart panel with pre-filled code examples

### Phase 1.2 - Validation & Error Handling (December 2025)
#### Backend
- ✅ Standardized JSON error format: `{error: {code, message, details}}`
- ✅ Error codes: INVALID_CREDENTIALS, EMAIL_ALREADY_EXISTS, AGENT_NOT_FOUND, WEBHOOK_NOT_FOUND, VALIDATION_ERROR, etc.
- ✅ Custom APIError exception class
- ✅ RequestValidationError handler with field-specific messages
- ✅ HTTPException handler converting to standardized format
- ✅ User-friendly messages: "Please enter a valid email address", "Password must be at least 6 characters"

#### Frontend
- ✅ Inline form validation on blur
- ✅ Red border + error message below invalid fields
- ✅ Signup form: email, password length, password match validation
- ✅ Login form: email/password required, error alert for invalid credentials
- ✅ Dashboard agent form: name required validation
- ✅ Dashboard webhook form: URL format validation
- ✅ parseApiError utility for consistent error handling
- ✅ Webhook delivery on outcome.created events
- ✅ Webhook delivery logging

#### Frontend
- ✅ Webhooks management section on Dashboard
- ✅ Add Webhook dialog with URL input
- ✅ Webhook list display with event tags
- ✅ Delete webhook with confirmation
- ✅ API docs updated with webhook endpoints

### Scoring Logic
- Score = (successful / total) * 100
- Tiers:
  - Unrated: < 5 outcomes
  - Bronze: score < 50 (5+ outcomes)
  - Silver: 50-74
  - Gold: 75-89
  - Platinum: 90+ (50+ outcomes)

## Prioritized Backlog

### P0 (Critical - Completed)
- ✅ All Phase 1 features implemented
- ✅ Postmark email integration
- ✅ Webhook system for outcome events

### P1 (High Priority - Phase 2)
- ⬜ Password reset UI page (backend complete, need frontend page)
- ⬜ Agent deletion
- ⬜ Outcome filtering/pagination in UI
- ⬜ Email notification preferences (toggle on/off)

### P2 (Medium Priority)
- ⬜ Flags/incident system
- ⬜ AAV (Agent Authority Vault) integration
- ⬜ Safe-Spend integration
- ⬜ Multi-tenant organizations/teams
- ⬜ GitHub/domain identity verification

### P3 (Low Priority)
- ⬜ Public agent profiles
- ⬜ Agent comparison tools
- ⬜ Leaderboards
- ⬜ Advanced analytics dashboard

## Routes
- `/` - Marketing homepage (public)
- `/developers` - API documentation (public)
- `/login` - Sign in (public)
- `/signup` - Create account (public)
- `/dashboard` - Main dashboard (protected)
- `/agents/:agentId` - Agent detail (protected)

## API Endpoints
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /api/v1/agents | POST | API Key | Register agent |
| /api/v1/agents | GET | API Key | List agents |
| /api/v1/agents/{id} | GET | API Key | Get agent |
| /api/v1/agents/{id}/outcomes | POST | API Key | Submit outcome |
| /api/v1/agents/{id}/outcomes | GET | API Key | List outcomes |
| /api/v1/agents/{id}/score | GET | API Key | Get score |
| /api/v1/agents/{id}/badge.svg | GET | Public | SVG badge |
| /api/v1/webhooks | POST | API Key | Create webhook |
| /api/v1/webhooks | GET | API Key | List webhooks |
| /api/v1/webhooks/{id} | GET | API Key | Get webhook |
| /api/v1/webhooks/{id} | DELETE | API Key | Delete webhook |
| /api/auth/password-reset/request | POST | Public | Request password reset |
| /api/auth/password-reset/confirm | POST | Public | Confirm password reset |

## Third-Party Integrations
- **Postmark**: Transactional emails (welcome, password reset, outcome notifications)
  - API Key: Configured in backend/.env as POSTMARK_API_KEY
  - From Email: no-reply@contact.agentictrust.app
