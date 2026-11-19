import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

const MAX_HTML_LENGTH = 300_000;

@Injectable()
export class QuotationTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(businessId: string) {
    const templates = await this.prisma.quotationTemplate.findMany({
      where: { businessId, deletedAt: null },
      select: { id: true, name: true, isDefault: true, createdAt: true, updatedAt: true },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return templates.map((template) => ({
      id: template.id,
      name: template.name,
      isDefault: template.isDefault,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    }));
  }

  async create(
    businessId: string,
    name: string,
    file: { originalname: string; buffer: Buffer } | undefined,
  ) {
    if (!file) throw new BadRequestException("A template file is required");
    const htmlContent = file.buffer.toString("utf8").trim();
    if (!htmlContent) throw new BadRequestException("The template file is empty");
    if (htmlContent.length > MAX_HTML_LENGTH) {
      throw new BadRequestException("The template file is too large");
    }

    const existingCount = await this.prisma.quotationTemplate.count({
      where: { businessId, deletedAt: null },
    });

    const template = await this.prisma.quotationTemplate.create({
      data: {
        businessId,
        name: name.trim(),
        htmlContent,
        isDefault: existingCount === 0,
      },
      select: { id: true, name: true, isDefault: true, createdAt: true, updatedAt: true },
    });
    return {
      id: template.id,
      name: template.name,
      isDefault: template.isDefault,
      createdAt: template.createdAt.toISOString(),
      updatedAt: template.updatedAt.toISOString(),
    };
  }

  async setDefault(businessId: string, id: string) {
    const existing = await this.prisma.quotationTemplate.findFirst({
      where: { id, businessId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Template not found");
    await this.prisma.$transaction([
      this.prisma.quotationTemplate.updateMany({
        where: { businessId, deletedAt: null },
        data: { isDefault: false },
      }),
      this.prisma.quotationTemplate.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);
    return { success: true };
  }

  async remove(businessId: string, id: string) {
    const existing = await this.prisma.quotationTemplate.findFirst({
      where: { id, businessId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Template not found");
    await this.prisma.quotationTemplate.update({
      where: { id },
      data: { deletedAt: new Date(), isDefault: false },
    });
    return { success: true };
  }

  async getHtml(businessId: string, id: string) {
    const template = await this.prisma.quotationTemplate.findFirst({
      where: { id, businessId, deletedAt: null },
      select: { htmlContent: true },
    });
    if (!template) throw new NotFoundException("Template not found");
    return template.htmlContent;
  }

  async getDefaultHtml(businessId: string) {
    const template = await this.prisma.quotationTemplate.findFirst({
      where: { businessId, isDefault: true, deletedAt: null },
      select: { htmlContent: true },
    });
    return template?.htmlContent ?? null;
  }
}
