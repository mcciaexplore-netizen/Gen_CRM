# SahayakCRM — Phase 0 through Phase 2

This repository contains the Phase 0 foundation, the complete Phase 1 MVP, and the Phase 2 role, channel, receivables, audit, and localisation groundwork for a mobile-first, multi-tenant CRM for Indian MSMEs.

## What is included

- pnpm workspace monorepo
- Next.js 14 App Router web app with TypeScript, Tailwind CSS, and local shadcn/ui components
- NestJS API with TypeScript, Prisma, and PostgreSQL
- PostgreSQL and Redis development services through Docker Compose
- Shared frontend/API contracts in `packages/shared-types`
- Transactional business + owner signup
- Login, logout, 15-minute access tokens, and rotating 7-day refresh tokens
- Refresh tokens stored only as SHA-256 digests
- Global authentication and role guards
- JWT-derived business context; business IDs are never accepted from client input
- Three-step guided setup and protected responsive dashboard shell
- Tenant-scoped contact CRUD with soft deletion
- Contact search plus source/tag filters
- Duplicate-phone warnings within each business
- Mobile contact cards with swipe-to-call and WhatsApp actions
- Tenant-scoped deal CRUD linked to contacts and team members
- Configurable per-business pipeline stages, seeded with New, Contacted, Quoted, Negotiation, Won, and Lost
- Desktop drag-and-drop Kanban board with a mobile stage-dropdown fallback
- Immutable activity entries for every deal stage change
- Contact detail pages with linked active deals
- Automatic next-day follow-up creation in the same transaction as every new contact
- Tenant-scoped task CRUD with Today and inline contact/deal views
- Automatic follow-ups after a deal remains in one open stage for more than three days
- BullMQ daily maintenance at 12:05 AM Asia/Kolkata using Redis
- Per-business 360dialog connection with AES-256-GCM encrypted API keys
- Queued, authenticated 360dialog webhooks with retry and message idempotency
- Automatic contact and follow-up creation from a new WhatsApp lead
- Shared WhatsApp inbox with assignment, templates, delivery status, and internal notes
- Contact profiles linked to their WhatsApp conversation
- Deduplicated task-reminder jobs that send an approved WhatsApp template
- Tenant-scoped GST invoices with validated HSN/SAC line items and server-calculated totals
- Immutable sequential invoice numbers assigned atomically when a draft is issued
- Swappable `GSTComplianceProvider` adapter with placeholder IRN and QR generation
- Payment recording with automatic paid status and completed reminder tasks
- Automatic overdue invoice status plus payment-reminder task creation
- Receivables aging for 0-30, 31-60, and 60+ overdue days
- Mobile-first invoice list, deal/quotation prefill, details, and A4 PDF download
- Tenant-scoped owner dashboard aggregations with indexed, bounded queries
- Open pipeline, monthly wins, overdue follow-ups, receivables aging, top customers, and weekly lead-source metrics
- Lightweight mobile charts without a dashboard or charting dependency
- BullMQ daily 9 AM and Monday 9 AM owner digests in each business's IANA timezone
- Approved 360dialog digest templates sent to the business's first active owner
- Public health endpoint at `GET /api/health`
- Enforced OWNER, STAFF, and ACCOUNTANT route permissions across every Phase 1 controller
- STAFF row-level scoping to assigned contacts, deals, tasks, and conversations
- MSG91 SMS and Resend email adapters in the same unified inbox as WhatsApp
- Tenant-specific encrypted SMS/email credentials and signed inbound webhooks
- Per-customer credit terms, automatic breach flags, and customer receivables detail
- GSTR-1-ready UTF-8 CSV export with intra/inter-state tax split
- English and Hindi next-intl message catalogs with an in-app language switcher
- Owner-only audit-log API and viewer for successful data-changing actions

## Prerequisites

- Node.js 20 or 22 LTS
- pnpm 10+
- Docker Desktop with Docker Compose

## First-time setup

From the repository root:

