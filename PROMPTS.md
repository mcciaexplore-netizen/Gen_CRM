# PROMPTS.md — Phase-Wise Prompts for AI Coding Agent

How to use this file:
- Give the AI coding agent (Claude Code, Cursor, etc.) access to **PLAN.md** first, in the same repo/session, so it has full context.
- Run prompts **in order**. Don't skip ahead — each phase assumes the previous one is merged and working.
- After each phase, actually run the app locally and click through it before moving to the next prompt. Don't chain all phases blind.

---

## PHASE 0 — Repo Scaffolding, Auth, Multi-Tenancy

```
You are building the foundation of a multi-tenant SaaS CRM for Indian MSMEs, per the attached PLAN.md. Read PLAN.md fully before writing any code.

Set up the monorepo exactly as described in Section 5 of PLAN.md:
- pnpm workspaces monorepo with apps/web (Next.js 14 App Router, TypeScript, Tailwind, shadcn/ui) and apps/api (NestJS, TypeScript, Prisma, PostgreSQL)
- docker-compose.yml for local Postgres + Redis
- packages/shared-types for types shared between web and api

Build the following in apps/api:
1. Prisma schema with a Business model and a User model. Every business-scoped table must include a `business_id` foreign key and an index on it — treat this as a hard rule for every model you create from now on.
2. Auth module: signup (creates a Business + first User as "owner" role in one transaction), login, JWT access token (15 min expiry) + refresh token (7 day expiry, stored hashed in DB), logout, password hashing with bcrypt.
3. A global auth guard + a "CurrentBusiness" decorator/interceptor that extracts business_id from the JWT and makes it available to every controller — no endpoint should ever trust a business_id passed from the client body/query.
4. Role enum: OWNER, STAFF, ACCOUNTANT. Just define the roles and a basic RolesGuard for now — full permission logic comes in Phase 2.
5. A simple health-check endpoint.

Build the following in apps/web:
1. Signup page: business name, owner name, email, phone, password → calls the signup API → redirects to a guided setup wizard.
2. Guided setup wizard (single page, 3 short steps max): business type (retailer/service/distributor/manufacturer — just a dropdown, store as a string field for now), team size, "add your first contact" prompt. Keep this under 2 minutes to complete — this is the #1 onboarding metric from PLAN.md Section 10.
3. Login page.
4. A protected dashboard shell (sidebar + topbar) that all future modules will render into. Leave the dashboard body as a placeholder "Welcome" card for now.
5. Mobile-first responsive layout — test at 375px width as the primary viewport, not desktop.

Deliverables: working signup → wizard → dashboard flow, runnable via `docker compose up` + `pnpm dev`. Write a README with exact setup steps. Do not build any CRM features yet — this phase is foundation only.
```

---

## PHASE 1 — MVP Core (Contacts, Pipeline, WhatsApp Inbox, GST Invoicing, Reminders, Dashboard)

Run this as **sub-phases** (1a–1f) — don't ask the agent to do all of Phase 1 in one shot, it's too large.

### Phase 1a — Contacts & Leads
```
Continuing the MSME CRM from PLAN.md and the Phase 0 foundation already built.

Build the Contacts module (apps/api: contacts module; apps/web: /contacts pages):
- Contact model: name, phone, email, source (enum: whatsapp/website/marketplace/walk-in/referral/other), tags (string array), custom_fields (jsonb), business_id, created_by, timestamps, deleted_at (soft delete).
- CRUD API, scoped to business_id via the existing auth guard from Phase 0.
- Duplicate detection on phone number within the same business — warn, don't hard-block.
- Web UI: contact list (searchable, filterable by tag/source), contact detail page (empty tabs for "Conversation" and "Deals" — those get filled in Phase 1c/1d), add/edit contact form.
- Mobile-first: the contact list must be usable one-handed on a phone — big tap targets, swipe-to-call/whatsapp shortcut icons.

Deliverable: fully working contact management, no WhatsApp integration yet.
```

