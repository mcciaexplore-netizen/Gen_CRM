"use client";

import type { ProductInput, ProductSummary } from "@msme-crm/shared-types";
import { Loader2, Package, Pencil, Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { formatInr } from "@/lib/billing";

const emptyForm: ProductInput = {
  sku: "",
  name: "",
  description: "",
  unit: "piece",
  sellingPrice: 0,
  hsnSacCode: "",
  taxPercent: 18,
  active: true,
};

export function ProductCatalogue() {
  const t = useTranslations("Products");
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<ProductSummary | null>(null);
  const [form, setForm] = useState<ProductInput>(emptyForm);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  function load() {
    return apiFetch<ProductSummary[]>("/products")
      .then(setProducts)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load products"))
      .finally(() => setLoading(false));
  }

  useEffect(() => void load(), []);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(product: ProductSummary) {
    setEditing(product);
    setForm({
      sku: product.sku,
      name: product.name,
      description: product.description ?? "",
      unit: product.unit,
      sellingPrice: product.sellingPrice,
      hsnSacCode: product.hsnSacCode ?? "",
      taxPercent: product.taxPercent,
      active: product.active,
    });
    setFormOpen(true);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiFetch(editing ? "/products/" + editing.id : "/products", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      setFormOpen(false);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save product");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(product: ProductSummary) {
    if (!confirm(t("deactivateConfirm"))) return;
    setError("");
    try {
      await apiFetch("/products/" + product.id, { method: "DELETE" });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to deactivate product");
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> {t("new")}
        </Button>
      </div>

      {error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {formOpen ? (
        <Card className="mt-4">
          <form className="space-y-4 p-5" onSubmit={submit}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{editing ? editing.name : t("new")}</h2>
              <Button onClick={() => setFormOpen(false)} size="icon" type="button" variant="ghost">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="product-sku">{t("sku")}</Label>
                <Input
                  id="product-sku"
                  maxLength={60}
                  onChange={(event) => setForm({ ...form, sku: event.target.value })}
                  required
                  value={form.sku}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-name">{t("name")}</Label>
                <Input
                  id="product-name"
                  maxLength={160}
                  minLength={2}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  required
                  value={form.name}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-description">{t("description")}</Label>
              <Input
                id="product-description"
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                value={form.description ?? ""}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="product-unit">{t("unit")}</Label>
                <Input
                  id="product-unit"
                  maxLength={30}
                  onChange={(event) => setForm({ ...form, unit: event.target.value })}
                  value={form.unit ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-price">{t("price")}</Label>
                <Input
                  id="product-price"
                  inputMode="decimal"
                  min="0"
                  onChange={(event) => setForm({ ...form, sellingPrice: Number(event.target.value) })}
                  step="0.01"
                  type="number"
                  value={String(form.sellingPrice ?? 0)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-hsn">{t("hsn")}</Label>
                <Input
                  id="product-hsn"
                  maxLength={20}
                  onChange={(event) => setForm({ ...form, hsnSacCode: event.target.value })}
                  value={form.hsnSacCode ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-tax">{t("tax")}</Label>
                <Input
                  id="product-tax"
                  inputMode="decimal"
                  max="100"
                  min="0"
                  onChange={(event) => setForm({ ...form, taxPercent: Number(event.target.value) })}
                  step="0.01"
                  type="number"
                  value={String(form.taxPercent ?? 18)}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                checked={form.active ?? true}
                onChange={(event) => setForm({ ...form, active: event.target.checked })}
                type="checkbox"
              />
              {t("active")}
            </label>
            <div className="flex justify-end gap-3">
              <Button onClick={() => setFormOpen(false)} type="button" variant="outline">
                Cancel
              </Button>
              <Button disabled={saving} type="submit">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save
              </Button>
            </div>
          </form>
        </Card>
      ) : null}

      <Card className="mt-4 overflow-hidden">
        {loading ? (
          <div className="grid min-h-56 place-items-center">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
          </div>
        ) : products.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-5 py-3">{t("sku")}</th>
                  <th className="px-5 py-3">{t("name")}</th>
                  <th className="px-5 py-3">{t("unit")}</th>
                  <th className="px-5 py-3 text-right">{t("price")}</th>
                  <th className="px-5 py-3 text-right">{t("tax")}</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {products.map((product) => (
                  <tr className="hover:bg-slate-50" key={product.id}>
                    <td className="px-5 py-4 font-semibold">{product.sku}</td>
                    <td className="px-5 py-4">{product.name}</td>
                    <td className="px-5 py-4">{product.unit}</td>
                    <td className="px-5 py-4 text-right">{formatInr(product.sellingPrice)}</td>
                    <td className="px-5 py-4 text-right">{product.taxPercent}%</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          aria-label={"Edit " + product.name}
                          onClick={() => openEdit(product)}
                          size="icon"
                          variant="ghost"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          aria-label={t("deactivate") + " " + product.name}
                          onClick={() => void deactivate(product)}
                          size="icon"
                          variant="ghost"
                        >
                          <X className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-14 text-center">
            <Package className="mx-auto h-8 w-8 text-slate-400" />
            <p className="mt-3 text-sm text-muted-foreground">{t("empty")}</p>
          </div>
        )}
      </Card>
    </section>
  );
}
