# ChangeGuard AI

> AI-powered change management and risk analysis platform — IBM Bob Hackathon 2.0

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Overview

**ChangeGuard AI** is a full-stack SaaS application that helps engineering teams analyze change requests, deployments, and infrastructure updates for risk before execution. Users describe a change in plain language and receive an instant structured AI analysis including risk level, impact areas, potential failure points, mitigation strategies, and a rollback plan.

---

## Problem Statement

IT change management is high-stakes but slow. Teams either skip risk analysis (leading to outages) or rely on manual review processes that take days. There is no fast, intelligent, per-change risk analysis tool available as a standalone product.

---

## Solution

ChangeGuard AI provides:
- Instant AI-generated risk assessment for any described change
- Structured output (risk score, impact areas, recommendations, required checks, rollback plan)
- Persistent per-user history of all past analyses
- Secure, isolated accounts — User A can never see User B's data

---

## Key Features

- 🔍 **AI Analysis** — OpenAI GPT-3.5-turbo with a structured prompt for change management; falls back to a rich demo mode when no API key is present
- 🔒 **Secure Authentication** — bcrypt password hashing (12 rounds), JWT sessions (7-day expiry)
- 👤 **Per-user Isolation** — every DB query is scoped to `user_id`; the backend enforces ownership, not just the frontend
- 📜 **Persistent History** — analyses survive refresh, logout, and re-login; grouped by Today / Yesterday / This Week
- 🗑️ **History Management** — delete individual analyses or clear all; deletions hit the database
- 📱 **Responsive Design** — works on mobile, tablet, and desktop
- ⚡ **Demo Mode** — full functionality without an OpenAI key; useful for local dev and live demos

---

## User Authentication

| Step | Implementation |
|------|---------------|
| Register | `POST /api/auth/register` — validates fields, checks for duplicate email, hashes password with bcrypt (12 rounds), returns JWT |
| Login | `POST /api/auth/login` — timing-safe bcrypt compare, returns JWT on success |
| Session | JWT stored in `localStorage`; attached as `Authorization: Bearer <token>` on every API request |
| Protection | `authMiddleware` in every protected route verifies and decodes the token |
| Logout | Removes token and user from `localStorage`; redirects to landing page |
| Expiry | Token expires in 7 days; 401 responses from the API auto-redirect to `/login` |

---

## AI Analysis

The `/api/analyses` endpoint:
1. Validates the input (10–5 000 chars)
2. Calls `aiService.analyzeChange(inputText)`
3. If `OPENAI_API_KEY` is set: calls GPT-3.5-turbo with a structured system prompt that requests a specific JSON schema
4. If not set (or on API failure): returns an intelligent demo analysis based on keyword detection in the input
5. Saves the result JSON to SQLite, scoped to the authenticated user
6. Returns the full analysis to the frontend

**Output schema**: `title`, `summary`, `riskLevel` (low/medium/high/critical), `riskScore` (1–10), `impactAreas`, `potentialRisks[]`, `recommendations[]`, `requiredChecks[]`, `mitigationStrategies[]`, `approvalConsiderations`, `estimatedDowntime`, `rollbackPlan`, `changeCategory`

---

## User History

- Stored in the `analyses` table with `user_id` foreign key
- API always filters by `req.userId` extracted from the verified JWT
- Frontend groups history by recency (Today / Yesterday / This Week / This Month / Month-Year)
- Each item shows title, risk badge, timestamp, and a snippet of the original input
- Click any item to re-open the full analysis

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, React Router v6, Axios, react-hot-toast, date-fns |
| Backend | Node.js, Express 4, express-validator, helmet, express-rate-limit |
| Database | SQLite (via knex + sqlite3) |
| AI | OpenAI GPT-3.5-turbo (with demo fallback) |
| Auth | bcryptjs, jsonwebtoken |
| Deployment | Render (backend Web Service + frontend Static Site) |

---

## System Architecture

```
Browser (React SPA)
       │
       │  HTTPS  (VITE_API_URL / Render URL)
       ▼
Express REST API  (Node.js / Render Web Service)
       │
       ├─ /api/auth/*      ← register, login, /me
       └─ /api/analyses/*  ← create, list, get, delete
               │
               ├─ knex (SQLite)   ← users + analyses tables
               └─ OpenAI API      ← GPT-3.5-turbo (optional)
```

---

## Database

**File**: `backend/data/changeguard.db` (SQLite, WAL mode)

### `users`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID v4 |
| `name` | TEXT | |
| `email` | TEXT UNIQUE | normalised lowercase |
| `password_hash` | TEXT | bcrypt, 12 rounds |
| `created_at` | TIMESTAMP | |
| `updated_at` | TIMESTAMP | |

