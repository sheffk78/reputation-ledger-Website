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
  - GET /admin/users/{id} - Get user details with their agents
  - GET /admin/agents - List all agents across users (with tier/public filtering)
  - GET /admin/agents/{id} - Get agent details with outcomes and flags
  - GET /admin/api-keys - List all API keys with user info and usage stats
  - GET /admin/audit-logs - Paginated audit log entries with event type filtering

#### Frontend
- ✅ Created AdminPage at /admin route with sidebar navigation
- ✅ Platform Overview stats (users, agents, outcomes, 24h/7d activity)
- ✅ Users section: Full table with email, role, agents, outcomes, created date
- ✅ Users: Clickable rows navigate to user detail page
- ✅ User detail page: Shows user info and their agents
- ✅ Agents section: Table with name, owner, score, tier, outcomes, public status
- ✅ Agents: Clickable rows navigate to agent detail page
- ✅ Agents: Tier filter dropdown (All/Platinum/Gold/Silver/Bronze/Unrated)
- ✅ Agents: Visibility filter dropdown (All/Public/Private)
- ✅ Agent detail page: Shows agent summary, owner, score breakdown, recent outcomes, flags
- ✅ API Keys section: Table with user email, partial key, status (Active/Revoked), created/last used dates
- ✅ API Keys status filter dropdown (All/Active/Revoked)
- ✅ Logs section: Audit log table with timestamp, event badges, actor, description
- ✅ Logs event type filter dropdown
- ✅ Logs pagination controls
- ✅ Access Denied page for non-admin users
- ✅ Login response includes is_admin field

#### Backend - API Key Tracking
- ✅ Added `last_used_at` field tracking when API keys are used
- ✅ Updates timestamp each time API key is used for authentication

#### Backend - Audit Logging (March 2025)
- ✅ Created `audit_logs` collection with: id, timestamp, actor_type, actor_id, actor_email, event_type, metadata, description
- ✅ Created `audit_service.py` with emit functions for key events
- ✅ Events logged:
  - `user.signup` - New user registration
  - `user.login` - User login
  - `api_key.created` - API key creation (during signup)
  - `api_key.regenerated` - API key regeneration
  - `agent.created` - Agent registration
  - `agent.flagged` - Agent/outcome flagging
  - `agent.public_toggled` - Public visibility toggle
  - `outcome.logged` - Outcome submission

#### Admin User & Agent Management (Phase 2.1 - March 2025)
- ✅ Toggle user admin status via `/api/admin/users/{id}/role`
- ✅ Delete user with cascade (removes all agents, outcomes, flags, webhooks, API keys)
- ✅ Self-protection: Admin cannot demote or delete themselves
- ✅ Update agent name/description via `/api/admin/agents/{id}`
- ✅ Admin User Detail page shows "Make Admin" / "Remove Admin" and "Delete User" buttons
- ✅ Admin Agent Detail page shows "Edit" and "Delete" buttons
- ✅ Inline edit mode for agents with Save/Cancel functionality
- ✅ Confirmation dialogs for destructive actions showing cascade details

#### Admin Promotion
To promote a user to admin, you can either:
1. Use the Admin Panel: Navigate to Admin → Users → Click on user → "Make Admin" button
2. Run in MongoDB shell:
```
db.users.updateOne({email: "admin@example.com"}, {$set: {is_admin: true}})
```

#### In-App Feedback & Analytics (Phase 2.2 - March 2025)
- ✅ Feedback Widget: "Feedback" button in dashboard header opens modal
- ✅ Feedback Modal: textarea, optional email override, "Send feedback" button
- ✅ POST /api/feedback endpoint saves feedback to `feedback` collection
- ✅ Admin Feedback Viewer at /admin/feedback with table and detail modal
- ✅ Minimal Event Tracking via POST /api/client-events
- ✅ Events tracked: dashboard.loaded, agent.created, quickstart.opened, badge.copied, feedback.opened, feedback.submitted

**Database Collections:**
- `feedback`: id, user_id, user_email, email_override, message, created_at
- `client_events`: id, user_id, event_name, context (JSON), created_at

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
- ✅ Admin API Keys view with last_used_at tracking
- ✅ Audit logging system
- ✅ Admin Agents section with filtering and detail pages

### P1 (High Priority - Phase 2)
- ✅ Outcome filtering by result type (success/failure/partial/timeout)
- ✅ Email notification preferences (toggle on/off in settings)
- ✅ Password reset UI (forgot password + reset password pages)
- ✅ Agent deletion (user can delete own agents with confirmation)
- ✅ Admin Actions - User management (toggle admin, delete user with cascade)
- ✅ Admin Actions - Agent management (edit name/description, delete)
- ✅ In-App Feedback Widget (modal for users to submit feedback)
- ✅ Admin Feedback Viewer (/admin/feedback page)
- ✅ Minimal Event Tracking (client_events for analytics)

