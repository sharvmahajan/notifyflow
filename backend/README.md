# NotifyFlow Backend

The core engine of the NotifyFlow platform, responsible for API ingestion, notification orchestration, security detection (SOC), and analytics aggregation.

## 🏗 Architecture

The backend is built with **Node.js** and **Express**, utilizing **Prisma** as the ORM for **PostgreSQL**. It follows a modular service-oriented architecture:

- **Routes**: Handle HTTP requests and apply middleware.
- **Middleware**: Manages Auth (JWT), API Key validation, and Security (SOC) filtering.
- **Services**: Contain the business logic for Notifications, API Keys, and Analytics.
- **Provider System**: Abstracted factory for multi-channel delivery (Email, SMS, Push, Webhooks).
- **SOC Engine**: Modular detection system for real-time threat analysis.

## 🔐 Security & Lifecycle

### API Key Middleware
The platform uses a high-performance middleware that validates API keys via `bcrypt`. 
- **Environment Aware**: Keys are tagged as `live` or `test`.
- **Lifecycle Enforcement**: Keys can be in `ACTIVE`, `PAUSED`, or `DELETED` states. 
    - `PAUSED` keys reject triggers but record the attempt for analytics.
    - `DELETED` keys return `404 Not Found` to conceal their existence.

### SOC (Security Operations Center)
Integrated logic to detect and respond to threats:
- **Honeypots**: Fake endpoints and keys that trigger immediate IP blocks.
- **Behavioral Analysis**: Detects deviations from moving average usage patterns.
- **SOAR**: Automated response logic to block IPs or revoke suspicious sessions.

## 📊 API Reference

### Notifications
- `POST /api/v1/send`: Trigger a single notification.
- `POST /api/v1/send-batch`: Trigger notifications to multiple recipients.

### API Keys
- `GET /api/keys`: List all keys.
- `POST /api/keys`: Create a new key.
- `PATCH /api/keys/:id/pause`: Pause a key.
- `PATCH /api/keys/:id/resume`: Resume a key.
- `DELETE /api/keys/:id`: Soft-delete a key.

### Analytics
- `GET /api/analytics/summary`: Global account-wide metrics.
- `GET /api/keys/:id/analytics`: Detailed time-series data for a specific API key.

## 🛠 Setup & Development

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis (Optional, for advanced rate limiting)

### Environment Variables
Key variables required in `.env`:
```env
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret"
SENDGRID_API_KEY="sg-..." # Fallbacks to console if missing
TWILIO_AUTH_TOKEN="..."    # Fallbacks to console if missing
```

### Prisma Commands
```bash
npx prisma generate    # Regenerate client
npx prisma migrate dev # Apply migrations
npx prisma studio      # View data in browser
```

## 📜 Database Schema
Simplified Model Overview:
- `User`: Handles dashboard access and multi-tenancy.
- `ApiKey`: Stores prefixes and hashes for external application access.
- `Notification`: The source of truth for all delivery logs (delivered, failed, paused).
- `ApiAnalytics`: Aggregated daily snapshots for high-performance reporting.