1. Create the local environment files.

   PowerShell:

   ```powershell
   Copy-Item apps/api/.env.example apps/api/.env
   Copy-Item apps/web/.env.example apps/web/.env.local
   ```

   macOS/Linux:

   ```bash
   cp apps/api/.env.example apps/api/.env
   cp apps/web/.env.example apps/web/.env.local
   ```

2. Replace both JWT secrets, `WHATSAPP_CREDENTIALS_KEY`, `COMMUNICATION_CREDENTIALS_KEY`, and `WHATSAPP_WEBHOOK_TOKEN` in `apps/api/.env`. Use different random values for each secret. Both credentials keys must be exactly 64 hexadecimal characters. For example, run this command separately for each value:

   ```bash
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   The checked-in values are examples only.

3. Install dependencies.

   ```bash
   pnpm install
   ```

4. Start PostgreSQL and Redis.

   ```bash
   docker compose up -d
   ```

5. Start both applications. This generates the Prisma client and applies checked-in migrations before starting the development servers.

   ```bash
   pnpm dev
   ```

Open:

- Web: <http://localhost:3000>
- API health: <http://localhost:4000/api/health>

The intended flow is **signup → three-step setup → dashboard**. Use `http://localhost` consistently rather than mixing it with `127.0.0.1`, because authentication uses HTTP-only cookies.

## 360dialog setup

The inbox uses the official 360dialog WhatsApp Business API. PostgreSQL and Redis must be running before webhook events can be processed.

1. Obtain the channel API key, phone number ID, and display phone number from 360dialog.
2. Sign in to SahayakCRM as the business owner and open **Inbox → WhatsApp setup**.
3. Enter the channel details and save. The API key is encrypted before storage and is never returned to the browser.
4. Expose the API over a public HTTPS hostname. A provider cannot deliver webhooks to `localhost`.
5. Configure the 360dialog channel webhook URL as `https://YOUR_API_HOST/api/webhooks/360dialog`.
6. Add a custom webhook header named `Authorization` with the value `Bearer YOUR_WHATSAPP_WEBHOOK_TOKEN`. It must match `WHATSAPP_WEBHOOK_TOKEN` in `apps/api/.env`.
7. For automatic task reminders, create and approve a utility template whose body uses `{{1}}` for the task title and `{{2}}` for the due time. Save its exact name and language code on the WhatsApp setup page.
8. For owner digests, create a second approved utility template with one body parameter, `{{1}}`, for the complete dashboard summary. Save its name and language in the **Owner dashboard digest** section. Without this template, scheduled digest jobs are safely skipped.

Inbound events are acknowledged after they are authenticated and placed on the Redis queue. The worker then matches the business by 360dialog phone number ID, matches or creates the contact, records the message, and updates the shared inbox.

## SMS and email setup

Sign in as the OWNER and open **Inbox → channel settings**. MSG91 requires an auth key, Flow/template ID, and a private inbound-webhook token. Resend requires an API key, verified sender, receiving address, and the webhook signing secret. All provider secrets are AES-256-GCM encrypted before storage and are never returned to the browser.

After saving once, copy the generated MSG91 webhook URL into the provider and send the token in an `x-webhook-token` header. Configure the Resend webhook URL shown on the page and subscribe it to `email.received`; Resend requests are verified with the per-business signing secret before the received email body is retrieved. Public HTTPS URLs are required outside local mock testing.

## Phase 2 role matrix

| Role       | Access                                                                                                              |
| ---------- | ------------------------------------------------------------------------------------------------------------------- |
| OWNER      | All modules, team assignment, channel settings, pipeline configuration, and audit log                               |
| STAFF      | Only their assigned contacts, deals, tasks, and conversations; no billing or reports                                |
| ACCOUNTANT | Dashboard reports, billing, invoices, payments, receivables, PDFs, and GSTR-1 export; no contacts pipeline or inbox |

The API enforces this matrix. Hiding navigation items in the web app is only a usability layer, not the security boundary.

## Billing and e-invoice setup

Open **Billing** from the dashboard. Business owners can manually toggle whether e-invoicing applies to the business.

