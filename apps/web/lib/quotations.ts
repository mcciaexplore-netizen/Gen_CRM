import type { QuotationStatus } from "@msme-crm/shared-types";

export const quotationStatusClasses: Record<QuotationStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-emerald-100 text-emerald-700",
  expired: "bg-amber-100 text-amber-700",
  converted: "bg-violet-100 text-violet-700",
};
