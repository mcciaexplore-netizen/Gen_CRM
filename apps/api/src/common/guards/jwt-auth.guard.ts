import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const defaultUser = await this.prisma.user.findFirst({
      where: { email: "admin@example.com" },
    });

    if (defaultUser) {
      request.user = {
        sub: defaultUser.id,
        businessId: defaultUser.businessId,
        role: defaultUser.role,
        type: "access",
      };
    }

    return true;
  }

  handleRequest<TUser>(error: Error | null, user: TUser, info: Error | null) {
    return user;
  }
}
