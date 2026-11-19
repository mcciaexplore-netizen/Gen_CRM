import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { QuotationForm } from "@/components/quotations/quotation-form";

export default function NewQuotationPage({
  searchParams,
}: {
  searchParams: { dealId?: string };
}) {
  return (
    <section>
      <Link
        className="mb-3 inline-flex min-h-11 items-center text-sm font-semibold text-muted-foreground hover:text-foreground"
        href="/quotations"
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Quotations
      </Link>
      <QuotationForm initialDealId={searchParams.dealId} />
    </section>
  );
}
