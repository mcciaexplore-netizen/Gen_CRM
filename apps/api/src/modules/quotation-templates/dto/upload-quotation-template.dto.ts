import { IsString, Length } from "class-validator";

export class UploadQuotationTemplateDto {
  @IsString()
  @Length(1, 120)
  name!: string;
}
