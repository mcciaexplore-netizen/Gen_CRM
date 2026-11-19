import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import type { SaveProductDto } from "./dto/save-product.dto";

const productSelect = {
  id: true,
  sku: true,
  name: true,
  description: true,
  unit: true,
  sellingPrice: true,
  hsnSacCode: true,
  taxPercent: true,
  active: true,
} satisfies Prisma.InventoryItemSelect;

type ProductRecord = Prisma.InventoryItemGetPayload<{ select: typeof productSelect }>;

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(businessId: string) {
    const items = await this.prisma.inventoryItem.findMany({
      where: { businessId, deletedAt: null, active: true },
      select: productSelect,
      orderBy: { name: "asc" },
    });
    return items.map((item) => this.toProduct(item));
  }

  async create(businessId: string, dto: SaveProductDto) {
    try {
      const item = await this.prisma.inventoryItem.create({
        data: {
          businessId,
          sku: dto.sku.trim().toUpperCase(),
          name: dto.name.trim(),
          description: dto.description?.trim() || null,
          unit: dto.unit?.trim() || "piece",
          sellingPrice: dto.sellingPrice ?? 0,
          hsnSacCode: dto.hsnSacCode?.trim().toUpperCase() || null,
          taxPercent: dto.taxPercent ?? 18,
          quantityOnHand: 0,
          reorderLevel: 0,
          active: dto.active ?? true,
        },
        select: productSelect,
      });
      return this.toProduct(item);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("A product with this SKU already exists");
      }
      throw error;
    }
  }

  async update(businessId: string, id: string, dto: SaveProductDto) {
    const existing = await this.prisma.inventoryItem.findFirst({
      where: { id, businessId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Product not found");

    try {
      const item = await this.prisma.inventoryItem.update({
        where: { id },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
          ...(dto.unit !== undefined ? { unit: dto.unit.trim() } : {}),
          ...(dto.sellingPrice !== undefined ? { sellingPrice: dto.sellingPrice } : {}),
          ...(dto.hsnSacCode !== undefined ? { hsnSacCode: dto.hsnSacCode.trim().toUpperCase() || null } : {}),
          ...(dto.taxPercent !== undefined ? { taxPercent: dto.taxPercent } : {}),
          ...(dto.active !== undefined ? { active: dto.active } : {}),
        },
        select: productSelect,
      });
      return this.toProduct(item);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("A product with this SKU already exists");
      }
      throw error;
    }
  }

  async deactivate(businessId: string, id: string) {
    const existing = await this.prisma.inventoryItem.findFirst({
      where: { id, businessId, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException("Product not found");

    await this.prisma.inventoryItem.update({
      where: { id },
      data: { active: false, deletedAt: new Date() },
    });
    return { success: true };
  }

  private toProduct(item: ProductRecord) {
    return {
      id: item.id,
      sku: item.sku,
      name: item.name,
      description: item.description,
      unit: item.unit,
      sellingPrice: Number(item.sellingPrice),
      hsnSacCode: item.hsnSacCode,
      taxPercent: Number(item.taxPercent),
      active: item.active,
    };
  }
}
