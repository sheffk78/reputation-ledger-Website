# RepLedger Phase 1 API Specification

## Authentication

All `/v1/*` endpoints require an API key in the `Authorization` header:

```
Authorization: Bearer arl_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Auth endpoints** (`/api/auth/*`) use JWT tokens for session management.

---

## Data Model

### 1. users

| Field         | Type      | Description                          |
|---------------|-----------|--------------------------------------|
| id            | string    | UUID, primary key                    |
| email         | string    | Unique, lowercase, indexed           |
| password_hash | string    | bcrypt hash                          |
| created_at    | datetime  | ISO 8601 timestamp (UTC)             |

**Relationships:**
- One user → many api_keys
- One user → many agents

---

### 2. api_keys

| Field       | Type      | Description                              |
|-------------|-----------|------------------------------------------|
| id          | string    | UUID, primary key                        |
| user_id     | string    | Foreign key → users.id                   |
| key         | string    | Format: `arl_` + 48 hex chars, indexed   |
| created_at  | datetime  | ISO 8601 timestamp (UTC)                 |
| revoked_at  | datetime  | Null if active, timestamp if revoked     |

**Relationships:**
- Many api_keys → one user
- Only one active key per user (revoked_at = null)

---

### 3. agents

| Field        | Type         | Description                           |
|--------------|--------------|---------------------------------------|
| agent_id     | string       | Format: `agt_` + 24 hex chars, PK     |
| user_id      | string       | Foreign key → users.id, indexed       |
| name         | string       | 1-100 chars, required                 |
| description  | string/null  | Optional text                         |
| owner_handle | string/null  | Optional (e.g., @github-user)         |
| created_at   | datetime     | ISO 8601 timestamp (UTC)              |

**Relationships:**
- Many agents → one user
- One agent → many outcomes

---

### 4. outcomes

| Field          | Type     | Description                                      |
|----------------|----------|--------------------------------------------------|
| id             | string   | UUID, primary key                                |
| agent_id       | string   | Foreign key → agents.agent_id, indexed           |
| result         | enum     | `"success"` \| `"failure"` \| `"partial"` \| `"timeout"` |
| task_type      | string   | 1-100 chars, required                            |
| submitter_type | enum     | `"self"` \| `"operator"`                         |
| created_at     | datetime | ISO 8601 timestamp (UTC), server-generated       |

**Relationships:**
- Many outcomes → one agent

---

## API Endpoints

### POST /v1/agents

Register a new agent.

**Request:**
```json
{
  "name": "research-agent-v2",
  "description": "AI research assistant for literature review",
  "owner_handle": "@acme-labs"
}
```

| Field        | Type   | Required | Constraints      |
|--------------|--------|----------|------------------|
| name         | string | Yes      | 1-100 chars      |
| description  | string | No       | Optional         |
| owner_handle | string | No       | Optional         |

**Response (201 Created):**
```json
{
  "agent_id": "agt_7f3k9m2x4p1q8n5v6w0r",
  "name": "research-agent-v2",
  "description": "AI research assistant for literature review",
  "owner_handle": "@acme-labs",
  "created_at": "2026-03-25T10:30:00Z"
}
```

**Errors:**
- `401 Unauthorized` – Missing or invalid API key
- `422 Unprocessable Entity` – Validation error (e.g., empty name)

---

### GET /v1/agents

List all agents belonging to the authenticated user.

**Request:** No body.

**Response (200 OK):**
```json
[
  {
    "agent_id": "agt_7f3k9m2x4p1q8n5v6w0r",
    "name": "research-agent-v2",
    "description": "AI research assistant for literature review",
    "owner_handle": "@acme-labs",
    "created_at": "2026-03-25T10:30:00Z",
    "score": 87.5,
    "tier": "Gold",
    "outcome_count": 48,
    "success_rate": 87.5,
    "last_updated": "2026-03-25T14:22:00Z"
  },
  {
    "agent_id": "agt_abc123def456ghi789",
    "name": "support-bot",
    "description": null,
    "owner_handle": null,
    "created_at": "2026-03-20T08:00:00Z",
    "score": 0,
    "tier": "Unrated",
    "outcome_count": 2,
    "success_rate": 100.0,
    "last_updated": "2026-03-20T09:15:00Z"
  }
]
```

**Notes:**
- Returns empty array `[]` if user has no agents
- `last_updated` is null if no outcomes exist

**Errors:**
- `401 Unauthorized` – Missing or invalid API key

---

### POST /v1/agents/{agent_id}/outcomes

Submit an outcome for an agent.

**Request:**
```json
{
  "result": "success",
  "task_type": "research_query",
  "submitter_type": "self"
}
```

| Field          | Type   | Required | Constraints                                   |
|----------------|--------|----------|-----------------------------------------------|
| result         | enum   | Yes      | `"success"` \| `"failure"` \| `"partial"` \| `"timeout"` |
| task_type      | string | Yes      | 1-100 chars                                   |
| submitter_type | enum   | Yes      | `"self"` \| `"operator"`                      |

**Response (201 Created):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "agent_id": "agt_7f3k9m2x4p1q8n5v6w0r",
  "result": "success",
  "task_type": "research_query",
  "submitter_type": "self",
  "created_at": "2026-03-25T14:30:00Z"
}
```

**Errors:**
- `401 Unauthorized` – Missing or invalid API key
- `404 Not Found` – Agent does not exist or doesn't belong to user
- `422 Unprocessable Entity` – Validation error

---

### GET /v1/agents/{agent_id}/score

Get the computed score and trust tier for an agent.

**Request:** No body.

**Response (200 OK):**
```json
{
  "agent_id": "agt_7f3k9m2x4p1q8n5v6w0r",
  "score": 87.5,
  "tier": "Gold",
  "outcome_count": 48,
  "success_rate": 87.5
}
```

| Field         | Type   | Description                              |
|---------------|--------|------------------------------------------|
| agent_id      | string | The agent identifier                     |
| score         | number | 0-100, rounded to 1 decimal              |
| tier          | enum   | `"Unrated"` \| `"Bronze"` \| `"Silver"` \| `"Gold"` \| `"Platinum"` |
| outcome_count | number | Total outcomes submitted                 |
| success_rate  | number | Percentage of successful outcomes        |

**Scoring Logic:**
```
score = (successful_outcomes / total_outcomes) * 100

Tier assignment:
- Unrated:  outcome_count < 5
- Bronze:   score < 50 AND outcome_count >= 5
- Silver:   score >= 50 AND score < 75
- Gold:     score >= 75 AND score < 90
- Platinum: score >= 90 AND outcome_count >= 50
```

**Errors:**
- `401 Unauthorized` – Missing or invalid API key
- `404 Not Found` – Agent does not exist or doesn't belong to user

---

### GET /v1/agents/{agent_id}/badge.svg

Get an embeddable SVG badge showing the agent's tier and score.

**Authentication:** **NONE** – This is a public endpoint for embedding.

**Request:** No body.

**Response (200 OK):**
```
Content-Type: image/svg+xml
```

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="28" viewBox="0 0 120 28">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#0C1116"/>
      <stop offset="100%" style="stop-color:#111827"/>
    </linearGradient>
  </defs>
  <rect width="120" height="28" rx="4" fill="url(#bg)" stroke="#1F2933" stroke-width="1"/>
  <rect x="4" y="4" width="52" height="20" rx="3" fill="#FFD700"/>
  <text x="30" y="18" font-family="Inter, sans-serif" font-size="11" font-weight="600" fill="#111827" text-anchor="middle">Gold</text>
  <text x="86" y="18" font-family="JetBrains Mono, monospace" font-size="12" font-weight="700" fill="#F9FAFB" text-anchor="middle">87</text>
</svg>
```

**Badge Tier Colors:**

| Tier     | Fill Color | Text Color |
|----------|------------|------------|
| Unrated  | `#4B5563`  | `#E5E7EB`  |
| Bronze   | `#CD7F32`  | `#111827`  |
| Silver   | `#C0C0C0`  | `#111827`  |
| Gold     | `#FFD700`  | `#111827`  |
| Platinum | `#01696F`  | `#ECFEFF`  |

**Errors:**
- `404 Not Found` – Agent does not exist (returns JSON error, not SVG)

---

## Summary

| Endpoint                              | Auth Required | Method |
|---------------------------------------|---------------|--------|
| POST /v1/agents                       | Yes (API Key) | Create |
| GET /v1/agents                        | Yes (API Key) | Read   |
| POST /v1/agents/{agent_id}/outcomes   | Yes (API Key) | Create |
| GET /v1/agents/{agent_id}/score       | Yes (API Key) | Read   |
| GET /v1/agents/{agent_id}/badge.svg   | **No**        | Read   |

**Confirmed:** All endpoints except `badge.svg` require the API key in the `Authorization: Bearer <key>` header.
