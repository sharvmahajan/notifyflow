<div align="center">
  <h1>NotifyFlow</h1>
  <p>A multi-tenant Notification-as-a-Service platform with a production-grade Security Operations Center.</p>
</div>

NotifyFlow allows external developers to send transactional notifications from their applications via a simple REST API. It abstracts away multiple providers (SendGrid, Twilio, In-App sockets) into a single API structure with fallback capabilities, templates, API keys, and real-time dashboard analytics.

## 🚀 Features

- **JWT Authentication** (Access/Refresh tokens) with secure `httpOnly` cookies.
- **API Key Management**: Environment-specific API keys (Live/Test) paired with high-performance Auth middleware.
- **Dynamic Template Rendering** with custom variable support (e.g. `{{variable}}`).
- **Provider Fallback**: Built-in fallback capabilities. When credentials (SendGrid/Twilio) are missing, it defaults to the `ConsoleProvider` for local testing.
- **Versatile Sending**: Single and batch notifications to Email, SMS, and In-App channels.
- **Real-Time Analytics Dashboard**: Beautiful, fully responsive Dark-mode Dashboard with data visualization.
- **Audit Logging and Metrics**: Keeps a tight track of sending history.
- **Advanced SOC**: Behavioral anomaly detection, impossible travel, risk scoring, alert correlation, SOAR auto-response.

## 🛠 Technology Stack

- **Backend:** Node.js, Express, Socket.io, Zod, Prisma, PostgreSQL
- **Frontend:** React, Vite, Tailwind CSS, Recharts, React Router
- **Infra:** Docker Compose

## 📦 Getting Started

### Prerequisites

- Node.js > 18
- Docker and `docker compose`

### Setup

1. **Environment Configuration:**
    The root `.env` values are passed via `docker-compose.yml`. You can overwrite them or supply real credentials for Twilio/SendGrid there. If the `SENDGRID_API_KEY` is not set, email notifications will default to the stdout/console provider.

2. **Start the Application:**
    Use the included Makefile to bring up the database, frontend, and backend via Docker:
    ```bash
    make dev
    ```

3. **Initialize Database:**
    Once the Database is up and running, open another terminal window to run migrations and seed data:
    ```bash
    make migrate
    make seed
    ```

    *Note: The `make seed` command creates a default admin user `test@notifyflow.dev` with password `password`.*

### Usage

1. Open your browser to `http://localhost:5173`.
2. Login with `test@notifyflow.dev` / `password`.
3. Create an API Key from the **Keys** page.
4. Go to **Templates** to create dynamic message templates.
5. Use the API or the built-in **Send** page to test notifications!
6. Visit the **SOC** dashboard (admin only) to view live threat alerts.

## 🧩 Architecture

- **`backend/`**: Driven by the Express MVC pattern. Abstractions like `ProviderFactory` allow swapping logic seamlessly. Rate limits are applied (100req/min) on API ingestion.
- **`frontend/`**: Vite SPA utilizing `axios` interceptors for seamless token refresh cycles. Protected routing via React Context.

```
├── backend/                  # Express APIs, Prisma, Socket.io
│   ├── prisma/               # Schema and Seeds
│   └── src/                  # Service Layer, Routes, Providers
│       └── soc/
│           ├── detection/    # 10 modular detectors
│           ├── soar/         # Automated response engine
│           ├── alerts/       # Alert creation service
│           └── logging/      # Winston + Prisma transport
├── frontend/                 # React UI
│   └── src/
│       ├── api/              # Axios endpoints and interceptors
│       ├── components/       # Layouts, UI Modules
│       ├── context/          # Auth and Socket connections
│       └── pages/            # View components (incl. SocDashboard)
├── docker-compose.yml        # Orchestration
└── Makefile                  # Task commands
```

---

## 🛡️ SOC Architecture

The SOC is made of 10 independent, composable detection modules:

