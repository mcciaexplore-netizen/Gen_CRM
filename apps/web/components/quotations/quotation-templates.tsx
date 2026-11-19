"use client";

import type { QuotationTemplateSummary } from "@msme-crm/shared-types";
import { ArrowLeft, Check, Loader2, Trash2, UploadCloud } from "lucide-react";
import Link from "next/link";
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/lib/billing";
import { cn } from "@/lib/utils";

export function QuotationTemplates() {
  const [templates, setTemplates] = useState<QuotationTemplateSummary[]>([]);
  const [name, setName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  function load() {
    return apiFetch<QuotationTemplateSummary[]>("/quotation-templates")
      .then(setTemplates)
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load templates"))
      .finally(() => setLoading(false));
  }

  useEffect(() => void load(), []);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!name.trim()) {
      setError("Give the template a name before uploading");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("name", name.trim());
      await apiFetch("/quotation-templates", { method: "POST", body: form });
      setName("");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function setDefault(id: string) {
    setError("");
    try {
      await apiFetch("/quotation-templates/" + id + "/default", { method: "PUT" });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to set default template");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this template?")) return;
    setError("");
    try {
      await apiFetch("/quotation-templates/" + id, { method: "DELETE" });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete template");
    }
  }

  return (
    <section>
      <Link
        className="mb-3 inline-flex min-h-11 items-center text-sm font-semibold text-muted-foreground hover:text-foreground"
        href="/quotations"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Quotations
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Quotation templates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload an HTML design and quotation PDFs will be generated from it. The default
          template is used whenever no specific template is picked.
        </p>
      </div>

      {error ? (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <Card className="mt-4 p-5">
        <div className="max-w-sm space-y-2">
          <Label htmlFor="template-name">Template name</Label>
          <Input
            id="template-name"
            maxLength={120}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Classic blue"
            value={name}
          />
        </div>
        <div
          className={cn(
            "mt-4 flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground",
            dragging ? "border-primary bg-primary/5" : "border-slate-200",
          )}
          onDragLeave={() => setDragging(false)}
          onDragOver={(event: DragEvent) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDrop={(event: DragEvent) => {
            event.preventDefault();
            setDragging(false);
            void upload(event.dataTransfer.files[0]);
          }}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          ) : (
            <UploadCloud className="h-8 w-8 text-slate-400" />
          )}
          <p className="text-sm">
            {uploading ? "Uploading…" : "Drag & drop an .html template file here, or"}
          </p>
          <input
            accept=".html,.htm,text/html"
            className="hidden"
            onChange={(event: ChangeEvent<HTMLInputElement>) => void upload(event.target.files?.[0])}
            ref={fileInput}
            type="file"
          />
          <Button disabled={uploading} onClick={() => fileInput.current?.click()} type="button" variant="outline">
            Choose file
          </Button>
        </div>
      </Card>

      <Card className="mt-4 overflow-hidden">
        {loading ? (
          <div className="grid min-h-40 place-items-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : templates.length ? (
          <div className="divide-y">
            {templates.map((template) => (
              <div className="flex items-center justify-between gap-3 px-4 py-3" key={template.id}>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{template.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Uploaded {formatDate(template.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {template.isDefault ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      <Check className="h-3 w-3" /> Default
                    </span>
                  ) : (
                    <Button onClick={() => void setDefault(template.id)} size="sm" variant="outline">
                      Set default
                    </Button>
                  )}
                  <Button
                    aria-label={"Delete " + template.name}
                    onClick={() => void remove(template.id)}
                    size="icon"
                    variant="ghost"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No templates uploaded yet — quotations use a built-in default design.
          </p>
        )}
      </Card>
    </section>
  );
}
