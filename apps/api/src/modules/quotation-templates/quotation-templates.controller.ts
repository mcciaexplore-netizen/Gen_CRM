import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { CurrentBusiness } from "../../common/decorators/current-business.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { UploadQuotationTemplateDto } from "./dto/upload-quotation-template.dto";
import { QuotationTemplatesService } from "./quotation-templates.service";

@Controller("quotation-templates")
@Roles("OWNER", "ACCOUNTANT")
export class QuotationTemplatesController {
  constructor(private readonly templates: QuotationTemplatesService) {}

  @Get()
  @Roles("OWNER", "ACCOUNTANT", "STAFF")
  list(@CurrentBusiness() businessId: string) {
    return this.templates.list(businessId);
  }

  @Post()
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 1024 * 1024 } }))
  create(
    @CurrentBusiness() businessId: string,
    @Body() dto: UploadQuotationTemplateDto,
    @UploadedFile() file?: { originalname: string; buffer: Buffer },
  ) {
    return this.templates.create(businessId, dto.name, file);
  }

  @Put(":id/default")
  setDefault(
    @CurrentBusiness() businessId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.templates.setDefault(businessId, id);
  }

  @Delete(":id")
  remove(
    @CurrentBusiness() businessId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.templates.remove(businessId, id);
  }
}