| Module | File | What it detects |
|---|---|---|
| Behavioral Baseline | `behavioralBaseline.ts` | Deviations from 7-day rolling averages |
| Impossible Travel | `impossibleTravel.ts` | Logins from impossible geo distances |
| Risk Scoring | `riskScoring.ts` | Aggregated in-memory risk per user/IP |
| Correlation Engine | `correlationEngine.ts` | 3+ weak signals → CRITICAL combined alert |
| Session Abuse | `sessionAbuse.ts` | Token multi-IP, reuse after logout, rapid IP switch |
| Data Exfiltration | `dataExfiltration.ts` | Bulk reads + notification spike detection |
| IP Intelligence | `ipIntelligence.ts` | VPN/datacenter/proxy detection via ip-api.com |
| Privilege Escalation | `privilegeEscalation.ts` | Admin endpoint access, role changes |
| Honeytokens | `honeytokens.ts` | Fake API keys + decoy endpoints |
| SOAR | `soar/autoResponse.ts` | Auto block, revoke, invalidate, force reset |

---

## 🔬 SOC Attack Simulation Guide

> Prerequisites: The app must be running (`make dev` + `make migrate` + `make seed`).
> Use `BACKEND=http://localhost:4000` as the base URL.
> Admin credentials: `test@notifyflow.dev` / `password`

### 1. Brute Force Login

Trigger 5+ failed logins from the same IP in under 5 minutes:

```bash
for i in {1..6}; do
  curl -s -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@notifyflow.dev","password":"wrongpassword"}' \
    | jq .
done
```

**Expected:** `BRUTE_FORCE` HIGH alert appears in the SOC dashboard within seconds.

---

### 2. Credential Stuffing

Send 6+ failed logins with different email addresses from the same IP in 10 minutes:

```bash
for email in a@x.com b@y.com c@z.com d@w.com e@q.com f@p.com; do
  curl -s -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"hacked123\"}" &
done
wait
```

**Expected:** `CREDENTIAL_STUFFING` CRITICAL alert with email list in metadata.

---

### 3. Suspicious User Agent

Login successfully and then send a request with a bot-like User-Agent:

```bash
# First login normally to set baseline
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@notifyflow.dev","password":"password"}' \
  -c cookies.txt

# Now login with a script UA (repeat a few times to build history first)
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "User-Agent: python-requests/2.31.0" \
  -d '{"email":"test@notifyflow.dev","password":"password"}' \
  -c cookies.txt
```

**Expected:** `SUSPICIOUS_UA` HIGH alert with `isBot: true`.

---

### 4. API Key Leakage (Multi-IP Usage)

Use the same API key from 3+ different source IPs. Simulate with `X-Forwarded-For` or from different machines:

```bash
API_KEY="your_live_api_key_here"

for ip in 1.2.3.4 5.6.7.8 9.10.11.12; do
  curl -s -X POST http://localhost:4000/api/v1/send \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $API_KEY" \
    -H "X-Forwarded-For: $ip" \
    -d '{"channel":"inapp","to":"user123","body":"test"}' &
done
wait
```

**Expected:** `API_KEY_LEAKAGE` CRITICAL alert with list of IPs.

---

### 5. Honeytoken API Key

The system seeds fake key prefixes (`nf_honey_001_`, `nf_honey_002_`, `nf_honey_003_`) at startup. Use one:

```bash
curl -s -X POST http://localhost:4000/api/v1/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer nf_honey_001_fakekey12345" \
  -d '{"channel":"inapp","to":"user","body":"hello"}'
```

**Expected:** `HONEYTOKEN_TRIGGERED` CRITICAL alert + your IP is automatically blocked.

---

### 6. Honey Endpoint Access

Access a decoy endpoint that should never be legitimately hit:

```bash
curl -s http://localhost:4000/api/internal/debug
curl -s http://localhost:4000/api/v0/legacy
curl -s http://localhost:4000/api/admin/backup
```

**Expected:** `HONEY_ENDPOINT_ACCESSED` CRITICAL alert + IP blocked.

---

### 7. Token Reuse After Logout

Login, save the refresh token, logout, then replay the old token:

```bash
# Login and capture cookies
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@notifyflow.dev","password":"password"}' \
  -c cookies.txt -b cookies.txt

# Save the refresh token value from cookies.txt manually, then logout
curl -s -X POST http://localhost:4000/api/auth/logout \
  -b cookies.txt

# Attempt to use the old refresh token (edit REFRESH_TOKEN below)
curl -s -X POST http://localhost:4000/api/auth/refresh \
  -H "Cookie: refreshToken=REFRESH_TOKEN_VALUE"
```

