"use client";

import type {
  InvoiceDetail as InvoiceDetailType,
  PaymentInput,
  PaymentMethod,
} from "@msme-crm/shared-types";
import {
  ArrowLeft,
  Download,
  FileCheck2,
  Loader2,
  Pencil,
  ReceiptIndianRupee,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { StatusBadge } from "@/components/billing/billing-dashboard";
import { EntityTasks } from "@/components/tasks/entity-tasks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiDownload, apiFetch } from "@/lib/api";
import { formatDate, formatInr, paymentMethodLabels } from "@/lib/billing";

export function InvoiceDetail({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetailType | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("upi");
  const [paidAt, setPaidAt] = useState(defaultPaymentTime);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<InvoiceDetailType>("/billing/invoices/" + invoiceId)
      .then((result) => {
        setInvoice(result);
        setAmount(result.balanceDue ? String(result.balanceDue) : "");
      })
      .catch((caught) =>
        setError(
          caught instanceof Error ? caught.message : "Unable to load invoice",
        ),
      );
  }, [invoiceId]);

  async function issue() {
    if (!invoice) return;
    if (
      invoice.status === "draft" &&
      !window.confirm(
        "Issue this invoice now? Its invoice number and financial details will become non-editable.",
      )
    ) {
      return;
    }
    setWorking("issue");
    setError("");
    try {
      const result = await apiFetch<InvoiceDetailType>(
        "/billing/invoices/" + invoice.id + "/issue",
        { method: "POST", body: "{}" },
      );
      setInvoice(result);
      setAmount(String(result.balanceDue));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to issue invoice",
      );
    } finally {
      setWorking("");
    }
  }

  async function recordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invoice) return;
    setWorking("payment");
    setError("");
    const payload: PaymentInput = {
      amount: Number(amount),
      method,
      paidAt: new Date(paidAt).toISOString(),
    };
    try {
      const result = await apiFetch<InvoiceDetailType>(
        "/billing/invoices/" + invoice.id + "/payments",
        { method: "POST", body: JSON.stringify(payload) },
      );
      setInvoice(result);
      setAmount(result.balanceDue ? String(result.balanceDue) : "");
      setPaidAt(defaultPaymentTime());
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to record payment",
      );
    } finally {
      setWorking("");
    }
  }

  async function downloadPdf() {
    if (!invoice) return;
    setWorking("pdf");
    setError("");
    try {
      const blob = await apiDownload(
        "/billing/invoices/" + invoice.id + "/pdf",
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = (invoice.invoiceNumber ?? "draft-invoice") + ".pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to download PDF",
      );
    } finally {
      setWorking("");
    }
  }

  async function remove() {
    if (!invoice || !window.confirm("Delete this draft invoice?")) return;
    setWorking("delete");
    setError("");
    try {
      await apiFetch("/billing/invoices/" + invoice.id, { method: "DELETE" });
      router.replace("/invoices");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to delete draft",
      );
      setWorking("");
    }
  }

  if (error && !invoice) {
    return (
      <div className="rounded-lg border bg-white p-6 text-center">
        <p className="text-red-700" role="alert">
          {error}
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/invoices">Back to invoices</Link>
        </Button>
      </div>
    );
  }

  if (!invoice) {
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
        href="/invoices"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Invoices
      </Link>

      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight">
                  {invoice.invoiceNumber ?? "Draft invoice"}
                </h1>
                <StatusBadge status={invoice.status} />
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {invoice.contact.name} · Due {formatDate(invoice.dueDate)}
              </p>
            </div>
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
              <Button
                disabled={Boolean(working)}
                onClick={() => void downloadPdf()}
                variant="outline"
              >
                {working === "pdf" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                PDF
              </Button>
              {invoice.status === "draft" ? (
                <Button asChild variant="outline">
                  <Link href={"/invoices/" + invoice.id + "/edit"}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Link>
                </Button>
              ) : null}
              {invoice.status === "draft" ? (
                <Button
                  className="col-span-2"
                  disabled={Boolean(working)}
                  onClick={() => void issue()}
                >
                  {working === "issue" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileCheck2 className="mr-2 h-4 w-4" />
                  )}
                  Issue invoice
                </Button>
              ) : null}
              {invoice.status !== "draft" &&
              invoice.eInvoiceApplicable &&
              !invoice.irn ? (
                <Button
                  className="col-span-2"
                  disabled={Boolean(working)}
                  onClick={() => void issue()}
                >
                  {working === "issue" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileCheck2 className="mr-2 h-4 w-4" />
                  )}
                  Retry IRN generation
                </Button>
              ) : null}
            </div>
          </div>

          {error ? (
            <p
              className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="mt-6 grid gap-4 border-t pt-5 sm:grid-cols-3">
            <Info label="Customer" value={invoice.contact.name} />
            <Info label="Phone" value={invoice.contact.phone} />
            <Info
              label="Linked deal"
              value={invoice.deal?.title ?? "Not linked"}
            />
          </div>

          <div className="mt-6 overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">HSN/SAC</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                  <th className="px-4 py-3 text-right">GST</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {invoice.lineItems.map((item, index) => {
                  const base = item.quantity * item.rate;
                  const total = base + (base * item.taxPercent) / 100;
                  return (
                    <tr key={index}>
                      <td className="px-4 py-3 font-medium">
                        {item.description}
                      </td>
                      <td className="px-4 py-3">{item.hsnSacCode}</td>
                      <td className="px-4 py-3 text-right">{item.quantity}</td>
                      <td className="px-4 py-3 text-right">
                        {formatInr(item.rate)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {item.taxPercent}%
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatInr(total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="ml-auto mt-5 max-w-sm space-y-2 rounded-lg bg-emerald-50 p-4">
            <MoneyRow label="Subtotal" value={invoice.subtotal} />
            <MoneyRow label="GST" value={invoice.taxTotal} />
            <MoneyRow label="Grand total" strong value={invoice.grandTotal} />
            <MoneyRow label="Paid" value={invoice.amountPaid} />
            <MoneyRow label="Balance due" strong value={invoice.balanceDue} />
          </div>

          {invoice.eInvoiceApplicable && invoice.status !== "draft" ? (
            <div className="mt-5 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h2 className="font-semibold text-blue-950">E-invoice details</h2>
              <p className="mt-2 break-all text-xs leading-5 text-blue-800">
                IRN: {invoice.irn ?? "Generation pending"}
              </p>
              {invoice.qrCodeUrl ? (
                <p className="mt-1 break-all text-xs leading-5 text-blue-800">
                  QR reference: {invoice.qrCodeUrl}
                </p>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {invoice.status !== "draft" ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Record payment</CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.status === "paid" ? (
                <div className="rounded-lg bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
                  This invoice is fully paid.
                </div>
              ) : (
                <form className="space-y-4" onSubmit={recordPayment}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="payment-amount">Amount</Label>
                      <Input
                        id="payment-amount"
                        max={invoice.balanceDue}
                        min="0.01"
                        onChange={(event) => setAmount(event.target.value)}
                        required
                        step="0.01"
                        type="number"
                        value={amount}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payment-method">Method</Label>
                      <select
                        className="h-12 w-full rounded-md border bg-white px-3 outline-none focus:border-primary"
                        id="payment-method"
                        onChange={(event) =>
                          setMethod(event.target.value as PaymentMethod)
                        }
                        value={method}
                      >
                        {Object.entries(paymentMethodLabels).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ),
                        )}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment-date">Paid at</Label>
                    <Input
                      id="payment-date"
                      onChange={(event) => setPaidAt(event.target.value)}
                      required
                      type="datetime-local"
                      value={paidAt}
                    />
                  </div>
                  <Button disabled={working === "payment"} type="submit">
                    {working === "payment" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ReceiptIndianRupee className="mr-2 h-4 w-4" />
                    )}
                    Record payment
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Payment history</CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.payments.length ? (
                <div className="space-y-3">
                  {invoice.payments.map((payment) => (
                    <div
                      className="flex items-center justify-between gap-3 rounded-lg border p-3"
                      key={payment.id}
                    >
                      <div>
                        <p className="font-semibold">
                          {formatInr(payment.amount)}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {paymentMethodLabels[payment.method]} ·{" "}
                          {formatDate(payment.paidAt)}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {payment.recordedBy.name}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                  No payments recorded yet.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="mt-4">
        <EntityTasks entityId={invoice.id} entityType="invoice" />
      </div>

      {invoice.status === "draft" ? (
        <div className="mt-5 flex justify-end">
          <Button
            disabled={Boolean(working)}
            onClick={() => void remove()}
            variant="ghost"
          >
            {working === "delete" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4 text-red-600" />
            )}
            <span className="text-red-700">Delete draft</span>
          </Button>
        </div>
      ) : null}
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function MoneyRow({
  label,
  strong = false,
  value,
}: {
  label: string;
  strong?: boolean;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className={strong ? "font-bold" : "text-sm text-emerald-900"}>
        {label}
      </span>
      <span className={strong ? "font-bold text-emerald-950" : "font-semibold"}>
        {formatInr(value)}
      </span>
    </div>
  );
}

function defaultPaymentTime(): string {
  const value = new Date();
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