Invoices begin as editable drafts without a number. Selecting **Issue invoice** atomically reserves the next business sequence and creates a permanent number such as `INV-2026-000001`. Issued invoices cannot be edited or deleted.

The checked-in `PlaceholderGSTComplianceProvider` exercises the IRN/QR workflow without calling GSTN or a paid GSP. Its output is intentionally non-production. Replace the provider binding in `apps/api/src/modules/billing/billing.module.ts` with a real GSP implementation before using e-invoicing in production; billing business logic does not need to change.

The invoice form can start from a deal. It copies the latest tenant-scoped quotation line items when a quotation record exists, otherwise it uses the deal title and value as a starting item. The HSN/SAC code must be completed before saving.

## Useful commands

```bash
pnpm dev             # migrate, then run web and API together
pnpm build           # production-build all packages
pnpm typecheck       # type-check all packages
pnpm lint            # lint web and API
pnpm db:generate     # regenerate Prisma client
pnpm db:migrate      # create/apply a development migration
pnpm db:deploy       # apply checked-in migrations
docker compose down  # stop local infrastructure
```

To remove local database and Redis data as well, run `docker compose down -v`. This permanently deletes the local development volumes.

## Repository structure

```text
msme-crm/
├─ apps/
│  ├─ web/                 # Next.js frontend
│  └─ api/                 # NestJS API and Prisma schema
├─ packages/
│  └─ shared-types/        # contracts shared by web and API
├─ .github/workflows/      # build verification
├─ docker-compose.yml
├─ pnpm-workspace.yaml
└─ README.md
```

## API routes

