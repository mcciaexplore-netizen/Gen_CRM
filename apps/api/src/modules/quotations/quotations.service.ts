import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, QuotationStatus } from "@prisma/client";
import * as Handlebars from "handlebars";
import { HtmlPdfService } from "../../common/pdf/html-pdf.service";
import { PrismaService } from "../../prisma/prisma.service";
import { QuotationTemplatesService } from "../quotation-templates/quotation-templates.service";
import { DEFAULT_QUOTATION_TEMPLATE_HTML } from "./default-quotation-template";
import type { SaveQuotationDto, QuotationLineItemDto } from "./dto/save-quotation.dto";
import type { ListQuotationsQueryDto } from "./dto/list-quotations-query.dto";

const statusToPrisma: Record<string, QuotationStatus> = {
  draft: QuotationStatus.DRAFT,
  sent: QuotationStatus.SENT,
  accepted: QuotationStatus.ACCEPTED,
  expired: QuotationStatus.EXPIRED,
  converted: QuotationStatus.CONVERTED,
};

const statusFromPrisma: Record<QuotationStatus, string> = {
  DRAFT: "draft",
  SENT: "sent",
  ACCEPTED: "accepted",
  EXPIRED: "expired",
  CONVERTED: "converted",
};

export interface LineItemCalculated {
  inventoryItemId?: string;
  description: string;
  hsnSacCode: string;
  quantity: number;
  rate: number;
  discountPercent: number;
  discountAmount: number;
  taxableAmount: number;
  taxPercent: number;
  lineTotal: number;
}

