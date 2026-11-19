-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'EXPIRED', 'CONVERTED');

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN     "quotation_sequence" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "description" TEXT,
ADD COLUMN     "hsn_sac_code" TEXT,
ADD COLUMN     "tax_percent" DECIMAL(5,2) NOT NULL DEFAULT 18;

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "expires_at" TIMESTAMP(3),
ADD COLUMN     "grand_total" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "quote_number" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
ADD COLUMN     "tax_total" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "gmail_connections_business_id_idx" ON "gmail_connections"("business_id");

-- CreateIndex
CREATE UNIQUE INDEX "quotations_business_id_quote_number_key" ON "quotations"("business_id", "quote_number");

-- RenameIndex
ALTER INDEX "whatsapp_campaign_recipients_business_id_external_message_id_ke" RENAME TO "whatsapp_campaign_recipients_business_id_external_message_i_key";