**Expected:** `TOKEN_REUSE_AFTER_LOGOUT` CRITICAL alert on the replay attempt.

---

### 8. Impossible Travel Detection

Requires two logins with different geolocated IPs far apart in a short time. You can simulate by temporarily inserting a fake prior login event with distant geo metadata directly into the database:

```bash
# Via psql / your DB tool — insert a fake prior login event
# with geo.lat/lon for a distant location (e.g., London: 51.50, -0.12)
# Then immediately login from your real IP (e.g., Mumbai: 19.07, 72.87)
```

Or in a staging/VPN environment, login from two VPN endpoints in different continents.

**Expected:** `IMPOSSIBLE_TRAVEL` CRITICAL alert with distance and time delta in metadata.

---

### 9. Data Exfiltration — Bulk Read

Fetch more than 100 notifications in a single request:

```bash
# Login first
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@notifyflow.dev","password":"password"}' \
  -c cookies.txt

# Fetch a large number of notifications at once
curl -s "http://localhost:4000/api/v1/notifications?limit=500" \
  -b cookies.txt | jq .count
```

**Expected:** `DATA_EXFIL_BULK_READ` MEDIUM alert if 100+ records returned.

---

### 10. Privilege Escalation — Non-Admin Endpoint Access

Create a regular (non-admin) user, login, then try to hit the SOC admin endpoint:

```bash
# Signup a regular user
curl -s -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Attacker","email":"attacker@evil.com","password":"password123"}' \
  -c attacker.txt

# Attempt to access the admin SOC route
curl -s http://localhost:4000/api/soc/alerts \
  -b attacker.txt
```

**Expected:** 403 response + `PRIVILEGE_ESCALATION` CRITICAL alert for the unauthorized attempt.

---

### 11. Manual SOAR Actions (admin)

Test all automated-response triggers manually via API:

```bash
# Login as admin first
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@notifyflow.dev","password":"password"}' \
  -c admin.txt

# Block an IP
curl -s -X POST http://localhost:4000/api/soc/alerts/actions/block-ip \
  -H "Content-Type: application/json" \
  -b admin.txt \
  -d '{"ip":"1.2.3.4","reason":"Test block","hours":1}'

# Revoke an API key
curl -s -X POST http://localhost:4000/api/soc/alerts/actions/revoke-key \
  -H "Content-Type: application/json" \
  -b admin.txt \
  -d '{"keyId":"YOUR_KEY_ID","reason":"Test revoke"}'

# Invalidate all sessions for a user
curl -s -X POST http://localhost:4000/api/soc/alerts/actions/invalidate-sessions \
  -H "Content-Type: application/json" \
  -b admin.txt \
  -d '{"userId":"USER_ID","reason":"Test invalidation"}'

# Force password reset
curl -s -X POST http://localhost:4000/api/soc/alerts/actions/force-reset \
  -H "Content-Type: application/json" \
  -b admin.txt \
  -d '{"userId":"USER_ID","reason":"Test force reset"}'
```

---

### 12. View Live Risk Scores

```bash
curl -s http://localhost:4000/api/soc/alerts/risk-scores \
  -b admin.txt | jq .
```

**Expected:** JSON map of `userId` or `IP` → `{ score, events[] }` with contributing risk events.

---

### 13. Alert Correlation (Multi-Signal Attack)

Trigger 3+ different signals for the same IP within 10 minutes to see the correlation engine fire:

```bash
# Step 1: Brute force (6 failures)
for i in {1..6}; do
  curl -sf -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"victim@notifyflow.dev","password":"wrong"}' &
done
wait

# Step 2: Use a bot User-Agent
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "User-Agent: python-requests/2.28" \
  -d '{"email":"test@notifyflow.dev","password":"password"}'

# Step 3: Hit the API from the same IP multiple times to trigger rate limit
API_KEY="your_key_here"
for i in {1..15}; do
  curl -sf -X POST http://localhost:4000/api/v1/send \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d '{"channel":"inapp","to":"x","body":"spam"}' &
done
wait
```

**Expected:** `CORRELATED_ATTACK` CRITICAL alert combining `BRUTE_FORCE + SUSPICIOUS_UA + API_SPIKE` signals.
