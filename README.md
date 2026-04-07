<div align="center">
  <h1>NotifyFlow</h1>
  <p>A multi-tenant Notification-as-a-Service platform.</p>
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

## 🧩 Architecture

- **`backend/`**: Driven by the Express MVC pattern. Abstractions like `ProviderFactory` allow swapping logic seamlessly. Rate limits are applied (100req/min) on API ingestion.
- **`frontend/`**: Vite SPA utilizing `axios` interceptors for seamless token refresh cycles. Protected routing via React Context.

```
├── backend/                  # Express APIs, Prisma, Socket.io
│   ├── prisma/               # Schema and Seeds
│   └── src/                  # Service Layer, Routes, Providers
├── frontend/                 # React UI
│   └── src/
│       ├── api/              # Axios endpoints and interceptors
│       ├── components/       # Layouts, UI Modules
│       ├── context/          # Auth and Socket connections
│       └── pages/            # View components
├── docker-compose.yml        # Orchestration
└── Makefile                  # Task commands
```
