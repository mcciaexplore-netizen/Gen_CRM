import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
} from "@nestjs/common";
import type { Response } from "express";
import { CurrentBusiness } from "../../common/decorators/current-business.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import type { JwtPayload } from "../../common/interfaces/authenticated-request.interface";
import { QuotationsService } from "./quotations.service";
import { SaveQuotationDto } from "./dto/save-quotation.dto";
import { ListQuotationsQueryDto } from "./dto/list-quotations-query.dto";

@Controller("quotations")
@Roles("OWNER", "ACCOUNTANT")
export class QuotationsController {
  constructor(private readonly quotations: QuotationsService) {}

  @Get("options")
  @Roles("OWNER", "ACCOUNTANT", "STAFF")
  options(@CurrentBusiness() businessId: string) {
    return this.quotations.options(businessId);
  }

  @Post()
  create(
    @CurrentBusiness() businessId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SaveQuotationDto,
  ) {
    return this.quotations.create(businessId, user.sub, dto);
  }

  @Get()
  @Roles("OWNER", "ACCOUNTANT", "STAFF")
  list(
    @CurrentBusiness() businessId: string,
    @Query() query: ListQuotationsQueryDto,
  ) {
    return this.quotations.list(businessId, query);
  }

  @Get(":id")
  @Roles("OWNER", "ACCOUNTANT", "STAFF")
  findOne(
    @CurrentBusiness() businessId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.quotations.findOne(businessId, id);
  }

  @Get(":id/pdf")
  @Roles("OWNER", "ACCOUNTANT", "STAFF")
  async pdf(
    @CurrentBusiness() businessId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Query("templateId") templateId: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const file = await this.quotations.pdf(businessId, id, templateId || undefined);
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader(
      "Content-Disposition",
      'attachment; filename="' + file.filename.replace(/[^a-zA-Z0-9_.-]/g, "-") + '"',
    );
    response.setHeader("Cache-Control", "private, no-store");
    return new StreamableFile(file.buffer);
  }

  @Put(":id")
  update(
    @CurrentBusiness() businessId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SaveQuotationDto,
  ) {
    return this.quotations.update(businessId, id, dto);
  }

  @Post(":id/send")
  send(
    @CurrentBusiness() businessId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.quotations.send(businessId, id);
  }

  @Post(":id/accept")
  accept(
    @CurrentBusiness() businessId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.quotations.accept(businessId, id);
  }

  @Post(":id/convert")
  convert(
    @CurrentBusiness() businessId: string,
    @CurrentUser() user: JwtPayload,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.quotations.convert(businessId, user.sub, id);
  }

  @Delete(":id")
  softDelete(
    @CurrentBusiness() businessId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.quotations.softDelete(businessId, id);
  }
}
