import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";
import { Transform } from "class-transformer";

export class QuotationLineItemDto {
  @IsOptional()
  @IsUUID()
  inventoryItemId?: string;

  @Transform(({ value }: { value: string }) => value.trim())
  @IsString()
  @Length(2, 240)
  description!: string;

  @Transform(({ value }: { value: string }) => value.trim().toUpperCase())
  @IsString()
  @Matches(/^[A-Z0-9.-]{2,12}$/)
  hsnSacCode!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  @Max(999999)
  quantity!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999999999.99)
  rate!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxPercent!: number;
}

export class SaveQuotationDto {
  @IsUUID()
  contactId!: string;

  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== "")
  @IsUUID()
  dealId?: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => QuotationLineItemDto)
  lineItems!: QuotationLineItemDto[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
