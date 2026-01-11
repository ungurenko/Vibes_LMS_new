# GEMINI.md

This file provides context and guidance for Gemini when working with the VIBES codebase.

## Project Overview

**VIBES** (Platform for Vibe Coding) is a full-stack educational platform designed to teach AI-assisted web development. It features a modern, interactive UI and a robust backend to manage users, content, and AI interactions.

**Key Technologies:**
-   **Frontend:** React 19, TypeScript 5.8, Vite 6, Framer Motion, Tailwind CSS, Lucide React.
-   **Backend:** Vercel Serverless Functions (Node.js).
-   **Database:** PostgreSQL (accessed via `pg` driver).
-   **AI Integration:** OpenRouter API (utilizing models like `google/gemini-2.5-flash-lite`).

## Architecture

### Frontend (`/views`, `/components`)
-   Built with **React 19** and **Vite**.
-   **Routing:** Client-side routing via `App.tsx` (using state-based conditional rendering).
-   **Styling:** Tailwind CSS + Framer Motion.
-   **State Management:** React Context (`SoundContext.tsx`) and local state.

### Backend (`/api`)
-   **Structure:** Vercel Serverless Functions located in `api/`. Each file exports a default handler function.
-   **Runtime:**
    -   **Local:** `dev-server.js` (Express) mimics Vercel's behavior by dynamically loading `.ts` files from `api/`.
    -   **Production:** Deployed as Vercel Serverless Functions.
-   **Database Access:** `api/_lib/db.ts` provides a connection pool to PostgreSQL.

### Database (`/database`)
-   **PostgreSQL** is used for persistence.
-   **Schema:** Defined in `database/schema.sql`.
-   **Seeding:** Data can be seeded using `database/seed.sql` or `database/seed_from_data.sql`.

## Development Workflow

### Prerequisites
-   Node.js (v20+ recommended)
-   PostgreSQL database

### Setup
1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Environment Variables:**
    Create `.env.local` with the following:
    ```env
    DATABASE_URL=postgres://user:pass@host:port/dbname
    JWT_SECRET=your_jwt_secret
    OPENROUTER_API_KEY=your_openrouter_key
    ```

### Running Locally
To start the development environment (Frontend + Backend API):

```bash
npm run dev
```

This command runs:
-   **Frontend:** http://localhost:3000 (`vite`)
-   **Backend API:** http://localhost:3001 (`tsx dev-server.js`)
    -   *Note:* The frontend proxies `/api` requests to localhost:3001.

### Building for Production
The project is configured for Vercel deployment:
1.  **Build:** `npm run build` (Compiles Frontend to `dist/`).
2.  **API:** Vercel automatically handles the `api/` directory as Serverless Functions.

## Directory Structure

| Path | Description |
| :--- | :--- |
| **`api/`** | Backend API routes (Vercel Serverless Functions). |
| &nbsp;&nbsp;`_lib/` | Shared backend utilities (DB connection, Auth). |
| **`components/`** | Reusable React UI components. |
| **`views/`** | Main page components. |
| **`database/`** | SQL files for schema and seeding. |
| **`App.tsx`** | Main application entry point and routing logic. |
| **`dev-server.js`** | Local Express server for mocking Vercel API routes. |
| **`types.ts`** | Global TypeScript type definitions. |
| **`vite.config.ts`** | Vite configuration (Port 3000, API proxy). |
| **`vercel.json`** | Vercel configuration (rewrites, headers). |

## Conventions

-   **Imports:** Use the `@/` alias to refer to the project root (e.g., `import { User } from '@/types'`).
-   **API:** All API routes are strictly typed (using `VercelRequest`/`VercelResponse` types) and located in `api/`.
-   **Styles:** Tailwind CSS utility classes are used for styling.
-   **Strict Mode:** TypeScript strict mode is enabled.

## Interaction Guidelines

-   **Language:** Always respond in Russian (Русский).