### `analyses`
| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | UUID v4 |
| `user_id` | TEXT FK → users.id | ON DELETE CASCADE |
| `title` | TEXT | from AI or first 60 chars |
| `input_text` | TEXT | original change description |
| `result` | TEXT | JSON blob of full AI output |
| `risk_level` | TEXT | low / medium / high / critical |
| `created_at` | TIMESTAMP | |

User isolation is enforced in every SQL query: `WHERE user_id = ?` using `req.userId` from the verified JWT. The frontend cannot bypass this.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default 5000; Render sets 10000) |
| `NODE_ENV` | No | `development` or `production` |
| `JWT_SECRET` | **Yes** | Long random string — use `openssl rand -hex 64` |
| `JWT_EXPIRES_IN` | No | Token expiry (default `7d`) |
| `OPENAI_API_KEY` | No | From https://platform.openai.com/api-keys; omit for demo mode |
| `FRONTEND_URL` | **Yes (prod)** | Your deployed frontend URL (for CORS) |
| `DB_PATH` | No | SQLite file path (default `./data/changeguard.db`) |

### Frontend (`frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | **Yes (prod)** | Your deployed backend URL, e.g. `https://changeguard-ai-backend.onrender.com` |

---

## Local Setup

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9
- Python 3 (for sqlite3 native build)
- Windows: Visual Studio Build Tools OR use `npm install --build-from-source=false`

### 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/changeguard-ai.git
cd changeguard-ai
```

### 2. Configure backend

```bash
cd backend
cp .env.example .env
# Edit .env — set JWT_SECRET at minimum
# Optionally add OPENAI_API_KEY for live AI
```

### 3. Configure frontend

```bash
cd ../frontend
cp .env.example .env
# VITE_API_URL can be left empty for local dev (Vite proxies to localhost:5000)
```

---

## Running the Backend

```bash
cd backend
npm install
npm run dev          # nodemon hot-reload
# or
npm start            # production
```

The server starts on **http://localhost:5000**. Check **http://localhost:5000/health**.

---

## Running the Frontend

```bash
cd frontend
npm install
npm run dev          # Vite dev server with proxy to backend
```

Opens at **http://localhost:5173**.

---

## Running Backend Tests

```bash
cd backend
node test-server.js  # runs 12 smoke tests and exits
```

---

## Deployment

### Deploy to Render

1. Push this repository to GitHub (public).
2. Go to https://render.com → **New → Blueprint** → connect your repo.
3. Render reads `render.yaml` and creates both services automatically.
4. After creation, set the following **environment variables** in the Render dashboard:

**Backend service** (`changeguard-ai-backend`):
- `JWT_SECRET` — generate with `openssl rand -hex 64`
- `OPENAI_API_KEY` — your OpenAI key (optional for demo)
- `FRONTEND_URL` — `https://changeguard-ai-frontend.onrender.com`

**Frontend service** (`changeguard-ai-frontend`):
- `VITE_API_URL` — `https://changeguard-ai-backend.onrender.com`

5. Trigger a deploy. Both services will build and start.

> **Note**: Render free tier SQLite data does **not** persist across deploys (ephemeral disk). For persistent storage on free tier, upgrade to a paid instance or use a hosted database like Neon (PostgreSQL). Change `knex` client from `sqlite3` to `pg` and update the connection string.

---

## Security

- Passwords hashed with bcrypt (cost factor 12) — never stored in plain text
- JWT signed with a secret never committed to Git
- All protected API routes verify the JWT on every request
- User data scoped to `user_id` in every database query — no frontend-only filtering
- Helmet sets secure HTTP headers
- Rate limiting: 100 req/15 min overall; 20 req/15 min on auth routes
- CORS restricted to known frontend origins in production
- `.env` files excluded by `.gitignore`
- Input validated with `express-validator` on every endpoint

---

## Hackathon Information

**Event**: IBM Bob Hackathon 2.0
**Project**: ChangeGuard AI
**Built with**: IBM Bob (AI coding assistant)

### IBM Bob Usage

This entire application was designed and built using IBM Bob as the primary development assistant:
- Architectural decisions (tech stack, database schema, auth flow)
- All backend code (Express routes, knex queries, JWT middleware, AI service)
- All frontend code (React components, context, routing, CSS)
- Test scripts and deployment configuration
- This README

Bob was used to plan, scaffold, implement, debug (the sqlite3 native build issue), and validate the complete application in a single session.

---

## License

MIT — see [LICENSE](LICENSE)