| Method   | Route                                  | Access                         | Purpose                                            |
| -------- | -------------------------------------- | ------------------------------ | -------------------------------------------------- |
| `GET`    | `/api/health`                          | Public                         | Service health                                     |
| `POST`   | `/api/auth/signup`                     | Public                         | Create Business + OWNER atomically                 |
| `POST`   | `/api/auth/login`                      | Public                         | Start a session                                    |
| `POST`   | `/api/auth/refresh`                    | Public, refresh token required | Rotate session tokens                              |
| `POST`   | `/api/auth/logout`                     | Public, idempotent             | Revoke refresh token and clear cookies             |
| `GET`    | `/api/auth/me`                         | Authenticated                  | Current user and business                          |
| `PATCH`  | `/api/business/setup`                  | OWNER                          | Save onboarding details using JWT business context |
| `POST`   | `/api/contacts`                        | Authenticated                  | Create a contact and return duplicate warnings     |
| `GET`    | `/api/contacts`                        | Authenticated                  | Search, filter, and paginate active contacts       |
| `GET`    | `/api/contacts/:id`                    | Authenticated                  | Read one tenant-scoped contact                     |
| `PATCH`  | `/api/contacts/:id`                    | Authenticated                  | Update one tenant-scoped contact                   |
| `DELETE` | `/api/contacts/:id`                    | Authenticated                  | Soft-delete one tenant-scoped contact              |
| `GET`    | `/api/pipeline/options`                | Authenticated                  | List stages and active assignees                   |
| `GET`    | `/api/pipeline/stages`                 | Authenticated                  | List business pipeline stages                      |
| `POST`   | `/api/pipeline/stages`                 | OWNER                          | Add a business pipeline stage                      |
| `PATCH`  | `/api/pipeline/stages/:id`             | OWNER                          | Update a stage name, colour, order, or outcome     |
| `DELETE` | `/api/pipeline/stages/:id`             | OWNER                          | Soft-delete an empty stage                         |
| `POST`   | `/api/deals`                           | Authenticated                  | Create a deal linked to a tenant contact and user  |
| `GET`    | `/api/deals`                           | Authenticated                  | Search and filter active deals                     |
| `GET`    | `/api/deals/:id`                       | Authenticated                  | Read one tenant-scoped deal                        |
| `PATCH`  | `/api/deals/:id`                       | Authenticated                  | Update deal details without changing its stage     |
| `PATCH`  | `/api/deals/:id/stage`                 | Authenticated                  | Move a deal and log the stage change               |
| `GET`    | `/api/deals/:id/activities`            | Authenticated                  | Read a deal's stage-change history                 |
| `DELETE` | `/api/deals/:id`                       | Authenticated                  | Soft-delete a deal                                 |
| `GET`    | `/api/tasks/options`                   | Authenticated                  | List active task assignees                         |
| `GET`    | `/api/tasks/today`                     | Authenticated                  | List due-today and overdue business tasks          |
| `GET`    | `/api/tasks`                           | Authenticated                  | Filter tasks by entity, status, or assignee        |
| `POST`   | `/api/tasks`                           | Authenticated                  | Create a contact or deal follow-up                 |
| `PATCH`  | `/api/tasks/:id`                       | Authenticated                  | Update task details or assignment                  |
| `PATCH`  | `/api/tasks/:id/status`                | Authenticated                  | Complete or reopen a task                          |
| `DELETE` | `/api/tasks/:id`                       | Authenticated                  | Soft-delete a task                                 |
| `GET`    | `/api/whatsapp/settings`               | Authenticated                  | Read safe connection metadata                      |
| `PUT`    | `/api/whatsapp/settings`               | OWNER                          | Configure the encrypted 360dialog connection       |
| `GET`    | `/api/whatsapp/templates`              | Authenticated                  | List approved 360dialog templates                  |
| `GET`    | `/api/conversations/options`           | Authenticated                  | List active conversation assignees                 |
| `GET`    | `/api/conversations`                   | Authenticated                  | Search tenant WhatsApp conversations               |
| `GET`    | `/api/conversations/:id`               | Authenticated                  | Read one conversation, messages, and notes         |
| `POST`   | `/api/conversations/:id/messages`      | Authenticated                  | Send and record a WhatsApp text message            |
| `POST`   | `/api/conversations/:id/templates`     | Authenticated                  | Send and record an approved template               |
| `PATCH`  | `/api/conversations/:id/assignment`    | Authenticated                  | Assign or unassign a team conversation             |
| `POST`   | `/api/conversations/:id/read`          | Authenticated                  | Clear the conversation unread count                |
| `POST`   | `/api/conversations/:id/notes`         | Authenticated                  | Add an internal team note                          |
| `POST`   | `/api/webhooks/360dialog`              | Public, bearer token required  | Queue inbound messages and delivery statuses       |
| `GET`    | `/api/billing/settings`                | Authenticated                  | Read the business e-invoice applicability flag     |
| `PATCH`  | `/api/billing/settings`                | OWNER                          | Manually toggle e-invoice applicability            |
| `GET`    | `/api/billing/options`                 | Authenticated                  | List contacts and deals for invoice creation       |
| `GET`    | `/api/billing/prefill`                 | Authenticated                  | Pre-fill an invoice from a tenant deal/quotation   |
| `GET`    | `/api/billing/aging`                   | Authenticated                  | Read receivables and overdue aging buckets         |
| `POST`   | `/api/billing/invoices`                | Authenticated                  | Create a GST invoice draft                         |
| `GET`    | `/api/billing/invoices`                | Authenticated                  | Search and filter tenant invoices                  |
| `GET`    | `/api/billing/invoices/:id`            | Authenticated                  | Read an invoice and its payments                   |
| `PUT`    | `/api/billing/invoices/:id`            | Authenticated                  | Replace an unissued draft                          |
| `POST`   | `/api/billing/invoices/:id/issue`      | Authenticated                  | Assign the permanent number and generate IRN/QR    |
| `POST`   | `/api/billing/invoices/:id/payments`   | Authenticated                  | Record a payment and update invoice status         |
| `GET`    | `/api/billing/invoices/:id/pdf`        | Authenticated                  | Download the rendered A4 invoice PDF               |
| `DELETE` | `/api/billing/invoices/:id`            | Authenticated                  | Soft-delete an unissued draft                      |
| `GET`    | `/api/reports/dashboard/summary`       | Authenticated                  | Pipeline, wins, tasks, and receivables summary     |
| `GET`    | `/api/reports/dashboard/top-customers` | Authenticated                  | Top five customers by total deal value             |
| `GET`    | `/api/reports/dashboard/new-leads`     | Authenticated                  | Current-week lead counts grouped by source         |

