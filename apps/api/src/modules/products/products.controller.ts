import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
} from "@nestjs/common";
import { CurrentBusiness } from "../../common/decorators/current-business.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { ProductsService } from "./products.service";
import { SaveProductDto } from "./dto/save-product.dto";

@Controller("products")
@Roles("OWNER", "ACCOUNTANT", "STAFF")
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  list(@CurrentBusiness() businessId: string) {
    return this.products.list(businessId);
  }

  @Post()
  @Roles("OWNER", "ACCOUNTANT")
  create(
    @CurrentBusiness() businessId: string,
    @Body() dto: SaveProductDto,
  ) {
    return this.products.create(businessId, dto);
  }

  @Put(":id")
  @Roles("OWNER", "ACCOUNTANT")
  update(
    @CurrentBusiness() businessId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SaveProductDto,
  ) {
    return this.products.update(businessId, id, dto);
  }

  @Delete(":id")
  @Roles("OWNER")
  deactivate(
    @CurrentBusiness() businessId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.products.deactivate(businessId, id);
  }
}
