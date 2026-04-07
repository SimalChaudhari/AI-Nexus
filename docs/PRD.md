# AI Nexus — Product Requirements Document (PRD)

**Document type:** As-implemented summary derived from the AI-Nexus frontend and backend codebases.  
**Last updated:** April 7, 2026

---

## 1. Executive summary

**AI Nexus** is a web platform that combines public marketing and community surfaces (home, learning catalog, AI forum, announcements, AI resources/workflows, prompts) with authenticated experiences (course purchase and enrollment, learning player, profile) and an **Admin** console for content and user management. The system is built as a **React (Vite) SPA** talking to a **NestJS** API backed by **PostgreSQL** (TypeORM), with optional **real-time updates via Socket.IO** on the frontend.

---

## 2. Goals and success criteria

| Goal | Success indicator (product) |
|------|-----------------------------|
| Discover and purchase courses | Users can browse courses, pay via hosted checkout, and gain enrollment |
| Learn in-product | Authenticated users access a course player for enrolled content |
| Community engagement | Users read and participate in announcements and AI forum posts/comments |
| AI tooling content | Users browse workflows (“AI resources”) and assistant-specific prompt catalogs |
| Operations | Admins manage users, categories, content modules, and see dashboard metrics |

---

## 3. Personas and roles

| Role | Description |
|------|-------------|
| **Guest** | Unauthenticated visitor; public pages and optional JWT-aware reads where supported |
| **User** | Registered user (`User` role): profile, cart, checkout, enrollment, learning player, forum participation |
| **Admin** | Full admin dashboard (`Admin` role): CRUD for managed entities, uploads, dashboard stats, app settings |

**Auth providers (backend):** Local email/password with verification and password reset; **OAuth** flow (`/auth/oauth`) with code exchange and user sync.

---

## 4. Technical architecture

### 4.1 Frontend (`AI-Nexus-frontend`)

- **Stack:** React 18, Vite, MUI, React Router, Axios, Socket.IO client, SWR, Redux Toolkit (among other UI/libs from the Minimals template).
- **Config:** `VITE_SERVER_URL` (API base, default `http://localhost:3000/api`), optional `VITE_SOCKET_ENABLED` for production WebSocket constraints (see README).
- **Auth (app):** `CONFIG.auth.method: 'simple'` — JWT/session style integration with the Nest backend (guards: `AuthGuard`, `PublicGuard`, `RoleBasedGuard` for Admin routes).

### 4.2 Backend (`AI-Nexus-backend`)

- **Stack:** NestJS 10, TypeORM, PostgreSQL, JWT, Swagger, Socket.IO, scheduled tasks, email (Nest mailer), file handling (multer, local storage, Cloudinary usage elsewhere in deps), WooshPay for payments.
- **Deployment notes:** DB URL supports Supabase-style pooler; connection pool sized for serverless (`max: 1`). Health endpoints on `/` and `/health`.

### 4.3 Major API surface (controllers)

| Prefix | Purpose |
|--------|---------|
| `/auth` | Register, login, forgot/reset password, verify email, logout |
| `/auth/oauth` | OAuth URL, exchange, SSO sync |
| `/users`, `/admin` | User profiles and admin user operations |
| `/categories`, `/labels`, `/tags` | Taxonomy for content |
| `/courses` | Courses, modules, sections, progress, favorites, enrollments, question bank, uploads |
| `/announcements` | Announcements (and related comment flows as implemented) |
| `/posts` | AI forum posts and comments (paginated list, views, CRUD) |
| `/speakers` | Speaker/instructor entities |
| `/reviews` | Course/speaker reviews |
| `/workflows` | AI workflows/resources (public list/read; admin create/update/delete with image upload) |
| `/prompt-catalog` | External Prompt Advance JSON (`chatgpt`, `claude`, `gemini`) |
| `/cart` | Authenticated cart (items, discount) |
| `/payments` | WooshPay checkout creation, confirm, status, mark-failed, webhook |
| `/orders` | Order lifecycle tied to payments |
| `/dashboard` | Admin-only stats, recent orders, top-rated courses |
| `/app-settings` | Public settings + admin logo/site configuration |
| `/languages` | Language resources |

---

## 5. Functional requirements (by area)