## Web routes

- `/contacts` — searchable contact list
- `/contacts/:id` — contact profile with linked Deals tab
- `/pipeline` — desktop Kanban and mobile pipeline list
- `/pipeline/new` — add a deal, optionally pre-linked from a contact
- `/pipeline/:id/edit` — edit or delete a deal
- `/pipeline/stages` — owner-only stage configuration
- `/today` — all tasks due today or overdue across the business
- `/inbox` — responsive shared WhatsApp inbox
- `/inbox/settings` — owner-only 360dialog connection form
- `/invoices` — status filters, e-invoice setting, and receivables aging
- `/invoices/new` — GST invoice form with optional deal/quotation prefill
- `/invoices/:id` — issue, download, payments, and invoice follow-ups
- `/invoices/:id/edit` — edit an unissued draft
- `/dashboard` — mobile-first daily owner view with four metrics, aging, top customers, and lead sources

## Background jobs

The API process also runs BullMQ workers. On startup it upserts one daily scheduler in Redis, so restarts or multiple API instances do not create duplicate schedules. At 12:05 AM India time the maintenance worker:

1. creates one follow-up for every open deal that has remained in the same stage for more than three days;
2. flags issued invoices whose due date has passed and creates one payment-reminder task per invoice;
3. marks past-due pending tasks as overdue;
4. queues idempotent WhatsApp reminder jobs; and
5. sends each queued reminder through the business's enabled 360dialog connection and approved template.

Inbound 360dialog webhook payloads use a separate BullMQ queue with exponential retries. Provider message IDs enforce idempotency, so duplicate deliveries do not create duplicate inbox messages.

The owner-digest queue keeps two repeatable schedules per active business: every day at 9 AM and every Monday at 9 AM in `Business.timezone` (default `Asia/Kolkata`). A reconciliation job runs every 15 minutes so businesses created after the API starts receive schedules without a restart. Jobs compile fresh dashboard data and send it to the first active owner through the configured approved digest template. BullMQ scheduler IDs are deterministic, so restarts and multiple API instances do not duplicate schedules.

## Multi-tenancy rule

`Business` is the tenant root. Every model owned by a tenant must have a required `businessId` field mapped to `business_id`, a foreign key to `Business`, and an index on that field. Controllers must obtain the tenant through `@CurrentBusiness()`; client body and query values must never select a tenant. `User` demonstrates this rule in the initial Prisma schema.

All future tenant-owned reads and writes must include the JWT-derived business ID in their Prisma filter. Soft deletion uses `deleted_at`.

## Authentication notes

- Passwords are hashed with bcrypt (cost 12).
- Access JWTs expire after 15 minutes.
- Refresh JWTs expire after 7 days and rotate on use.
- Only a SHA-256 digest of the active refresh token is stored and compared in constant time.
- Browser tokens use HTTP-only, same-site cookies; bearer access tokens are also supported for future non-browser clients.
- Production cookies require HTTPS through the `secure` flag.

## Mobile verification

The UI is designed from a 375 px viewport upward. In browser developer tools, test signup, setup, menu navigation, token refresh, logout, dashboard cards/charts, contacts, the mobile pipeline stage selector, Today, inbox, and billing at **375 × 812** before merging UI changes.

## Phase boundary

Phase 1 is complete: contacts, sales pipeline, task/follow-up reminders, the unified WhatsApp inbox through 360dialog, GST-aware billing, payments, and the owner dashboard are included. The GST provider remains a placeholder adapter rather than a production GSP connection. SMS, email, and call are reserved conversation channels but are not implemented. Broadcast campaigns and later-phase CRM features remain outside this MVP.
