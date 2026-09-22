import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { JwtPayload } from "../../common/interfaces/authenticated-request.interface";

const accessCookieExtractor = (request: Request): string | null =>
  request.cookies?.crm_access_token ?? null;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret = config.get<string>("JWT_ACCESS_SECRET");
    if (!secret) throw new Error("JWT_ACCESS_SECRET is required");

    super({
      ignoreExpiration: false,
      jwtFromRequest: ExtractJwt.fromExtractors([
        accessCookieExtractor,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: secret,
    });
  }

  validate(payload: JwtPayload): JwtPayload {
    if (payload.type !== "access" || !payload.businessId) {
      throw new UnauthorizedException("Invalid access token");
    }
    return payload;
  }
}
