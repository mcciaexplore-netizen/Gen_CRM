import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { HtmlPdfService } from "../../common/pdf/html-pdf.service";
import { QuotationTemplatesModule } from "../quotation-templates/quotation-templates.module";
import { QuotationsController } from "./quotations.controller";
import { QuotationsService } from "./quotations.service";

@Module({
  imports: [PrismaModule, QuotationTemplatesModule],
  controllers: [QuotationsController],
  providers: [QuotationsService, HtmlPdfService],
  exports: [QuotationsService],
})
export class QuotationsModule {}
