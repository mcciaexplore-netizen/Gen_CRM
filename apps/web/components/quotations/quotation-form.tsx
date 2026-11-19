"use client";

import type {
  QuotationDetail,
  QuotationInput,
  QuotationOptionsResponse,
} from "@msme-crm/shared-types";
import { Loader2, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { formatInr } from "@/lib/billing";

type FormLine = QuotationInput["lineItems"][number] & { key: string };

export function QuotationForm({
  initialDealId,
  quotation,
}: {
  initialDealId?: string;
  quotation?: QuotationDetail;
}) {
  const t = useTranslations("Quotations");
  const router = useRouter();
  const sequence = useRef(0);
  const makeLine = (value?: Partial<FormLine>): FormLine => ({
    key: "line-" + sequence.current++,
    description: value?.description ?? "",
    hsnSacCode: value?.hsnSacCode ?? "",
    quantity: value?.quantity ?? 1,
    rate: value?.rate ?? 0,
    discountPercent: value?.discountPercent ?? 0,
    taxPercent: value?.taxPercent ?? 18,
  });

  const [options, setOptions] = useState<QuotationOptionsResponse | null>(null);
  const [contactId, setContactId] = useState(quotation?.contact.id ?? "");
  const [dealId, setDealId] = useState(quotation?.deal?.id ?? initialDealId ?? "");
  const [expiresAt, setExpiresAt] = useState(
    quotation?.expiresAt?.slice(0, 10) ?? defaultExpiry(),
  );
  const [notes, setNotes] = useState(quotation?.notes ?? "");
  const [lines, setLines] = useState<FormLine[]>(() =>
    quotation?.lineItems.length ? quotation.lineItems.map((item) => makeLine(item)) : [makeLine()],
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<QuotationOptionsResponse>("/quotations/options")
      .then(setOptions)
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : "Unable to load quotation options"),
      )
      .finally(() => setLoading(false));
  }, []);

  function applyProduct(key: string, productId: string) {
    const product = options?.products.find((item) => item.id === productId);
    if (!product) return;
    setLines((current) =>
      current.map((line) =>
        line.key === key
          ? {
              ...line,
              description: product.name,
              hsnSacCode: product.hsnSacCode ?? "",
              rate: product.sellingPrice,
              taxPercent: product.taxPercent,
            }
          : line,
      ),
    );
  }

  function updateLine<K extends keyof FormLine>(key: string, field: K, value: FormLine[K]) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, [field]: value } : line)),
    );
  }

  function removeLine(key: string) {
    setLines((current) => current.filter((line) => line.key !== key));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const payload: QuotationInput = {
      contactId,
      dealId: dealId || null,
      expiresAt: expiresAt || null,
      notes: notes || null,
      lineItems: lines.map((line) => ({
        description: line.description,
        hsnSacCode: line.hsnSacCode,
        quantity: line.quantity,
        rate: line.rate,
        discountPercent: line.discountPercent ?? 0,
        taxPercent: line.taxPercent,
      })),
    };
    try {
      const result = await apiFetch<QuotationDetail>(
        quotation ? "/quotations/" + quotation.id : "/quotations",
        { method: quotation ? "PUT" : "POST", body: JSON.stringify(payload) },
      );
      router.replace("/quotations/" + result.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save quotation");
    } finally {
      setSaving(false);
    }
  }

  const totals = calculateTotals(lines);

  if (loading) {
    return (
      <div className="grid min-h-64 place-items-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="mx-auto max-w-4xl">
      <CardHeader>
        <CardTitle>{quotation ? t("title") : t("new")}</CardTitle>
        <CardDescription>
          {quotation ? "Quote #" + quotation.quoteNumber : "The quote number is assigned on save."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={submit}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quotation-deal">{t("deal")}</Label>
              <select
                className="h-12 w-full rounded-md border bg-white px-3 outline-none focus:border-primary"
                id="quotation-deal"
                onChange={(event) => {
                  const value = event.target.value;
                  setDealId(value);
                  const deal = options?.deals.find((item) => item.id === value);
                  if (deal) setContactId(deal.contactId);
                }}
                value={dealId}
              >
                <option value="">—</option>
                {options?.deals.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    {deal.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quotation-contact">{t("contact")}</Label>
              <select
                className="h-12 w-full rounded-md border bg-white px-3 outline-none focus:border-primary"
                id="quotation-contact"
                onChange={(event) => {
                  setContactId(event.target.value);
                  const selectedDeal = options?.deals.find((deal) => deal.id === dealId);
                  if (selectedDeal && selectedDeal.contactId !== event.target.value) setDealId("");
                }}
                required
                value={contactId}
              >
                <option value="">—</option>
                {options?.contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name} · {contact.phone}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quotation-expires">{t("expiresAt")}</Label>
              <Input
                id="quotation-expires"
                min={todayDate()}
                onChange={(event) => setExpiresAt(event.target.value)}
                type="date"
                value={expiresAt}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quotation-notes">{t("notes")}</Label>
            <textarea
              className="min-h-24 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none focus:border-primary"
              id="quotation-notes"
              onChange={(event) => setNotes(event.target.value)}
              value={notes ?? ""}
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold">{t("lineItems")}</h2>
              <Button
                onClick={() => setLines((current) => [...current, makeLine()])}
                size="sm"
                type="button"
                variant="outline"
              >
                <Plus className="mr-1.5 h-4 w-4" /> {t("addLine")}
              </Button>
            </div>

            <div className="mt-4 space-y-4">
              {lines.map((line, index) => (
                <article className="rounded-lg border bg-slate-50 p-4" key={line.key}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    {options?.products.length ? (
                      <select
                        aria-label="Load from product"
                        className="h-10 flex-1 rounded-md border bg-white px-2 text-sm outline-none focus:border-primary"
                        onChange={(event) => applyProduct(line.key, event.target.value)}
                        value=""
                      >
                        <option value="">Load from catalogue…</option>
                        {options.products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.sku} · {product.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-sm font-semibold">Item {index + 1}</p>
                    )}
                    <Button
                      aria-label={"Remove item " + (index + 1)}
                      disabled={lines.length === 1}
                      onClick={() => removeLine(line.key)}
                      size="icon"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                    <div className="space-y-2 sm:col-span-2 lg:col-span-2">
                      <Label htmlFor={line.key + "-description"}>Description</Label>
                      <Input
                        id={line.key + "-description"}
                        maxLength={240}
                        minLength={2}
                        onChange={(event) => updateLine(line.key, "description", event.target.value)}
                        required
                        value={line.description}
                      />
                    </div>
                    <LineField
                      id={line.key + "-hsn"}
                      label="HSN/SAC"
                      onChange={(value) => updateLine(line.key, "hsnSacCode", value)}
                      text
                      value={line.hsnSacCode}
                    />
                    <LineField
                      id={line.key + "-quantity"}
                      label="Qty"
                      min="0.001"
                      onChange={(value) => updateLine(line.key, "quantity", Number(value))}
                      step="0.001"
                      value={String(line.quantity)}
                    />
                    <LineField
                      id={line.key + "-rate"}
                      label="Rate (₹)"
                      min="0"
                      onChange={(value) => updateLine(line.key, "rate", Number(value))}
                      step="0.01"
                      value={String(line.rate)}
                    />
                    <LineField
                      id={line.key + "-discount"}
                      label="Discount %"
                      min="0"
                      onChange={(value) => updateLine(line.key, "discountPercent", Number(value))}
                      step="0.01"
                      value={String(line.discountPercent ?? 0)}
                    />
                    <LineField
                      id={line.key + "-tax"}
                      label="GST %"
                      min="0"
                      onChange={(value) => updateLine(line.key, "taxPercent", Number(value))}
                      step="0.01"
                      value={String(line.taxPercent)}
                    />
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="ml-auto max-w-sm rounded-lg bg-emerald-50 p-4">
            <TotalRow label="Subtotal" value={totals.subtotal} />
            {totals.discountTotal > 0 ? <TotalRow label="Discount" value={-totals.discountTotal} /> : null}
            <TotalRow label="Taxable value" value={totals.taxableSubtotal} />
            <TotalRow label="GST" value={totals.taxTotal} />
            <div className="mt-3 border-t border-emerald-200 pt-3">
              <TotalRow label={t("total")} strong value={totals.grandTotal} />
            </div>
          </div>

          {error ? (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button asChild variant="outline">
              <Link href={quotation ? "/quotations/" + quotation.id : "/quotations"}>Cancel</Link>
            </Button>
            <Button disabled={saving || !contactId || !lines.length} type="submit">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {quotation ? "Save" : t("new")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function LineField({
  id,
  label,
  min,
  onChange,
  step,
  text = false,
  value,
}: {
  id: string;
  label: string;
  min?: string;
  onChange: (value: string) => void;
  step?: string;
  text?: boolean;
  value: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        inputMode={text ? "text" : "decimal"}
        max={text ? undefined : "999999999999.99"}
        maxLength={text ? 12 : undefined}
        min={min}
        minLength={text ? 2 : undefined}
        onChange={(event) => onChange(event.target.value)}
        pattern={text ? "[A-Za-z0-9.-]{2,12}" : undefined}
        required
        step={step}
        type={text ? "text" : "number"}
        value={value}
      />
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

function calculateTotals(lines: FormLine[]) {
  let subtotal = 0;
  let discountTotal = 0;
  let taxTotal = 0;
  lines.forEach((line) => {
    const base = round(line.quantity * line.rate);
    const discount = round((base * (line.discountPercent ?? 0)) / 100);
    const taxable = round(base - discount);
    subtotal += base;
    discountTotal += discount;
    taxTotal += round((taxable * line.taxPercent) / 100);
  });
  return {
    subtotal: round(subtotal),
    discountTotal: round(discountTotal),
    taxableSubtotal: round(subtotal - discountTotal),
    taxTotal: round(taxTotal),
    grandTotal: round(subtotal - discountTotal + taxTotal),
  };
}

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function todayDate() {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function defaultExpiry() {
  const date = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}
