import { IsBoolean, IsNumber, IsOptional, IsString, Length, Max, Min } from "class-validator";

export class SaveProductDto {
  @IsString()
  @Length(1, 60)
  sku!: string;

  @IsString()
  @Length(2, 160)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @Length(1, 30)
  unit?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999999999)
  sellingPrice?: number;

  @IsOptional()
  @IsString()
  @Length(0, 20)
  hsnSacCode?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  taxPercent?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
