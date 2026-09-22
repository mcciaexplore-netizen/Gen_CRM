# MSME CRM — Master Plan (PLAN.md)

**Codename:** SahayakCRM _(placeholder name — rename freely)_
**Goal:** A generalized, mobile-first, WhatsApp-native CRM for Indian MSMEs/SMEs, simple enough to onboard in under 30 minutes, priced to scale down to micro-businesses, and architected to comfortably serve 2,000+ businesses on shared infrastructure.

**Scope note:** Inventory & Stock module is explicitly **excluded** from this build. The product covers customer/lead management, communication, sales pipeline, and GST-compliant billing only. Inventory can be revisited as a future optional module without re-architecting the core (see Section 9).

---

## 1. Product Scope

### 1.1 In scope (Core Modules)

1. **Auth & Multi-tenant Business Setup** — one business = one tenant, owner + team members, roles.
2. **Contact & Lead Management** — unified customer/lead records, sources, tags, custom fields.
3. **Unified Communication Inbox** — WhatsApp Business API + SMS + email + manual call-log, threaded per contact.
4. **Sales Pipeline** — configurable kanban deal stages, quotation → order → invoice flow.
5. **Billing & GST Compliance** — GST-compliant invoices, e-invoice/IRN generation (via compliance API partner), payment reminders, receivables aging.
6. **Task & Follow-up Engine** — reminders, assignment, notifications (this directly targets the #1 MSME failure mode: missed follow-ups).
7. **Team & Role Management** — Owner / Sales Staff / Accountant roles with scoped permissions.
8. **Reporting & Owner Dashboard** — pipeline value, receivables due, top customers, WhatsApp-delivered daily/weekly digest.

### 1.2 Explicitly out of scope for this build

- Inventory & Stock management (removed per requirement)
- Multi-branch/location stock sync (depends on inventory — removed)
- Native mobile apps (Phase 1 ships as a responsive PWA; native wrapper is a later phase, see Section 9)
- AI-drafted replies / voice-to-task (Phase 3+, optional)

### 1.3 Non-negotiable design principles

- Mobile-first responsive UI (works great on a ₹10k Android phone browser)
- Zero-training onboarding — guided setup wizard, sane defaults
- WhatsApp/conversation as a primary interface, not just a bolt-on
- India-compliance native (GST, HSN/SAC, e-invoice threshold logic)
- Flat, low pricing tiers — infra costs must stay low per tenant
- Every table/query scoped by `business_id` from day one — no retrofitting multi-tenancy later

---

## 2. Tech Stack (kept deliberately simple — optimized for one small team to build, deploy, and operate)

| Layer              | Choice                                                                                    | Why                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Frontend           | **Next.js 14 (App Router) + TypeScript + Tailwind CSS**                                   | SSR for fast mobile loads, one codebase for web + PWA, huge ecosystem, easy hiring           |
| UI Components      | **shadcn/ui**                                                                             | Free, accessible, no vendor lock-in, easy to theme                                           |
| Backend API        | **Node.js + NestJS (TypeScript)**                                                         | Structured, modular by design (matches our module-based product), easy to test               |
| Database           | **PostgreSQL** (managed: Neon / Supabase / Railway Postgres)                              | Relational integrity for financial/invoice data, row-level multi-tenancy support             |
| ORM                | **Prisma**                                                                                | Type-safe queries, easy migrations, fast onboarding for new devs                             |
| Cache / Queues     | **Redis + BullMQ**                                                                        | Follow-up reminders, scheduled WhatsApp digests, retry-safe background jobs                  |
| Auth               | **JWT (access + refresh) + bcrypt**, optionally Clerk/Auth.js later                       | Simple to self-host, no vendor dependency at MVP stage                                       |
| WhatsApp           | **Official WhatsApp Business API via a BSP** (Interakt, Gupshup, or 360dialog — pick one) | Don't build WABA integration from scratch; BSPs handle Meta approval, templates, rate limits |
| GST / e-Invoicing  | **Third-party GSP/compliance API** (e.g., ClearTax API or similar GSP)                    | Avoid building direct GSTN/IRP integration in-house; compliance rules change often           |
| Email              | **Resend** or **SendGrid**                                                                | Transactional email (invoices, password reset)                                               |
| File/Doc storage   | **Cloudflare R2** (S3-compatible)                                                         | Cheaper than AWS S3, simple API                                                              |
| Hosting (App)      | **Railway or Render** (MVP) → migrate to AWS/GCP only if scale demands                    | One-click deploy, managed Postgres/Redis add-ons, minimal DevOps overhead                    |
| Hosting (Frontend) | **Vercel**                                                                                | Native Next.js hosting, free tier covers early stage                                         |
| Monitoring         | **Sentry** (errors) + **Better Uptime/UptimeRobot** (uptime)                              | Cheap, fast to wire up                                                                       |
| CI/CD              | **GitHub Actions**                                                                        | Free for small teams, simple pipelines                                                       |

**Why this stack is "straightforward and easy to deploy":**

- Single language (TypeScript) across frontend + backend — one hiring pool, shared types.
- Everything has a generous free/cheap tier and a managed hosting option — no Kubernetes, no manual server patching at MVP stage.
- Monorepo means one `git clone` + one `docker compose up` gets a new developer running locally in minutes.

---

## 3. Multi-Tenancy Model

- **Single database, shared schema, `business_id` column on every business-scoped table** (not database-per-tenant). This is the simplest model to build, migrate, and operate at 2,000+ tenant scale, and Postgres handles this comfortably with proper indexing.
- Every API request is scoped by `business_id` derived from the authenticated user's JWT — enforced at a middleware/interceptor level, never trusted from client input.
- Add a Postgres index on `business_id` for every business-scoped table as a hard rule in code review.
- Soft-delete pattern (`deleted_at`) instead of hard deletes, for auditability (important for financial/invoice data).

---

## 4. High-Level Data Model (entities, not full schema)

```
Business (tenant)
 ├─ Users (owner, staff, accountant) — role, business_id
 ├─ Contacts (customers/leads) — source, tags, custom_fields(jsonb), business_id
 ├─ Conversations — channel (whatsapp/sms/email/call), contact_id
 │    └─ Messages — direction, body, status, conversation_id
 ├─ Deals/Pipeline — stage, value, contact_id, assigned_to
 ├─ Quotations — line_items(jsonb), contact_id, deal_id
 ├─ Invoices — GST fields (HSN, tax %, IRN, QR), status, due_date, contact_id
 ├─ Payments — invoice_id, amount, method, paid_at
 ├─ Tasks/Reminders — due_at, assigned_to, related_entity (contact/deal/invoice)
 └─ ActivityLog — audit trail, actor_id, entity, action, timestamp
```

Use `jsonb` for custom fields and line items so the schema stays generalized across business types (retailer, service provider, distributor) without needing per-industry tables.

---

## 5. Repository / Folder Structure (monorepo)

```
msme-crm/
├─ apps/
│  ├─ web/                # Next.js frontend (PWA)
│  │  ├─ app/
│  │  ├─ components/
│  │  ├─ lib/
│  │  └─ public/
│  └─ api/                 # NestJS backend
│     ├─ src/
│     │  ├─ modules/
│     │  │  ├─ auth/
│     │  │  ├─ business/
│     │  │  ├─ contacts/
│     │  │  ├─ conversations/
│     │  │  ├─ pipeline/
│     │  │  ├─ billing/
│     │  │  ├─ tasks/
│     │  │  └─ reports/
│     │  ├─ common/         # guards, interceptors, decorators
│     │  └─ main.ts
│     └─ prisma/
│        └─ schema.prisma
├─ packages/
│  ├─ shared-types/         # TS types shared between web & api
│  └─ ui/                   # shared design tokens/components (optional)
├─ docker-compose.yml        # local Postgres + Redis
├─ .github/workflows/         # CI/CD
└─ PLAN.md
```

---

## 6. Deployment Strategy (kept simple on purpose)

**Local development**

1. `docker compose up` → spins up Postgres + Redis locally
2. `pnpm install` at root (pnpm workspaces for monorepo)
3. `pnpm --filter api prisma migrate dev`
4. `pnpm dev` → runs both web and api concurrently

**Production (MVP — no DevOps team needed)**

1. **Frontend** → deploy `apps/web` to Vercel (connect GitHub repo, auto-deploy on push to `main`)
2. **Backend** → deploy `apps/api` to Railway or Render (managed Postgres + Redis add-ons in the same project)
3. **Secrets** → store WhatsApp BSP keys, GST API keys, DB URL, JWT secret in the hosting platform's env vars — never in code
4. **Domain** → single custom domain, `app.yourbrand.com` (frontend) and `api.yourbrand.com` (backend)
5. **Migrations** → run `prisma migrate deploy` as a release step in CI before the new backend version goes live

**Scaling path (only when actually needed, not upfront)**

- Add read replicas to Postgres before considering sharding
- Move background jobs to a dedicated worker dyno/service if queue volume grows
- Only consider AWS/GCP + containers/Kubernetes once you outgrow Railway/Render limits — don't over-engineer at 2,000-tenant scale, this stack handles it comfortably.

---

## 7. Non-Functional Requirements

- **Target scale:** 2,000+ businesses, ~10 users per business average → design for ~20,000 concurrent-capable users, comfortably handled by a single well-indexed Postgres instance + horizontal API instances behind a load balancer.
- **Performance:** P95 API response < 300ms for CRUD endpoints; WhatsApp message ingestion via webhook queued and processed asynchronously (never block the webhook response).
- **Security:** JWT with short-lived access tokens + refresh rotation, role-based access control, encrypted secrets, HTTPS everywhere, GST/financial data audit-logged.
- **Compliance:** Data localization awareness (host in an India region if using AWS/GCP, or confirm hosting provider's India data residency options), GST invoice numbering rules (sequential, non-editable once issued).
- **Reliability:** Automated daily DB backups, uptime monitoring, error alerting via Sentry.
- **Localization:** UI text externalized via i18n from day one (even if only English ships in Phase 1) so Hindi/regional language addition later doesn't require refactoring.

---

## 8. Pricing Tiers (guides feature-gating logic in code)

| Tier     | Price        | Includes                                                               |
| -------- | ------------ | ---------------------------------------------------------------------- |
| Free     | ₹0           | 1 user, 100 contacts, manual WhatsApp logging (no API), basic pipeline |
| Starter  | ₹499/mo flat | Up to 3 users, WhatsApp Business API, GST invoicing, reminders         |
| Growth   | ₹999/mo flat | Up to 10 users, all Phase 1+2 features, WhatsApp broadcast, reports    |
| Business | Custom       | 10+ users, priority support, custom fields at scale                    |

Flat per-business pricing (not per-seat) is a deliberate MSME-fit decision — see prior research on cost sensitivity.

---

## 9. Roadmap (Phases — feed each phase to the AI coding agent separately, see PROMPTS.md)

- **Phase 0:** Repo scaffolding, auth, multi-tenancy, business setup wizard
- **Phase 1 (MVP core):** Contacts, Pipeline, WhatsApp inbox, GST Invoicing, Follow-up reminders, Owner dashboard
- **Phase 2:** Team roles/permissions, receivables/aging reports, email + SMS channels, i18n groundwork
- **Phase 3:** WhatsApp broadcast campaigns, AI-assisted reply suggestions, marketplace lead auto-import (IndiaMART/JustDial webhook)
- **Phase 4 (optional, future):** Inventory & Stock module (re-introduce as a toggleable module using the same `jsonb`-extensible pattern), native mobile app wrapper (Capacitor/React Native), multi-branch support

---

## 10. Success Metrics (for the build team, not the pitch deck)

- Time from signup to first WhatsApp message logged: < 15 minutes
- % of leads with at least one follow-up task auto-created: 100% (system-enforced, not optional)
- Invoice generation to GST-compliant PDF: < 5 seconds
- Infra cost per tenant at 2,000 businesses: kept low enough that Free + Starter tiers remain profitable at scale (validate this in Phase 1 with real usage data before Phase 2 pricing lock-in)

---

_Next step: open PROMPTS.md and start with the "Phase 0" prompt in your AI coding tool of choice (Claude Code recommended, given the TypeScript-heavy stack)._
