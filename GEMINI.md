# GEMINI.md

This file provides context and guidance for Gemini when working with the VIBES codebase.

## Project Overview

**VIBES** (Platform for Vibe Coding) is a full-stack educational platform designed to teach AI-assisted web development. It features a modern, interactive UI and a robust backend to manage users, content, and AI interactions.

**Key Technologies:**
-   **Frontend:** React 19, TypeScript 5.8, Vite 6, Framer Motion, Tailwind CSS.
-   **Backend:** Vercel Serverless Functions (Node.js), Express (for local dev).
-   **Database:** PostgreSQL.
-   **AI Integration:** Google Gemini API.

## Architecture

### Frontend (`/views`, `/components`)
-   Built with **React 19** and **Vite**.
-   **Routing:** Client-side routing via `App.tsx` (custom implementation or simple conditional rendering based on state).
-   **Styling:** Tailwind CSS (likely via CDN or global styles) + Framer Motion for animations.
-   **State Management:** React Context (`SoundContext.tsx`) and local state.

### Backend (`/api`)
-   **Production:** Deployed as Vercel Serverless Functions. Each file in `api/` corresponds to an endpoint.
-   **Local Development:** A custom Express server (`dev-server.js`) runs on port **3001** and dynamically loads TypeScript files from `api/` to mimic Vercel's behavior.
-   **Database Access:** `api/_lib/db.ts` provides a connection pool to PostgreSQL.

### Database (`/database`)
-   **PostgreSQL** is used for persistence.
-   **Schema:** Defined in `database/schema.sql`.
-   **Seeding:** Data can be seeded using `database/seed.sql`.

## Development Workflow

### Prerequisites
-   Node.js (v18+ recommended)
-   PostgreSQL database

### Setup
1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Environment Variables:**
    Create `.env.local` with the following:
    ```env
    GEMINI_API_KEY=your_gemini_key
    DATABASE_URL=postgres://user:pass@host:port/dbname
    JWT_SECRET=your_jwt_secret
    ```

### Running Locally
To start the development environment (both Frontend and Backend):

```bash
npm run dev
```

-   **Frontend:** http://localhost:3000
-   **Backend API:** http://localhost:3001 (Proxied from localhost:3000/api)

### Database Management
Apply schema and seed data manually using `psql`:

```bash
psql -h HOST -U USER -d DBNAME -f database/schema.sql
psql -h HOST -U USER -d DBNAME -f database/seed.sql
```

## Directory Structure

| Path | Description |
| :--- | :--- |
| **`api/`** | Backend API routes (Vercel Serverless Functions). |
| &nbsp;&nbsp;`_lib/` | Shared backend utilities (DB connection, Auth). |
| **`components/`** | Reusable React UI components (Sidebar, Shared, etc.). |
| **`views/`** | Main page components (Home, Dashboard, Lessons, etc.). |
| **`database/`** | SQL files for schema and seeding. |
| **`App.tsx`** | Main application entry point and routing logic. |
| **`dev-server.js`** | Local Express server for mocking Vercel API routes. |
| **`types.ts`** | Global TypeScript type definitions. |
| **`vite.config.ts`** | Vite configuration (Port 3000, API proxy). |

## Conventions

-   **Imports:** Use the `@/` alias to refer to the project root (e.g., `import { User } from '@/types'`).
-   **API:** All API routes are strictly typed and located in `api/`.
-   **Styles:** Tailwind CSS utility classes are used for styling.
-   **Strict Mode:** TypeScript strict mode is enabled.

## Interaction Guidelines

-   **Language:** Always respond in Russian (Русский).