### Phase 1b — Sales Pipeline
```
Continuing the MSME CRM. Build the Sales Pipeline module.

- Deal model: title, value, stage (configurable per business — seed default stages: New, Contacted, Quoted, Negotiation, Won, Lost), contact_id, assigned_to (user_id), business_id, timestamps.
- API: CRUD + stage-change endpoint that logs an ActivityLog entry on every stage move.
- Web UI: Kanban board, drag-and-drop between stages (use a lightweight library, no heavy dependencies), mobile fallback view as a simple filterable list (drag-and-drop kanban is desktop-friendly; on mobile show stage as a dropdown per deal card instead).
- Link deals to contacts — show a contact's deals on their detail page (the tab you left empty in Phase 1a).

Deliverable: working pipeline connected to contacts.
```

### Phase 1c — Task & Follow-up Reminders
```
Continuing the MSME CRM. Build the Task/Follow-up engine — this is the single most important feature per PLAN.md (missed follow-ups are the #1 failure mode for MSME sales).

- Task model: title, due_at, assigned_to, related_entity_type (contact/deal/invoice), related_entity_id, status (pending/done/overdue), business_id.
- Auto-create a follow-up task whenever: a new contact is created with no task, or a deal sits in the same stage for more than 3 days (configurable per business later, hardcode 3 days for now).
- Use Redis + BullMQ (per PLAN.md tech stack) for a scheduled job that checks overdue tasks daily and marks them, and queues WhatsApp reminder notifications (stub the actual WhatsApp send for now — real integration comes in Phase 1d).
- Web UI: a "Today" view showing all tasks due today/overdue across the business, plus tasks shown inline on contact/deal detail pages.

Deliverable: working task engine with the daily overdue-check job running via BullMQ.
```

### Phase 1d — Unified WhatsApp Inbox
```
Continuing the MSME CRM. Build the WhatsApp integration — treat this as the primary communication channel per PLAN.md.

- Integrate with [CHOOSE ONE: Interakt / Gupshup / 360dialog] official WhatsApp Business API (BSP). Use their webhook to receive inbound messages and their send API for outbound.
- Conversation model: channel (whatsapp/sms/email/call — only implement whatsapp fully now, leave enum room for the rest), contact_id, business_id.
- Message model: conversation_id, direction (inbound/outbound), body, status (sent/delivered/read/failed), external_message_id, timestamps.
- Webhook endpoint: receive inbound WhatsApp messages, match to an existing contact by phone number or auto-create a new contact (source = "whatsapp") if no match, append to the conversation thread, and auto-create a follow-up task (using the Phase 1c task engine) if this is the first message from a new contact.
- Web UI: a shared team inbox (like a simplified WhatsApp Web) — conversation list on the left, thread view on the right, template message picker, ability to assign a conversation to a team member and add internal notes not visible to the customer.
- Wire the Phase 1c reminder job to actually send via this WhatsApp integration now.

Deliverable: working two-way WhatsApp conversations logged against contacts, visible in a team inbox.
```

### Phase 1e — GST Billing & Invoicing
```
Continuing the MSME CRM. Build the Billing module.

- Invoice model: invoice_number (sequential per business, non-editable once issued), contact_id, deal_id (optional), line_items (jsonb: description, HSN/SAC code, qty, rate, tax %), subtotal, tax_total, grand_total, status (draft/sent/paid/overdue), due_date, irn (nullable), qr_code_url (nullable), business_id.
- Payment model: invoice_id, amount, method, paid_at.
- Integrate with a GST compliance/e-invoicing API partner (use a placeholder adapter interface — e.g., GSTComplianceProvider — so we can swap the actual provider later without touching business logic) to generate IRN + QR code for businesses whose turnover flag exceeds the e-invoice threshold (store a simple boolean `e_invoice_applicable` on the Business model, toggle manually for now).
- Auto-flag invoices as overdue past due_date and auto-create a payment-reminder task via the Phase 1c engine, sendable via the Phase 1d WhatsApp channel.
- Web UI: create invoice from a deal (pre-fill contact + line items if a quotation exists), invoice list with status filters, receivables/aging summary (0-30/31-60/60+ days overdue), downloadable PDF invoice.

Deliverable: working GST-aware invoicing connected to contacts, deals, and the reminder/WhatsApp systems.
```