### Phase 2.3 - Marketing & Developer Experience (March 2026)
- ✅ **PricingPage** (`/pricing`) - 4-tier pricing grid (Free/$29/$79/Custom), FAQ accordion
- ✅ **ChangelogPage** (`/changelog`) - Timeline with tags, 3-column roadmap, feature request form
- ✅ **DocsPage** (`/docs`) - Full API documentation with:
  - Fixed left sidebar (w-64) with 7 sections
  - Colored method dots (green POST, blue GET, red DELETE, purple PATCH)
  - IntersectionObserver for active section tracking on scroll
  - 14+ endpoint sections with request/response examples
  - Copyable code blocks with hover-reveal buttons
  - Trust Tiers table (5 tiers with colors)
  - Error Codes table (6 codes with descriptions)
  - Link to "Request a feature" on changelog
- ✅ **PlaygroundPage** (`/playground`) - Full interactive API testing with:
  - Split-panel layout (40/60 - request builder / response viewer)
  - 9 endpoints: Register Agent, List Agents, Submit Outcome, Get Score, Get Badge, Submit Flag, List Outcomes, Create Webhook, List Webhooks
  - Warning banner: "All requests use your live API key and affect real data."
  - User's API key (masked with copy + reveal toggle)
  - Agent dropdown selector for agent-specific endpoints
  - Live cURL preview with copy button
  - JSON response viewer with status code and response time
  - SVG badge preview with raw code display
- ✅ **Feature Requests Endpoint** - POST /api/feature-requests (public, no auth)
- ✅ Navigation updates across HomePage, DevelopersPage, DashboardPage

### Phase 2.4 - Dashboard UX Improvements (March 2026)
- ✅ **Docs link in header** - BookOpen icon + "Docs" text linking to /docs
- ✅ **API Key show/hide toggle** - Eye/EyeOff icons, masked by default with dots
- ✅ **Clickable agent rows** - Full row clickable, navigates to agent detail
- ✅ **API Quickstart collapse persistence** - localStorage 'repledger_quickstart_expanded'
- ✅ **Logo links to homepage** - RepLedger logo is Link to /
- ✅ **Skeleton loading** - SkeletonBlock component with animate-pulse instead of spinner
- ✅ **Register Agent Plus icon** - Plus icon in button

### Phase 2.5 - Admin API Key + Branding (March 2026)
- ✅ **Admin API Key auth** - ADMIN_API_KEY env var for programmatic admin access
- ✅ **POST /admin/users** - Create user with auto-generated API key (for Kit)
- ✅ **GET /admin/lookup/user** - Look up user by email
- ✅ **GET /admin/lookup/agent** - Look up agent by ID or name
- ✅ **Favicon** - SVG favicon with RepLedger logo (teal gradient, white stack icon)
- ✅ **Remove watermark** - Removed "Made with Emergent" badge from index.html
- ✅ **Page title** - "RepLedger | Agent Reputation"

### Phase 2.6 - Admin Client Management UI (March 2026)
- ✅ **Clients section** - New tab in Admin sidebar for client provisioning
- ✅ **Client list table** - Shows all users with email, agents, outcomes, admin status, created date
- ✅ **New Client dialog** - Form to provision user + agents + webhooks in one step
- ✅ **POST /admin/full-setup** - Backend endpoint for complete client provisioning
- ✅ **Setup result dialog** - Shows API key, user ID, created agents (with copy functionality)
- ✅ **Admin API documentation section** - Documents authentication and admin endpoints
- ✅ **Dynamic agent/webhook form** - Add/remove agents and webhooks in provisioning form

### Phase 2.7 - Blog System (March 2026)
- ✅ **Blog data model** - `blog_posts` collection with title, content (markdown), slug, status, tags, SEO fields
- ✅ **Admin blog endpoints** - CRUD for blog posts (create, list, get, update, delete, publish)
- ✅ **Public blog index** - `/blog` page with post cards (title, excerpt, author, reading time, tags)
- ✅ **Blog post page** - `/blog/:slug` with full markdown rendering using react-markdown + remark-gfm
- ✅ **Full SEO** - Meta tags, Open Graph, Twitter cards, JSON-LD Article schema, canonical URLs
- ✅ **RSS feed** - `/api/blog/rss` with valid RSS 2.0 + Atom namespace
- ✅ **Navigation** - Blog link added to HomePage, PricingPage, DevelopersPage, DocsPage, ChangelogPage
- ✅ **Prose styling** - `.prose-repledger` CSS for rendered markdown content

