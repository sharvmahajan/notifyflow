# NotifyFlow Dashboard

A enterprise-grade React dashboard for managing notifications, API keys, and platform security. Built with a focus on **Rich Aesthetics**, real-time data, and seamless developer experience.

## ✨ Key Features

- **Live Analytics**: Real-time visualization of notification volume and delivery rates.
- **Key Management**: Full lifecycle controls (Pause, Resume, Revoke) with confirmation safeguards.
- **Per-API Dashboards**: Draggable and interactive charts for deep-diving into specific key performance.
- **SOC Center**: Admin-only interface for managing threat alerts, IP blocks, and SOAR responses.
- **Template Builder**: Dynamic UI for creating and testing message templates with variables.

## 🏗 Architecture

The frontend is a **Vite-powered Single Page Application (SPA)** written in **TypeScript**.

### Core Stack
- **Styling**: Tailwind CSS (Modular utility-first approach).
- **Icons**: Lucide React.
- **Charts**: Recharts (Custom themed for Dark Mode).
- **Routing**: React Router v6.
- **API Client**: Axios (with interceptors for automatic JWT refresh).

### Folder Structure
- `/src/pages`: Main view components (e.g., `ApiAnalytics.tsx`, `Dashboard.tsx`).
- `/src/api`: Centralized API service layer.
- `/src/context`: Global state (Auth & WebSocket connectivity).
- `/src/components`: Atomic UI components and Layout wrappers.

## 🎨 Design System

We follow a **Glassmorphism & Dark Mode** design philosophy:
- **Surface**: Custom palette for high-contrast visibility.
- **Micro-animations**: Lucide icons and Tailwind transitions for interactive elements.
- **Consistency**: All metrics cards, tables, and buttons follow a predefined design token system in `tailwind.config.ts`.

## 🛠 Development

### Setup
1. Install dependencies: `npm install`
2. Configure `.env` (pointing to `VITE_API_URL`).
3. Start dev server: `npm run dev`

### API Integration
New endpoints should be registered in `/src/api/` using the instance that includes the token refresh logic.

### Protected Routes
Routes are wrapped in `ProtectedRoute` components to ensure only authenticated users (or admins) can access specific sections like the SOC Dashboard.