### Phase 1f — Owner Dashboard
```
Continuing the MSME CRM. Build the Owner Dashboard — the single screen an owner checks daily.

- Metrics to show: open pipeline value, deals won this month, tasks overdue today, receivables due (total + aging buckets), top 5 customers by deal value, new leads this week by source.
- Build this as a set of API aggregation endpoints (keep queries efficient — use proper indexes, avoid N+1 patterns) plus a clean, mobile-first dashboard UI using simple cards and one or two charts max (don't over-visualize — MSME owners want fast answers, not a BI tool).
- Add a scheduled BullMQ job that compiles this into a short digest message and sends it via WhatsApp (Phase 1d integration) every morning at 9 AM business-local time, and weekly on Monday — per PLAN.md, owners won't log in daily, so push the insight to them.

Deliverable: this completes Phase 1 (MVP). At this point the product should be usable end-to-end: sign up → add contacts → chat on WhatsApp → move deals through pipeline → invoice → get paid → get reminded → see a daily digest. Do a full manual QA pass across this entire flow before moving to Phase 2.
```

---

## PHASE 2 — Team Roles, Receivables Depth, Multi-Channel, i18n Groundwork

```
Continuing the MSME CRM from the completed Phase 1 MVP.

1. Full RBAC: implement real permission checks for OWNER (everything), STAFF (own assigned contacts/deals/tasks only, cannot see billing/reports), ACCOUNTANT (billing/invoices/reports only, cannot see pipeline). Apply this via guards on every existing controller — audit every endpoint built in Phase 1 and lock it down accordingly.
2. Extend the Conversation model to actually support SMS and Email channels (not just WhatsApp) — add adapters for at least one SMS provider and email via Resend, both logging into the same unified inbox UI from Phase 1d.
3. Deepen receivables reporting: per-customer credit terms (days), automatic flag when a buyer breaches agreed terms, exportable GSTR-1-ready data export (CSV).
4. i18n groundwork: externalize all UI strings using next-intl (or similar), ship English + Hindi as the first two locales, add a language switcher in the dashboard topbar. Don't translate everything perfectly yet — get the technical scaffolding right so adding more languages later is just a translation file, not a code change.
5. Add an audit log viewer (Owner-only) showing who changed what, using the ActivityLog entries already being written since Phase 1.

Deliverable: role-locked, multi-channel, bilingual-ready CRM.
```

---

## PHASE 3 — Growth Features

```
Continuing the MSME CRM from the completed Phase 2 build.

1. WhatsApp broadcast campaigns: segment contacts by tag/source, send approved WhatsApp template broadcasts with opt-out handling, track delivery/read rates per campaign.
2. Marketplace lead auto-import: build a webhook/polling adapter for at least one marketplace (e.g., IndiaMART lead API) that auto-creates a contact + task on new inbound leads, same pattern as the WhatsApp auto-contact-creation from Phase 1d.
3. AI-assisted reply suggestions in the WhatsApp inbox: given a conversation thread, suggest 2-3 short reply drafts the agent can tap to send or edit — keep this as an optional suggestion, never auto-send.
4. Basic lead scoring: simple rule-based score (not ML) based on response speed, message count, and deal value, shown as a badge on the contact list.

Deliverable: growth-stage feature set layered on top of the stable Phase 1+2 core.
```

---

## PHASE 4 — Future / Optional (not scoped in detail yet)

```
Do not start this phase until explicitly instructed. Discuss and re-scope with the product owner first:
- Inventory & Stock module (re-introduce as a toggleable module per Business, using the jsonb-extensible pattern established in earlier phases — do not redesign the core schema to add this)
- Native mobile app wrapper (Capacitor or React Native) around the existing web app
- Multi-branch/location support
- TReDS / invoice-discounting partner integration for working capital access
```

---

## General instructions to prepend to EVERY prompt above (if your tool allows a persistent system/context note)

```
- Always check PLAN.md before making architectural decisions — don't introduce new libraries or patterns not listed there without flagging it first.
- Every new table must have a business_id column and an index on it. No exceptions.
- Every new endpoint must go through the existing auth guard — never trust a business_id or user_id passed from the client.
- Keep the UI mobile-first: build and test the 375px viewport before the desktop viewport.
- Prefer boring, well-documented libraries over cutting-edge ones — this app needs to be maintainable by a small team.
- After each phase, write/update tests for the core business logic (task auto-creation, invoice numbering, RBAC checks) — these are the pieces where a bug directly costs an MSME money or a missed customer.
```
