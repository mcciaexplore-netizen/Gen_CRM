"use client";

import type { QuotationListResponse, QuotationStatus, QuotationSummary } from "@msme-crm/shared-types";
import { FilePlus2, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { apiFetch } from "@/lib/api";
import { formatDate, formatInr } from "@/lib/billing";
import { quotationStatusClasses } from "@/lib/quotations";
import { cn } from "@/lib/utils";

const STATUSES: QuotationStatus[] = ["draft", "sent", "accepted", "expired", "converted"];

export function QuotationList() {
  const t = useTranslations("Quotations");
  const [items, setItems] = useState<QuotationSummary[]>([]);
  const [status, setStatus] = useState<QuotationStatus | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const parameters = new URLSearchParams({ limit: "100" });
    if (status) parameters.set("status", status);
    try {
      const result = await apiFetch<QuotationListResponse>(
        "/quotations?" + parameters.toString(),
      );
      setItems(result.items);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load quotations");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => void load(), [load]);

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild>
          <Link href="/quotations/new">
            <FilePlus2 className="mr-2 h-4 w-4" /> {t("new")}
          </Link>
        </Button>
      </div>

      {error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <Card className="mt-4 overflow-hidden">
        <div className="border-b p-4 sm:p-5">
          <select
            aria-label={t("status")}
            className="h-12 w-full max-w-xs rounded-md border bg-white px-3 outline-none focus:border-primary"
            onChange={(event) => setStatus(event.target.value as QuotationStatus | "")}
            value={status}
          >
            <option value="">{t("status")}</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(value)}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="grid min-h-56 place-items-center">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : items.length ? (
          <>
            <div className="divide-y md:hidden">
              {items.map((item) => (
                <QuotationMobileCard item={item} key={item.id} t={t} />
              ))}
            </div>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">{t("quoteNumber")}</th>
                    <th className="px-5 py-3">{t("contact")}</th>
                    <th className="px-5 py-3">{t("expiresAt")}</th>
                    <th className="px-5 py-3">{t("status")}</th>
                    <th className="px-5 py-3 text-right">{t("total")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {items.map((item) => (
                    <tr className="hover:bg-slate-50" key={item.id}>
                      <td className="px-5 py-4">
                        <Link className="font-semibold hover:text-primary" href={"/quotations/" + item.id}>
                          #{item.quoteNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-4">{item.contact.name}</td>
                      <td className="px-5 py-4">{item.expiresAt ? formatDate(item.expiresAt) : "—"}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={item.status} label={t(item.status)} />
                      </td>
                      <td className="px-5 py-4 text-right font-semibold">{formatInr(item.grandTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="px-5 py-14 text-center">
            <FileText className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-3 text-sm text-muted-foreground">{t("empty")}</p>
          </div>
        )}
      </Card>
    </section>
  );
}

function QuotationMobileCard({
  item,
  t,
}: {
  item: QuotationSummary;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <Link className="block min-h-24 p-4 active:bg-slate-50" href={"/quotations/" + item.id}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">#{item.quoteNumber}</p>
          <p className="mt-1 truncate text-sm text-muted-foreground">{item.contact.name}</p>
        </div>
        <StatusBadge status={item.status} label={t(item.status)} />
      </div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <span className="text-xs text-muted-foreground">{t("total")}</span>
        <span className="font-bold">{formatInr(item.grandTotal)}</span>
      </div>
    </Link>
  );
}

export function StatusBadge({ status, label }: { status: QuotationStatus; label: string }) {
  return (
    <span className={cn("inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", quotationStatusClasses[status])}>
      {label}
    </span>
  );
}