### 5.1 Public marketing and content

- **Home, about, contact, FAQs:** Standard informational routes under main layout.
- **Categories:** Browse category taxonomy.
- **Blog / posts:** Post list and detail by title slug (template routes).
- **Announcements:** List and detail; real-time list updates when Socket.IO is enabled.
- **AI Forum:** List (pagination, search, optional pinned filter for logged-in user), detail, view increments; authenticated create/update/delete for posts and comments as implemented in `AiForumController`.
- **Learning:** Course catalog and course detail; **course player** requires authentication.
- **Speakers:** Instructor detail pages (`/speaker/:id`).
- **AI resources (workflows):** List at `/ai-resources`, detail `/ai-resources/:id`, prompt views `/ai-resources/prompt/:provider`.
- **Product / checkout UI:** Routes under `/product` (list, detail, checkout, success) aligned with cart and payment backend.

### 5.2 Authentication and account

- Register, login, email verification, resend verification, forgot/reset password, logout.
- OAuth: authorization URL + code exchange returning app tokens and user payload.
- Profile routes: `/profile`, `/user/profile`, and legacy `/dashboard/user/*` for account areas; layout switches **DashboardLayout** for Admin vs **MainLayout** for User.

### 5.3 Commerce

- **Cart:** Server-side cart per user (get, replace, add item, remove item, patch quantity, optional discount).
- **Checkout:** Backend creates WooshPay session from cart line items (courses as UUIDs); stores **payment reference** in DB; returns redirect URL. Success/cancel URLs support `ref` query param.
- **Post-payment:** `confirm-payment`, `status`, webhook fulfillment enrolls user in courses and creates **order** (idempotent). Failed/canceled flows and verification-failure handling documented in payment controller.

### 5.4 Learning (courses)

- Full course domain on backend: modules, sections, watch progress, favorites, enrollment, question bank checks, file uploads — exposed through `courses.controller.ts` (admin vs public guards vary by route).
- Frontend `course.service.js` and learning pages consume these APIs.

### 5.5 Reviews and ratings

- Create/update/delete reviews; list with filters (`courseId`, `speakerId`, `userId`).

### 5.6 Admin console (`/admin/*`)

- **Access:** `RoleBasedGuard` accepts only `Admin`; others redirect to `/home`.
- **Includes (non-exhaustive):** Dashboard home, analytics-style overview pages (template), **user** CRUD, **category** CRUD, **announcement** CRUD, **workflow** management, **blog/post** management, **job**, **tour**, file manager, mail/chat/calendar/kanban (template), **settings**, admin profile.
- **Dashboard API:** `GET /dashboard/stats`, `recent-orders`, `top-rated-courses`.

### 5.7 App settings

- Public `GET /app-settings` for client branding/config.
- Admin-only logo upload and related settings endpoints.

---

## 6. Non-functional requirements (observed)

- **Security:** JWT guards, session guard on sensitive admin routes, role-based access, optional webhook signature verification for payments (env-controlled).
- **Performance / scale:** DB connection limiting for pooler/serverless; idempotent order fulfillment.
- **Real-time:** Socket.IO for announcements/questions/comments lists; **not** on Vercel serverless backend without a WebSocket-capable host — frontend can disable via `VITE_SOCKET_ENABLED=false`.
- **Observability:** Health checks; structured console logging in payment flows.

---

## 7. Out of scope / template carryover

The frontend retains **Minimals** dashboard modules (e.g. job, tour, mail, kanban) that may be demo or partially wired. Treat as **template surface** unless each route is verified against production APIs and product goals.

---

## 8. Open questions for product owners

1. Which admin sections are **production** vs **demo-only**?
2. Single payment provider (WooshPay) — are alternate providers required?
3. Target deployment: same host for API + WebSockets, or split (Vercel + Railway)?
4. Should forum/announcement moderation workflows be specified (reports, bans beyond `UserStatus`)?

---

## 9. Repository map

| Path | Role |
|------|------|
| `AI-Nexus-frontend/` | Vite React SPA, routes under `src/routes/`, API clients under `src/services/` |
| `AI-Nexus-backend/` | NestJS API, modules under `src/*/`, `app.module.ts` for composition |

---

*End of PRD.*
