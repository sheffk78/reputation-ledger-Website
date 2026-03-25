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

### Phase 1.3 - Outcomes Pagination (December 2025)
#### Backend
- ✅ GET /v1/agents/{agent_id}/outcomes supports ?page=1&limit=20
- ✅ Returns {data, page, limit, total} paginated response
- ✅ Default limit 20, max limit 100

#### Frontend
- ✅ Agent detail page loads first page of outcomes by default
- ✅ "Previous / Next" pagination controls
- ✅ "Page X of Y" indicator
- ✅ Total outcomes count in header
- ✅ Loading state while fetching pages

### Phase 1.4 - Demo Agent for Onboarding (December 2025)
#### Backend
- ✅ POST /v1/agents/demo creates demo agent with 15 sample outcomes
- ✅ Idempotent - returns existing demo agent on repeated calls
- ✅ Sample outcomes with realistic distribution (73% success rate → Silver tier)
- ✅ Varied task types: ticket-resolution, faq-response, sentiment-analysis, etc.

#### Frontend
- ✅ "Try with Demo Agent" button in empty state
- ✅ Button hidden after demo agent created
- ✅ Demo Data banner explains this is sample data
- ✅ Demo agent shows in agents table with score/tier

### Phase 1.5 - Flags System (March 2025)
#### Backend
- ✅ POST /api/v1/agents/{agent_id}/flags - Create flag for agent or specific outcome
- ✅ GET /api/v1/agents/{agent_id}/flags - List flags for agent
- ✅ Flags stored with: id, agent_id, outcome_id (optional), reason, notes, created_by_user_id, created_at

#### Frontend
- ✅ Flags card on Agent Detail page showing count
- ✅ "Add Flag" button to create general agent flag
- ✅ Flag icon button on each outcome row to flag specific outcome
- ✅ Create Flag dialog with reason (required) and notes (optional)
- ✅ "View flags" button and dialog showing all flags with details
- ✅ Toast notification on flag creation

### Phase 1.6 - Backend Refactoring (March 2025)
#### Code Architecture Improvement
- ✅ Refactored server.py (1395 lines) into modular structure
- ✅ Created `/app/backend/core/` - Configuration, database, dependencies, exceptions
- ✅ Created `/app/backend/models/` - Pydantic models (auth, agents, outcomes, webhooks, flags)
- ✅ Created `/app/backend/routes/` - Route handlers (auth, agents, webhooks)
- ✅ Created `/app/backend/services/` - Business logic (score_service, webhook_service, email_service)
- ✅ Created `/app/backend/utils/` - Utilities (password hashing)
- ✅ Main server.py now ~170 lines - entry point only

### Phase 1.7 - Score Breakdown (March 2025)
#### Backend
- ✅ Updated GET /v1/agents/{agent_id}/score to include breakdown field
- ✅ Response now includes: `{ breakdown: { success, failure, partial, timeout } }`
- ✅ Updated score_service.py to calculate and return breakdown counts

#### Frontend
- ✅ Added "Score Breakdown" card on Agent Detail page
- ✅ Visual progress bars for each outcome type (success, failure, partial, timeout)
- ✅ Color-coded bars: green (success), red (failure), amber (partial), gray (timeout)
- ✅ Shows success rate percentage and total outcome count

### Phase 1.8 - Public Agent Profiles (March 2025)
#### Backend
- ✅ Added `is_public` boolean field to agents (default: false)
- ✅ Added PATCH /api/v1/agents/{agent_id}/public endpoint to toggle visibility
- ✅ Added GET /api/public/agents/{agent_id} public endpoint (no auth required)
- ✅ Returns limited data: name, description, owner_handle, score, tier, outcome_count, success_rate, breakdown
- ✅ Returns 404 "not publicly available" when is_public=false

#### Frontend
- ✅ Added "Public Profile" card on Agent Detail page with toggle switch
- ✅ Shows shareable public URL when enabled
- ✅ Created PublicAgentPage at /a/{agentId} route
- ✅ Public page shows: name, tier badge, description, owner, SVG badge, stats cards, performance breakdown
- ✅ "Profile Not Available" page when agent is not public
- ✅ Styled consistently with marketing site (dark theme, Space Grotesk fonts)

### Phase 1.9 - Usage Overview Dashboard (March 2025)
#### Backend
- ✅ Added GET /api/usage-stats endpoint (JWT auth required)
- ✅ Returns: total_agents, total_outcomes, outcomes_last_7_days, avg_score
- ✅ avg_score calculated only for agents with >= 5 outcomes

#### Frontend
- ✅ Added Usage Overview section to Dashboard page
- ✅ 4 stat cards: Agents, Total Outcomes, Last 7 Days, Avg. Score
- ✅ Clean card layout with teal icons and uppercase labels
- ✅ Shows "—" for avg_score when no qualifying agents exist

### Phase 2.0 - Admin System (March 2025)
#### Backend
- ✅ Added `is_admin` boolean field to users (default: false)
- ✅ Created `get_admin_user` dependency for admin-only routes
- ✅ Returns 403 ADMIN_ACCESS_REQUIRED for non-admin users
- ✅ Admin API endpoints under `/api/admin/*`:
  - GET /admin/me - Verify admin access
  - GET /admin/stats - Platform-wide statistics
  - GET /admin/users - List all users with stats
  - GET /admin/agents - List all agents across users

