import { Transform } from "class-transformer";
import { IsOptional, IsString, Length, MaxLength } from "class-validator";

export class SendTextMessageDto {
  @Transform(({ value }: { value: string }) => value.trim())
  @IsString()
  @Length(1, 4096)
  body!: string;

  @IsOptional()
  @Transform(({ value }: { value?: string }) => value?.trim() || undefined)
  @IsString()
  @MaxLength(200)
  subject?: string;
}