@Injectable()
export class QuotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templates: QuotationTemplatesService,
    private readonly htmlPdf: HtmlPdfService,
  ) {}

  async options(businessId: string) {
    const [contacts, deals, products] = await Promise.all([
      this.prisma.contact.findMany({
        where: { businessId, deletedAt: null },
        select: { id: true, name: true, phone: true },
        orderBy: { name: "asc" },
        take: 200,
      }),
      this.prisma.deal.findMany({
        where: { businessId, deletedAt: null },
        select: { id: true, title: true, contactId: true },
        orderBy: { updatedAt: "desc" },
        take: 200,
      }),
      this.prisma.inventoryItem.findMany({
        where: { businessId, deletedAt: null, active: true },
        select: {
          id: true,
          sku: true,
          name: true,
          sellingPrice: true,
          hsnSacCode: true,
          taxPercent: true,
          unit: true,
        },
        orderBy: { name: "asc" },
        take: 500,
      }),
    ]);

    return {
      contacts,
      deals,
      products: products.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        sellingPrice: Number(p.sellingPrice),
        hsnSacCode: p.hsnSacCode,
        taxPercent: Number(p.taxPercent),
        unit: p.unit,
      })),
    };
  }

  async create(businessId: string, userId: string, dto: SaveQuotationDto) {
    await this.assertRelations(businessId, dto.contactId, dto.dealId);
    const totals = this.calculate(dto.lineItems);

    const quotation = await this.prisma.$transaction(async (tx) => {
      const business = await tx.business.update({
        where: { id: businessId },
        data: { quotationSequence: { increment: 1 } },
        select: { quotationSequence: true },
      });
      return tx.quotation.create({
        data: {
          businessId,
          contactId: dto.contactId,
          dealId: dto.dealId || null,
          lineItems: totals.lineItems as unknown as Prisma.InputJsonValue,
          quoteNumber: business.quotationSequence,
          status: QuotationStatus.DRAFT,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
          notes: dto.notes || null,
          subtotal: totals.subtotal,
          taxTotal: totals.taxTotal,
          grandTotal: totals.grandTotal,
          createdById: userId,
        },
        select: this.quotationSelect(),
      });
    });

    return this.toDetail(quotation);
  }

  async list(businessId: string, query: ListQuotationsQueryDto) {
    const where: Prisma.QuotationWhereInput = {
      businessId,
      deletedAt: null,
      ...(query.status ? { status: statusToPrisma[query.status] } : {}),
      ...(query.contactId ? { contactId: query.contactId } : {}),
      ...(query.dealId ? { dealId: query.dealId } : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.quotation.findMany({
        where,
        select: this.quotationListSelect(),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take: query.limit,
      }),
      this.prisma.quotation.count({ where }),
    ]);
    return { items: items.map((q) => this.toSummary(q)), total, page: query.page, limit: query.limit };
  }

  async findOne(businessId: string, id: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, businessId, deletedAt: null },
      select: this.quotationSelect(),
    });
    if (!quotation) throw new NotFoundException("Quotation not found");
    return this.toDetail(quotation);
  }

  async update(businessId: string, id: string, dto: SaveQuotationDto) {
    const existing = await this.prisma.quotation.findFirst({
      where: { id, businessId, deletedAt: null },
      select: { status: true },
    });
    if (!existing) throw new NotFoundException("Quotation not found");
    if (existing.status !== QuotationStatus.DRAFT) {
      throw new ConflictException("Only DRAFT quotations can be edited");
    }
    await this.assertRelations(businessId, dto.contactId, dto.dealId);
    const totals = this.calculate(dto.lineItems);

    await this.prisma.quotation.updateMany({
      where: { id, businessId, status: QuotationStatus.DRAFT, deletedAt: null },
      data: {
        contactId: dto.contactId,
        dealId: dto.dealId || null,
        lineItems: totals.lineItems as unknown as Prisma.InputJsonValue,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        notes: dto.notes || null,
        subtotal: totals.subtotal,
        taxTotal: totals.taxTotal,
        grandTotal: totals.grandTotal,
      },
    });
    return this.findOne(businessId, id);
  }

  async send(businessId: string, id: string) {
    const existing = await this.prisma.quotation.findFirst({
      where: { id, businessId, deletedAt: null },
      select: { status: true },
    });
    if (!existing) throw new NotFoundException("Quotation not found");
    if (existing.status !== QuotationStatus.DRAFT) {
      throw new ConflictException("Only DRAFT quotations can be sent");
    }
    await this.prisma.quotation.updateMany({
      where: { id, businessId, deletedAt: null },
      data: { status: QuotationStatus.SENT },
    });
    return this.findOne(businessId, id);
  }

  async accept(businessId: string, id: string) {
    const existing = await this.prisma.quotation.findFirst({
      where: { id, businessId, deletedAt: null },
      select: { status: true },
    });
    if (!existing) throw new NotFoundException("Quotation not found");
    if (
      existing.status !== QuotationStatus.SENT &&
      existing.status !== QuotationStatus.DRAFT
    ) {
      throw new ConflictException("Only DRAFT or SENT quotations can be accepted");
    }
    await this.prisma.quotation.updateMany({
      where: { id, businessId, deletedAt: null },
      data: { status: QuotationStatus.ACCEPTED },
    });
    return this.findOne(businessId, id);
  }

  async convert(businessId: string, userId: string, id: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, businessId, deletedAt: null },
      select: {
        status: true,
        contactId: true,
        dealId: true,
        lineItems: true,
        subtotal: true,
        taxTotal: true,
        grandTotal: true,
      },
    });
    if (!quotation) throw new NotFoundException("Quotation not found");
    if (
      quotation.status !== QuotationStatus.ACCEPTED &&
      quotation.status !== QuotationStatus.SENT
    ) {
      throw new ConflictException("Only ACCEPTED or SENT quotations can be converted");
    }

    const lineItemsArr = this.parseLineItems(quotation.lineItems);
    const totals = this.calculate(lineItemsArr);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.quotation.updateMany({
        where: { id, businessId, deletedAt: null },
        data: { status: QuotationStatus.CONVERTED },
      });

      const contact = await tx.contact.findFirst({
        where: { id: quotation.contactId, businessId, deletedAt: null },
        select: { creditTermsDays: true },
      });
      const creditTermsDays = contact?.creditTermsDays ?? 30;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + creditTermsDays);
      dueDate.setUTCHours(0, 0, 0, 0);

      const business = await tx.business.update({
        where: { id: businessId },
        data: { invoiceSequence: { increment: 1 } },
        select: { invoiceSequence: true },
      });
      const now = new Date();
      const year = new Intl.DateTimeFormat("en", {
        year: "numeric",
        timeZone: "Asia/Kolkata",
      }).format(now);
      const invoiceNumber =
        "INV-" + year + "-" + String(business.invoiceSequence).padStart(6, "0");

      const invoice = await tx.invoice.create({
        data: {
          businessId,
          contactId: quotation.contactId,
          dealId: quotation.dealId || null,
          lineItems: totals.lineItems as unknown as Prisma.InputJsonValue,
          subtotal: totals.subtotal,
          taxTotal: totals.taxTotal,
          grandTotal: totals.grandTotal,
          dueDate,
          creditTermsDays,
          createdById: userId,
          invoiceNumber,
          issuedAt: now,
          status: "DRAFT",
        },
        select: { id: true },
      });
      return { invoiceId: invoice.id };
    });

    return result;
  }

  async softDelete(businessId: string, id: string) {
    const existing = await this.prisma.quotation.findFirst({
      where: { id, businessId, deletedAt: null },
      select: { status: true },
    });
    if (!existing) throw new NotFoundException("Quotation not found");
    if (existing.status !== QuotationStatus.DRAFT) {
      throw new ConflictException("Only DRAFT quotations can be deleted");
    }
    await this.prisma.quotation.updateMany({
      where: { id, businessId, status: QuotationStatus.DRAFT, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return { success: true };
  }

  async pdf(businessId: string, id: string, templateId?: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: { id, businessId, deletedAt: null },
      select: this.quotationPdfSelect(),
    });
    if (!quotation) throw new NotFoundException("Quotation not found");

    const html = templateId
      ? await this.templates.getHtml(businessId, templateId)
      : (await this.templates.getDefaultHtml(businessId)) ?? DEFAULT_QUOTATION_TEMPLATE_HTML;

    const template = Handlebars.compile(html, { noEscape: true });
    const renderedHtml = template(this.toPdfContext(quotation));
    const buffer = await this.htmlPdf.render(renderedHtml);
    return {
      buffer,
      filename: `Quotation-${quotation.quoteNumber}.pdf`,
    };
  }

  // ── private helpers ─────────────────────────────────────────────────────────

  private calculate(items: Array<QuotationLineItemDto | LineItemCalculated>) {
    const lineItems: LineItemCalculated[] = items.map((item) => ({
      ...(item.inventoryItemId ? { inventoryItemId: item.inventoryItemId } : {}),
      description: item.description.trim(),
      hsnSacCode: item.hsnSacCode.trim().toUpperCase(),
      quantity: item.quantity,
      rate: item.rate,
      discountPercent: item.discountPercent ?? 0,
      discountAmount: 0,
      taxableAmount: 0,
      taxPercent: item.taxPercent,
      lineTotal: 0,
    }));

    let subtotal = new Prisma.Decimal(0);
    let taxTotal = new Prisma.Decimal(0);

    for (const item of lineItems) {
      const base = new Prisma.Decimal(item.quantity)
        .mul(item.rate)
        .toDecimalPlaces(2);
      const discount = base
        .mul(item.discountPercent ?? 0)
        .div(100)
        .toDecimalPlaces(2);
      const taxable = base.sub(discount).toDecimalPlaces(2);
      const tax = taxable.mul(item.taxPercent).div(100).toDecimalPlaces(2);

      item.discountAmount = Number(discount);
      item.taxableAmount = Number(taxable);
      item.lineTotal = Number(taxable.add(tax).toDecimalPlaces(2));

      subtotal = subtotal.add(base);
      taxTotal = taxTotal.add(tax);
    }

    const discountTotal = subtotal.sub(
      lineItems.reduce((sum, i) => sum.add(i.taxableAmount), new Prisma.Decimal(0)),
    );
    const grandTotal = subtotal.sub(discountTotal).add(taxTotal);

    return {
      lineItems,
      subtotal: subtotal.toDecimalPlaces(2),
      taxTotal: taxTotal.toDecimalPlaces(2),
      grandTotal: grandTotal.toDecimalPlaces(2),
    };
  }

  private parseLineItems(value: Prisma.JsonValue): LineItemCalculated[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((candidate) => {
      if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return [];
      const item = candidate as Record<string, unknown>;
      if (
        typeof item.description !== "string" ||
        typeof item.hsnSacCode !== "string" ||
        typeof item.quantity !== "number" ||
        typeof item.rate !== "number" ||
        typeof item.taxPercent !== "number"
      ) return [];
      return [{
        ...(typeof item.inventoryItemId === "string" ? { inventoryItemId: item.inventoryItemId } : {}),
        description: item.description,
        hsnSacCode: item.hsnSacCode,
        quantity: item.quantity,
        rate: item.rate,
        discountPercent: typeof item.discountPercent === "number" ? item.discountPercent : 0,
        discountAmount: typeof item.discountAmount === "number" ? item.discountAmount : 0,
        taxableAmount: typeof item.taxableAmount === "number" ? item.taxableAmount : 0,
        taxPercent: item.taxPercent,
        lineTotal: typeof item.lineTotal === "number" ? item.lineTotal : 0,
      }];
    });
  }

  private async assertRelations(
    businessId: string,
    contactId: string,
    dealId?: string | null,
  ) {
    const [contact, deal] = await Promise.all([
      this.prisma.contact.findFirst({
        where: { id: contactId, businessId, deletedAt: null },
        select: { id: true },
      }),
      dealId
        ? this.prisma.deal.findFirst({
            where: { id: dealId, businessId, deletedAt: null },
            select: { id: true, contactId: true },
          })
        : null,
    ]);
    if (!contact) throw new BadRequestException("Selected contact not found");
    if (dealId && !deal) throw new BadRequestException("Selected deal not found");
    if (deal && deal.contactId !== contactId) {
      throw new BadRequestException("Deal does not belong to the selected contact");
    }
  }

  private quotationSelect() {
    return {
      id: true,
      quoteNumber: true,
      status: true,
      expiresAt: true,
      notes: true,
      lineItems: true,
      subtotal: true,
      taxTotal: true,
      grandTotal: true,
      createdAt: true,
      updatedAt: true,
      contact: { select: { id: true, name: true, phone: true } },
      deal: { select: { id: true, title: true } },
      createdBy: { select: { id: true, name: true } },
    } satisfies Prisma.QuotationSelect;
  }

  private quotationPdfSelect() {
    return {
      id: true,
      quoteNumber: true,
      status: true,
      expiresAt: true,
      notes: true,
      lineItems: true,
      subtotal: true,
      taxTotal: true,
      grandTotal: true,
      createdAt: true,
      contact: { select: { name: true, phone: true, email: true } },
      business: {
        select: {
          name: true,
          gstin: true,
          stateCode: true,
          users: {
            where: { role: "OWNER", deletedAt: null },
            orderBy: { createdAt: "asc" },
            take: 1,
            select: { email: true, phone: true },
          },
        },
      },
    } satisfies Prisma.QuotationSelect;
  }

  private toPdfContext(
    quotation: Prisma.QuotationGetPayload<{ select: ReturnType<QuotationsService["quotationPdfSelect"]> }>,
  ) {
    const formatInr = (value: number) =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value);
    const formatDate = (value: Date | null) =>
      value
        ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(value)
        : null;
    const lineItems = this.parseLineItems(quotation.lineItems);

    return {
      business: {
        name: quotation.business.name,
        email: quotation.business.users[0]?.email ?? null,
        phone: quotation.business.users[0]?.phone ?? null,
        gstin: quotation.business.gstin,
        stateCode: quotation.business.stateCode,
      },
      quotation: {
        quoteNumber: quotation.quoteNumber,
        status: statusFromPrisma[quotation.status],
        expiresAt: formatDate(quotation.expiresAt),
        notes: quotation.notes,
        createdAt: formatDate(quotation.createdAt),
      },
      contact: {
        name: quotation.contact.name,
        phone: quotation.contact.phone,
        email: quotation.contact.email,
      },
      lineItems: lineItems.map((item) => ({
        ...item,
        rateFormatted: formatInr(item.rate),
        lineTotalFormatted: formatInr(item.lineTotal),
      })),
      subtotal: Number(quotation.subtotal),
      subtotalFormatted: formatInr(Number(quotation.subtotal)),
      taxTotal: Number(quotation.taxTotal),
      taxTotalFormatted: formatInr(Number(quotation.taxTotal)),
      grandTotal: Number(quotation.grandTotal),
      grandTotalFormatted: formatInr(Number(quotation.grandTotal)),
    };
  }

  private quotationListSelect() {
    return {
      id: true,
      quoteNumber: true,
      status: true,
      expiresAt: true,
      subtotal: true,
      taxTotal: true,
      grandTotal: true,
      createdAt: true,
      updatedAt: true,
      contact: { select: { id: true, name: true, phone: true } },
      deal: { select: { id: true, title: true } },
    } satisfies Prisma.QuotationSelect;
  }

  private toSummary(q: Prisma.QuotationGetPayload<{ select: ReturnType<QuotationsService["quotationListSelect"]> }>) {
    return {
      id: q.id,
      quoteNumber: q.quoteNumber,
      status: statusFromPrisma[q.status],
      expiresAt: q.expiresAt?.toISOString() ?? null,
      contact: q.contact,
      deal: q.deal,
      subtotal: Number(q.subtotal),
      taxTotal: Number(q.taxTotal),
      grandTotal: Number(q.grandTotal),
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
    };
  }

  private toDetail(q: Prisma.QuotationGetPayload<{ select: ReturnType<QuotationsService["quotationSelect"]> }>) {
    return {
      id: q.id,
      quoteNumber: q.quoteNumber,
      status: statusFromPrisma[q.status],
      expiresAt: q.expiresAt?.toISOString() ?? null,
      notes: q.notes,
      lineItems: this.parseLineItems(q.lineItems),
      contact: q.contact,
      deal: q.deal,
      createdBy: q.createdBy,
      subtotal: Number(q.subtotal),
      taxTotal: Number(q.taxTotal),
      grandTotal: Number(q.grandTotal),
      createdAt: q.createdAt.toISOString(),
      updatedAt: q.updatedAt.toISOString(),
    };
  }
}
