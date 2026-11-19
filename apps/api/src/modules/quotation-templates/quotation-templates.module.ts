import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { QuotationTemplatesController } from "./quotation-templates.controller";
import { QuotationTemplatesService } from "./quotation-templates.service";

@Module({
  imports: [PrismaModule],
  controllers: [QuotationTemplatesController],
  providers: [QuotationTemplatesService],
  exports: [QuotationTemplatesService],
})
export class QuotationTemplatesModule {}
