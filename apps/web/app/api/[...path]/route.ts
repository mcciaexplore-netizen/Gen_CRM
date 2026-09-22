import { NextRequest, NextResponse } from "next/server";

// ── Demo data ─────────────────────────────────────────────────────────────────

const DEMO_USER = {
  id: "demo-user-id",
  email: "demo@mccia.in",
  name: "MCCIA Demo User",
  role: "OWNER",
  businessId: "demo-business-id",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ── Route handlers ────────────────────────────────────────────────────────────

function mockResponse(path: string, method: string, body: unknown) {
  const p = path.replace(/^\/+/, "");

  // ── Dashboard / Reports ──────────────────────────────────────────────────
  if (p === "reports/dashboard/summary") {
    return {
      openPipeline: { value: 1850000, count: 14 },
      wonThisMonth: { value: 425000, count: 6 },
      overdueTasks: 3,
      receivables: {
        outstanding: 193000,
        overdue: 45000,
        buckets: {
          current: 125000,
          days0To30: 45000,
          days31To60: 18000,
          days60Plus: 5000,
        },
      },
    };
  }
  if (p === "reports/dashboard/top-customers") {
    return [
      { contact: { id: "c1", name: "Tata Motors Ltd", phone: "+91 9800000001" }, dealValue: 280000, dealCount: 5 },
      { contact: { id: "c2", name: "Infosys Pune", phone: "+91 9800000002" }, dealValue: 195000, dealCount: 3 },
      { contact: { id: "c3", name: "Bajaj Auto", phone: "+91 9800000003" }, dealValue: 140000, dealCount: 4 },
      { contact: { id: "c4", name: "Persistent Systems", phone: "+91 9800000004" }, dealValue: 95000, dealCount: 2 },
      { contact: { id: "c5", name: "Kirloskar Brothers", phone: "+91 9800000005" }, dealValue: 72000, dealCount: 3 },
    ];
  }
  if (p === "reports/dashboard/new-leads") {
    return [
      { source: "referral", count: 11 },
      { source: "walk-in", count: 8 },
      { source: "website", count: 5 },
      { source: "whatsapp", count: 4 },
      { source: "marketplace", count: 2 },
      { source: "other", count: 1 },
    ];
  }

  // ── Contacts ─────────────────────────────────────────────────────────────
  if ((p === "contacts" || p.startsWith("contacts?")) && method === "GET") {
    return {
      items: [
        { id: "c1", name: "Tata Motors Ltd", phone: "+91 9800000001", email: "contact@tata.com", source: "referral", status: "ACTIVE", tags: ["enterprise"], creditTermsDays: 30, createdAt: new Date().toISOString() },
        { id: "c2", name: "Infosys Pune", phone: "+91 9800000002", email: "pune@infosys.com", source: "website", status: "ACTIVE", tags: ["it"], creditTermsDays: 30, createdAt: new Date().toISOString() },
        { id: "c3", name: "Bajaj Auto", phone: "+91 9800000003", email: "info@bajaj.com", source: "walk-in", status: "LEAD", tags: ["auto"], creditTermsDays: 0, createdAt: new Date().toISOString() },
        { id: "c4", name: "Persistent Systems", phone: "+91 9800000004", email: "info@persistent.com", source: "referral", status: "LEAD", tags: ["it"], creditTermsDays: 0, createdAt: new Date().toISOString() },
        { id: "c5", name: "Kirloskar Brothers", phone: "+91 9800000005", email: "info@kirloskar.com", source: "other", status: "ACTIVE", tags: ["manufacturing"], creditTermsDays: 45, createdAt: new Date().toISOString() },
      ],
      meta: {
        total: 5,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    };
  }
  if (p === "contacts" && method === "POST") {
    return { id: "new-contact-id", ...(body as object), createdAt: new Date().toISOString() };
  }
  if (p.startsWith("contacts/")) {
    if (method === "DELETE") return null;
    const contact = { id: p.split("/")[1], name: "Demo Contact", phone: "+91 9800000001", email: "demo@contact.com", source: "referral", status: "ACTIVE", tags: [], notes: "", creditTermsDays: 30, gstin: "", billingStateCode: "27", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (method === "PATCH" || method === "PUT") return { ...contact, ...(body as object) };
    return contact;
  }

  // ── Tasks ────────────────────────────────────────────────────────────────
  if (p === "tasks/today") {
    return [
      { id: "t1", title: "Follow up with Bajaj Auto", dueDate: new Date().toISOString(), status: "PENDING", priority: "HIGH", contactId: "c3", contactName: "Bajaj Auto" },
      { id: "t2", title: "Send invoice to Infosys", dueDate: new Date().toISOString(), status: "PENDING", priority: "MEDIUM", contactId: "c2", contactName: "Infosys Pune" },
      { id: "t3", title: "Schedule product demo", dueDate: new Date().toISOString(), status: "PENDING", priority: "LOW", contactId: "c1", contactName: "Tata Motors Ltd" },
    ];
  }
  if (p === "tasks/options") {
    return { priorities: ["LOW", "MEDIUM", "HIGH"], statuses: ["PENDING", "DONE"], contacts: [{ id: "c1", name: "Tata Motors Ltd" }, { id: "c2", name: "Infosys Pune" }] };
  }
  if (p === "tasks" && method === "POST") {
    return { id: "new-task-id", ...(body as object), status: "PENDING", createdAt: new Date().toISOString() };
  }
  if (p === "tasks" || p.startsWith("tasks?")) {
    return [
      { id: "t1", title: "Follow up with Bajaj Auto", dueDate: new Date().toISOString(), status: "PENDING", priority: "HIGH", contactId: "c3", contactName: "Bajaj Auto" },
      { id: "t2", title: "Send invoice to Infosys", dueDate: new Date().toISOString(), status: "PENDING", priority: "MEDIUM", contactId: "c2", contactName: "Infosys Pune" },
    ];
  }
  if (p.startsWith("tasks/") && p.endsWith("/status")) {
    return { id: p.split("/")[1], status: (body as { status?: string })?.status ?? "DONE" };
  }

  // ── Pipeline / Deals ─────────────────────────────────────────────────────
  if (p === "pipeline/options") {
    return {
      stages: [
        { id: "s1", name: "Prospect", color: "#003a62", position: 1 },
        { id: "s2", name: "Qualified", color: "#0057a8", position: 2 },
        { id: "s3", name: "Proposal", color: "#c9a227", position: 3 },
        { id: "s4", name: "Negotiation", color: "#e8833a", position: 4 },
        { id: "s5", name: "Won", color: "#27ae60", position: 5 },
      ],
      users: [DEMO_USER],
      contacts: [
        { id: "c1", name: "Tata Motors Ltd" },
        { id: "c2", name: "Infosys Pune" },
        { id: "c3", name: "Bajaj Auto" },
      ],
    };
  }
  if (p === "pipeline/stages" && method === "GET") {
    return [
      { id: "s1", name: "Prospect", position: 1, dealsCount: 3, color: "#003a62" },
      { id: "s2", name: "Qualified", position: 2, dealsCount: 4, color: "#0057a8" },
      { id: "s3", name: "Proposal", position: 3, dealsCount: 3, color: "#c9a227" },
      { id: "s4", name: "Negotiation", position: 4, dealsCount: 2, color: "#e8833a" },
      { id: "s5", name: "Won", position: 5, dealsCount: 2, color: "#27ae60" },
    ];
  }
  if (p === "pipeline/stages") {
    return { id: "new-stage-id", ...(body as object) };
  }
  if (p.startsWith("pipeline/stages/")) {
    if (method === "DELETE") return null;
    return { id: p.split("/")[2], ...(body as object) };
  }
  if ((p === "deals" || p.startsWith("deals?")) && method === "GET") {
    return {
      items: [
        { id: "d1", title: "Tata Motors - Annual Contract", value: 500000, stageId: "s3", stageName: "Proposal", contactId: "c1", contactName: "Tata Motors Ltd", expectedCloseDate: new Date().toISOString(), assigneeId: DEMO_USER.id, assigneeName: DEMO_USER.name },
        { id: "d2", title: "Infosys - Software License", value: 200000, stageId: "s2", stageName: "Qualified", contactId: "c2", contactName: "Infosys Pune", expectedCloseDate: new Date().toISOString(), assigneeId: DEMO_USER.id, assigneeName: DEMO_USER.name },
        { id: "d3", title: "Bajaj - Fleet Insurance", value: 350000, stageId: "s1", stageName: "Prospect", contactId: "c3", contactName: "Bajaj Auto", expectedCloseDate: new Date().toISOString(), assigneeId: DEMO_USER.id, assigneeName: DEMO_USER.name },
        { id: "d4", title: "Persistent - Consulting", value: 150000, stageId: "s4", stageName: "Negotiation", contactId: "c4", contactName: "Persistent Systems", expectedCloseDate: new Date().toISOString(), assigneeId: DEMO_USER.id, assigneeName: DEMO_USER.name },
      ],
      meta: {
        total: 14,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    };
  }
  if (p === "deals" && method === "POST") {
    return { id: "new-deal-id", ...(body as object), createdAt: new Date().toISOString() };
  }
  if (p.startsWith("deals/")) {
    if (method === "DELETE") return null;
    if (method === "PATCH" || method === "PUT") return { id: p.split("/")[1], ...(body as object) };
    return { id: p.split("/")[1], title: "Demo Deal", value: 250000, stageId: "s2", stageName: "Qualified", contactId: "c1", contactName: "Tata Motors Ltd", createdAt: new Date().toISOString() };
  }

  // ── Billing ──────────────────────────────────────────────────────────────
  if (p === "billing/aging") {
    return {
      outstanding: 193000,
      overdue: 45000,
      buckets: { current: 125000, days0To30: 45000, days31To60: 18000, days60Plus: 5000 },
    };
  }
  if (p === "billing/settings") {
    if (method === "PATCH" || method === "PUT" || method === "POST") return { ...(body as object) };
    return { currency: "INR", taxRate: 18, paymentTermsDays: 30, businessName: "MCCIA Demo Business", gstin: "27AABCU9603R1ZX", eInvoiceApplicable: false, prefix: "INV", nextNumber: 1 };
  }
  if (p === "billing/receivables/customers") {
    return [
      { contact: { id: "c1", name: "Tata Motors Ltd", phone: "+91 9800000001" }, outstanding: 85000, overdue: 0 },
      { contact: { id: "c2", name: "Infosys Pune", phone: "+91 9800000002" }, outstanding: 45000, overdue: 18000 },
      { contact: { id: "c3", name: "Bajaj Auto", phone: "+91 9800000003" }, outstanding: 35000, overdue: 5000 },
    ];
  }
  if (p === "billing/options") {
    return {
      eInvoiceApplicable: false,
      contacts: [
        { id: "c1", name: "Tata Motors Ltd", phone: "+91 9800000001", creditTermsDays: 30, gstin: "27AABCD1234A1Z5", billingStateCode: "27" },
        { id: "c2", name: "Infosys Pune", phone: "+91 9800000002", creditTermsDays: 30, gstin: "", billingStateCode: "27" },
      ],
      deals: [
        { id: "d1", title: "Tata Motors - Annual Contract", value: 500000, contactId: "c1", contactName: "Tata Motors Ltd" },
      ],
    };
  }
  if (p.startsWith("billing/invoices")) {
    if (method === "POST") return { id: "new-invoice-id", ...(body as object), createdAt: new Date().toISOString() };
    if (method === "DELETE") return null;
    if (method === "PATCH" || method === "PUT") return { id: p.split("/")[2], ...(body as object) };
    return {
      id: "inv-001",
      invoiceNumber: "INV-2024-001",
      contactId: "c1",
      contactName: "Tata Motors Ltd",
      contactPhone: "+91 9800000001",
      subtotal: 72034,
      taxAmount: 12966,
      total: 85000,
      status: "SENT",
      dueDate: new Date().toISOString(),
      issueDate: new Date().toISOString(),
      items: [{ id: "li1", description: "Consulting Services", quantity: 1, unitPrice: 72034, taxRate: 18, amount: 85000 }],
      createdAt: new Date().toISOString(),
    };
  }

  // ── Invoices list ────────────────────────────────────────────────────────
  if (p === "billing/invoices" || p.startsWith("billing/invoices?")) {
    return {
      items: [
        { id: "inv-001", invoiceNumber: "INV-2024-001", contactName: "Tata Motors Ltd", total: 85000, status: "SENT", dueDate: new Date().toISOString() },
        { id: "inv-002", invoiceNumber: "INV-2024-002", contactName: "Infosys Pune", total: 45000, status: "PAID", dueDate: new Date().toISOString() },
      ],
      meta: {
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1,
      },
    };
  }

  // ── Conversations / Inbox ────────────────────────────────────────────────
  if (p === "conversations/options") {
    return { channels: ["WHATSAPP", "EMAIL"], statuses: ["OPEN", "CLOSED"], contacts: [] };
  }
  if (p.startsWith("conversations")) {
    return { message: "ok" };
  }

  // ── WhatsApp ─────────────────────────────────────────────────────────────
  if (p === "whatsapp/settings") {
    if (method === "POST" || method === "PUT" || method === "PATCH") return { ...(body as object) };
    return { phoneNumberId: "", businessAccountId: "", accessToken: "", webhookVerified: false };
  }
  if (p === "whatsapp/templates") {
    return [];
  }

  // ── Channels ─────────────────────────────────────────────────────────────
  if (p === "channels/settings") {
    if (method === "POST" || method === "PUT" || method === "PATCH") return { ...(body as object) };
    return { emailEnabled: false, whatsappEnabled: false, emailAddress: "" };
  }

  // ── Broadcasts ───────────────────────────────────────────────────────────
  if (p.startsWith("broadcasts")) {
    if (method === "POST") return { id: "new-broadcast-id", ...(body as object), createdAt: new Date().toISOString() };
    return [
      { id: "b1", name: "MCCIA Diwali Offer", status: "SENT", sentAt: new Date().toISOString(), recipientCount: 58, channel: "WHATSAPP" },
      { id: "b2", name: "New Membership Drive", status: "DRAFT", sentAt: null, recipientCount: 0, channel: "WHATSAPP" },
    ];
  }

  // ── Business setup ───────────────────────────────────────────────────────
  if (p === "business/setup") {
    return { id: "demo-business-id", name: "MCCIA Demo Business", slug: "mccia-demo", onboardingCompletedAt: new Date().toISOString(), ...(body as object) };
  }

  // ── Inventory / Marketplace ──────────────────────────────────────────────
  if (p.startsWith("inventory")) {
    if (method === "POST") return { id: "new-item-id", ...(body as object) };
    return { items: [], total: 0 };
  }
  if (p.startsWith("marketplace")) {
    return { items: [], total: 0 };
  }

  // ── Audit log ────────────────────────────────────────────────────────────
  if (p.startsWith("audit")) {
    return { items: [], total: 0 };
  }

  // ── Fallback ─────────────────────────────────────────────────────────────
  return { message: "ok", items: [], data: [], total: 0 };
}

// ── Catch-all handler ─────────────────────────────────────────────────────────

async function handler(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const accessToken = request.cookies.get("accessToken")?.value;
  const path = params.path.join("/");
  const method = request.method;

  if (accessToken !== "demo-access-token") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  let body: unknown = null;
  if (["POST", "PUT", "PATCH"].includes(method)) {
    body = await request.json().catch(() => ({}));
  }

  const data = mockResponse(path, method, body);
  if (data === null) return new NextResponse(null, { status: 204 });
  return NextResponse.json(data, { status: 200 });
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