### Phase 2.8 - Public API Playground (March 2026)
- ✅ **Sandbox mode** - Playground accessible without login at `/playground`
- ✅ **Sandbox credentials endpoint** - `GET /api/sandbox/credentials` returns shared API key and demo agent
- ✅ **Demo agent** - "Sandbox Support Bot" with sample outcomes for testing
- ✅ **Dual-mode UI** - Header adapts: logo for sandbox, "Back to Dashboard" for authenticated
- ✅ **Sandbox banner** - Shows "Sandbox mode — shared demo data" with sign-up CTA
- ✅ **Outcome auto-cleanup** - Sandbox outcomes limited to 50 per agent
- ✅ **Setup script** - `backend/scripts/setup_sandbox.py` creates sandbox user/agent

### Phase 2.9 - Social Sharing Meta Tags (March 2026)
- ✅ **Dynamic title** - Page title set to "{agent.name} - {tier} Tier Agent | RepLedger"
- ✅ **Meta description** - Agent description with score, outcomes, success rate
- ✅ **Open Graph tags** - og:title, og:description, og:image (badge), og:url, og:type, og:site_name
- ✅ **Twitter cards** - twitter:card (summary), twitter:title, twitter:description, twitter:image
- ✅ **Canonical URL** - Set to production URL (reputationledger.dev/a/{agent_id})
- ✅ **JSON-LD structured data** - SoftwareApplication schema with aggregateRating
- ✅ **Share section** - Twitter/LinkedIn share buttons + Copy Link
- ✅ **Cleanup** - Meta tags removed when navigating away from page
- ✅ **Consistent logo** - Header uses LOGO_URL across all pages

### P2 (Medium Priority)
- ⬜ Social Sharing Meta Tags (OpenGraph/Twitter cards for public agent profiles)
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
│   ├── flags.py           # FlagCreate, FlagResponse, etc.
│   └── blog.py            # BlogPostCreate, BlogPostResponse, etc.
├── routes/
│   ├── __init__.py
│   ├── auth.py            # /api/auth/* routes
│   ├── blog.py            # /api/blog/* and /api/admin/blog/* routes
│   ├── agents.py          # /api/v1/agents/* routes (incl. outcomes, flags)
│   └── webhooks.py        # /api/v1/webhooks/* routes
├── services/
│   ├── __init__.py
│   ├── audit_service.py    # Audit log emission
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
- `/forgot-password` - Request password reset (public)
- `/reset-password` - Set new password with token (public)
- `/dashboard` - Main dashboard (protected)
- `/agents/:agentId` - Agent detail (protected)
- `/settings` - User settings (protected)
- `/a/:agentId` - Public agent profile (public, read-only)
- `/admin` - Admin dashboard (admin only)
- `/admin/users/:userId` - Admin user detail (admin only)
- `/admin/agents/:agentId` - Admin agent detail (admin only)

## API Endpoints
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| /api/v1/agents | POST | API Key | Register agent |
| /api/v1/agents | GET | API Key | List agents |
| /api/v1/agents/demo | POST | API Key | Create demo agent |
| /api/v1/agents/{id} | GET | API Key | Get agent |
| /api/v1/agents/{id} | DELETE | API Key | Delete agent |
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
| /api/settings/notifications | GET | JWT | Get notification preferences |
| /api/settings/notifications | PUT | JWT | Update notification preferences |
| /api/admin/me | GET | Admin | Verify admin access |
| /api/admin/stats | GET | Admin | Platform statistics |
| /api/admin/users | GET | Admin | List all users |
| /api/admin/users/{id} | GET | Admin | Get user details |
| /api/admin/users/{id}/role | PATCH | Admin | Toggle user admin status |
| /api/admin/users/{id} | DELETE | Admin | Delete user (cascades) |
| /api/admin/agents | GET | Admin | List all agents |
| /api/admin/agents/{id} | GET | Admin | Get agent details |
| /api/admin/agents/{id} | PATCH | Admin | Update agent name/description |
| /api/admin/agents/{id} | DELETE | Admin | Delete any agent |
| /api/admin/api-keys | GET | Admin | List all API keys |
| /api/admin/audit-logs | GET | Admin | List audit logs (paginated) |
| /api/admin/feedback | GET | Admin | List all user feedback (paginated) |
| /api/feedback | POST | JWT | Submit user feedback |
| /api/client-events | POST | JWT | Log client-side analytics event |

## Third-Party Integrations
- **Postmark**: Transactional emails (welcome, password reset, outcome notifications)
  - API Key: Configured in backend/.env as POSTMARK_API_KEY
  - From Email: no-reply@contact.agentictrust.app
