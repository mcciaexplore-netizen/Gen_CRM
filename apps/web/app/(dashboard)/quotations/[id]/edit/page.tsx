"use client";

import type { QuotationDetail } from "@msme-crm/shared-types";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { QuotationForm } from "@/components/quotations/quotation-form";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

export default function EditQuotationPage({
  params,
}: {
  params: { id: string };
}) {
  const [quotation, setQuotation] = useState<QuotationDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch<QuotationDetail>("/quotations/" + params.id)
      .then(setQuotation)
      .catch((caught) =>
        setError(caught instanceof Error ? caught.message : "Unable to load quotation"),
      );
  }, [params.id]);

  if (error) {
    return (
      <div className="rounded-lg border bg-white p-6 text-center">
        <p className="text-red-700" role="alert">
          {error}
        </p>
        <Button asChild className="mt-4" variant="outline">
          <Link href={"/quotations/" + params.id}>Back to quotation</Link>
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
        href={"/quotations/" + quotation.id}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Quotation
      </Link>
      <QuotationForm quotation={quotation} />
    </section>
  );
}
