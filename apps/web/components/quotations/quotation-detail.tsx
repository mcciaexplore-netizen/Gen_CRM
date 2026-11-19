"use client";

import type {
  QuotationConvertResponse,
  QuotationDetail as QuotationDetailType,
  QuotationTemplateSummary,
} from "@msme-crm/shared-types";
import { ArrowLeft, Download, Loader2, Pencil, Send, ThumbsUp, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/quotations/quotation-list";
import { apiDownload, apiFetch } from "@/lib/api";
import { formatDate, formatInr } from "@/lib/billing";

export function QuotationDetail({ quotationId }: { quotationId: string }) {
  const t = useTranslations("Quotations");
  const router = useRouter();
  const [quotation, setQuotation] = useState<QuotationDetailType | null>(null);
  const [templates, setTemplates] = useState<QuotationTemplateSummary[]>([]);
  const [templateId, setTemplateId] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    return apiFetch<QuotationDetailType>("/quotations/" + quotationId)
      .then(setQuotation)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load quotation"));
  }, [quotationId]);

  useEffect(() => void load(), [load]);

  useEffect(() => {
    apiFetch<QuotationTemplateSummary[]>("/quotation-templates")
      .then(setTemplates)
      .catch(() => undefined);
  }, []);

  async function downloadPdf() {
    if (!quotation) return;
    setDownloading(true);
    setError("");
    try {
      const query = templateId ? "?templateId=" + encodeURIComponent(templateId) : "";
      const blob = await apiDownload("/quotations/" + quotation.id + "/pdf" + query);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "Quotation-" + quotation.quoteNumber + ".pdf";
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to download PDF");
    } finally {
      setDownloading(false);
    }
  }

  async function send() {
    if (!confirm(t("sendConfirm"))) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch("/quotations/" + quotationId + "/send", { method: "POST" });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to mark as sent");
    } finally {
      setBusy(false);
    }
  }

  async function accept() {
    if (!confirm(t("acceptConfirm"))) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch("/quotations/" + quotationId + "/accept", { method: "POST" });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to mark as accepted");
    } finally {
      setBusy(false);
    }
  }

  async function convert() {
    if (!confirm(t("convertConfirm"))) return;
    setBusy(true);
    setError("");
    try {
      const result = await apiFetch<QuotationConvertResponse>(
        "/quotations/" + quotationId + "/convert",
        { method: "POST" },
      );
      router.push("/invoices/" + result.invoiceId + "/edit");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to convert to invoice");
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm("Delete this draft quotation?")) return;
    setBusy(true);
    setError("");
    try {
      await apiFetch("/quotations/" + quotationId, { method: "DELETE" });
      router.replace("/quotations");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete quotation");
      setBusy(false);
    }
  }

  if (error && !quotation) {
    return (
      <div className="rounded-lg border bg-white p-6 text-center">
        <p className="text-red-700" role="alert">
          {error}
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/quotations">{t("title")}</Link>
        </Button>
      </div>
    );
  }
  if (!quotation) {
    return (
      <div className="grid min-h-64 place-items-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <section>
      <Link
        className="mb-3 inline-flex min-h-11 items-center text-sm font-semibold text-muted-foreground hover:text-foreground"
        href="/quotations"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> {t("title")}
      </Link>

      <Card className="mx-auto max-w-4xl">
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>#{quotation.quoteNumber}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {quotation.contact.name} · {quotation.contact.phone}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={quotation.status} label={t(quotation.status)} />
            {templates.length ? (
              <select
                aria-label="PDF template"
                className="h-9 rounded-md border bg-white px-2 text-sm outline-none focus:border-primary"
                onChange={(event) => setTemplateId(event.target.value)}
                value={templateId}
              >
                <option value="">Default template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            ) : null}
            <Button disabled={downloading} onClick={() => void downloadPdf()} size="sm" variant="outline">
              {downloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("deal")} value={quotation.deal?.title ?? "—"} />
            <Field label={t("expiresAt")} value={quotation.expiresAt ? formatDate(quotation.expiresAt) : "—"} />
            <Field label={t("total")} value={formatInr(quotation.grandTotal)} />
          </div>

          {quotation.notes ? (
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{t("notes")}</p>
              <p className="mt-1 text-sm">{quotation.notes}</p>
            </div>
          ) : null}

          <div>
            <h2 className="font-semibold">{t("lineItems")}</h2>
            <div className="mt-3 overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Description</th>
                    <th className="px-4 py-2">HSN/SAC</th>
                    <th className="px-4 py-2 text-right">Qty</th>
                    <th className="px-4 py-2 text-right">Rate</th>
                    <th className="px-4 py-2 text-right">GST %</th>
                    <th className="px-4 py-2 text-right">Line total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {quotation.lineItems.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2">{item.description}</td>
                      <td className="px-4 py-2">{item.hsnSacCode}</td>
                      <td className="px-4 py-2 text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-right">{formatInr(item.rate)}</td>
                      <td className="px-4 py-2 text-right">{item.taxPercent}%</td>
                      <td className="px-4 py-2 text-right font-semibold">
                        {formatInr(item.lineTotal ?? item.quantity * item.rate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="ml-auto max-w-sm rounded-lg bg-emerald-50 p-4">
            <TotalRow label="Subtotal" value={quotation.subtotal} />
            <TotalRow label="GST" value={quotation.taxTotal} />
            <div className="mt-3 border-t border-emerald-200 pt-3">
              <TotalRow label={t("total")} strong value={quotation.grandTotal} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 border-t pt-5">
            {quotation.status === "draft" ? (
              <>
                <Button asChild variant="outline">
                  <Link href={"/quotations/" + quotation.id + "/edit"}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Link>
                </Button>
                <Button disabled={busy} onClick={() => void send()} variant="outline">
                  <Send className="mr-2 h-4 w-4" /> {t("send")}
                </Button>
                <Button disabled={busy} onClick={() => void remove()} variant="outline">
                  <Trash2 className="mr-2 h-4 w-4 text-red-600" /> Delete
                </Button>
              </>
            ) : null}
            {quotation.status === "sent" ? (
              <Button disabled={busy} onClick={() => void accept()} variant="outline">
                <ThumbsUp className="mr-2 h-4 w-4" /> {t("accept")}
              </Button>
            ) : null}
            {quotation.status === "sent" || quotation.status === "accepted" ? (
              <Button disabled={busy} onClick={() => void convert()}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t("convertToInvoice")}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

function TotalRow({ label, strong = false, value }: { label: string; strong?: boolean; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className={strong ? "font-bold text-emerald-950" : "text-sm text-emerald-900"}>{label}</span>
      <span className={strong ? "text-lg font-bold text-emerald-950" : "font-semibold"}>{formatInr(value)}</span>
    </div>
  );
}