#### Frontend
- ✅ Created AdminPage at /admin route
- ✅ Platform Overview stats (users, agents, outcomes, 24h/7d activity)
- ✅ Recent Users table with role badges
- ✅ Recent Agents table with tier badges and public status
- ✅ Access Denied page for non-admin users
- ✅ Login response includes is_admin field

#### Admin Promotion
To promote a user to admin, run in MongoDB shell:
```
db.users.updateOne({email: "admin@example.com"}, {$set: {is_admin: true}})
```

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
- ✅ Flags system for problematic outcomes
- ✅ Backend code refactoring
- ✅ Score breakdown API and UI
- ✅ Public agent profiles
- ✅ Usage overview dashboard
- ✅ Admin system with role-based access

### P1 (High Priority - Phase 2)
- ⬜ Outcome filtering by result type (success/failure/partial/timeout)
- ⬜ Email notification preferences (toggle on/off in settings)
- ⬜ Password reset UI page (backend complete, need frontend page)
- ⬜ Agent deletion

### P2 (Medium Priority)
- ⬜ AAV (Agent Authority Vault) integration
- ⬜ Safe-Spend integration
- ⬜ Multi-tenant organizations/teams
- ⬜ GitHub/domain identity verification

### P3 (Low Priority)
- ⬜ Agent comparison tools
- ⬜ Leaderboards
- ⬜ Advanced analytics dashboard

## Code Architecture

```
/app/backend/
├── server.py              # Main entry point (~170 lines)
├── core/
│   ├── __init__.py
│   ├── config.py          # Settings (JWT, MongoDB, CORS)
│   ├── database.py        # MongoDB connection
│   ├── dependencies.py    # Auth dependencies (get_current_user, get_user_from_api_key)
│   └── exceptions.py      # APIError, ErrorCodes, error handlers
├── models/
│   ├── __init__.py
│   ├── auth.py            # UserCreate, TokenResponse, etc.
│   ├── agents.py          # AgentCreate, AgentListResponse, etc.
│   ├── outcomes.py        # OutcomeCreate, PaginatedOutcomesResponse, etc.
│   ├── webhooks.py        # WebhookCreate, WebhookResponse, etc.
│   └── flags.py           # FlagCreate, FlagResponse, etc.
├── routes/
│   ├── __init__.py
│   ├── auth.py            # /api/auth/* routes
│   ├── agents.py          # /api/v1/agents/* routes (incl. outcomes, flags)
│   └── webhooks.py        # /api/v1/webhooks/* routes
├── services/
│   ├── __init__.py
│   ├── email_service.py   # Postmark email sending
│   ├── score_service.py   # Score/tier calculation, badge SVG generation
│   └── webhook_service.py # Webhook triggering logic
└── utils/
    ├── __init__.py
    └── password.py        # Password hashing utilities
```

## Routes
- `/` - Marketing homepage (public)
- `/developers` - API documentation (public)
- `/login` - Sign in (public)
- `/signup` - Create account (public)
- `/dashboard` - Main dashboard (protected)
- `/agents/:agentId` - Agent detail (protected)
- `/a/:agentId` - Public agent profile (public, read-only)

## API Endpoints
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /api/v1/agents | POST | API Key | Register agent |
| /api/v1/agents | GET | API Key | List agents |
| /api/v1/agents/demo | POST | API Key | Create demo agent |
| /api/v1/agents/{id} | GET | API Key | Get agent |
| /api/v1/agents/{id}/public | PATCH | API Key | Toggle public visibility |
| /api/v1/agents/{id}/outcomes | POST | API Key | Submit outcome |
| /api/v1/agents/{id}/outcomes | GET | API Key | List outcomes (paginated) |
| /api/v1/agents/{id}/score | GET | API Key | Get score |
| /api/v1/agents/{id}/badge.svg | GET | Public | SVG badge |
| /api/v1/agents/{id}/flags | POST | API Key | Create flag |
| /api/v1/agents/{id}/flags | GET | API Key | List flags |
| /api/public/agents/{id} | GET | Public | Get public agent profile |
| /api/v1/webhooks | POST | API Key | Create webhook |
| /api/v1/webhooks | GET | API Key | List webhooks |
| /api/v1/webhooks/{id} | GET | API Key | Get webhook |
| /api/v1/webhooks/{id} | DELETE | API Key | Delete webhook |
| /api/auth/signup | POST | Public | Create account |
| /api/auth/login | POST | Public | Sign in |
| /api/auth/me | GET | JWT | Get current user |
| /api/auth/password-reset/request | POST | Public | Request password reset |
| /api/auth/password-reset/confirm | POST | Public | Confirm password reset |
| /api/api-key | GET | JWT | Get API key |
| /api/api-key/regenerate | POST | JWT | Regenerate API key |
| /api/usage-stats | GET | JWT | Get usage statistics |

## Third-Party Integrations
- **Postmark**: Transactional emails (welcome, password reset, outcome notifications)
  - API Key: Configured in backend/.env as POSTMARK_API_KEY
  - From Email: no-reply@contact.agentictrust.app
