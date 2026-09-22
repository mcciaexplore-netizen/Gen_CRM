import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import type { Business, User } from "@prisma/client";
import { Prisma } from "@prisma/client";
import type { AuthResponse } from "@msme-crm/shared-types";
import * as bcrypt from "bcrypt";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import type { JwtPayload } from "../../common/interfaces/authenticated-request.interface";
import { PrismaService } from "../../prisma/prisma.service";
import { DEFAULT_PIPELINE_STAGES } from "../pipeline/pipeline.constants";
import type { LoginDto } from "./dto/login.dto";
import type { SignupDto } from "./dto/signup.dto";

const ACCESS_TOKEN_SECONDS = 15 * 60;
const REFRESH_TOKEN_SECONDS = 7 * 24 * 60 * 60;

type UserWithBusiness = User & { business: Business };

@Injectable()
export class AuthService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    config: ConfigService,
  ) {
    const accessSecret = config.get<string>("JWT_ACCESS_SECRET");
    const refreshSecret = config.get<string>("JWT_REFRESH_SECRET");
    if (!accessSecret || !refreshSecret) {
      throw new Error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required");
    }
    this.accessSecret = accessSecret;
    this.refreshSecret = refreshSecret;
  }

  async signup(dto: SignupDto) {
    const passwordHash = await bcrypt.hash(dto.password, 12);
    let user: UserWithBusiness;

    try {
      user = await this.prisma.$transaction(async (transaction) => {
        const business = await transaction.business.create({
          data: { name: dto.businessName.trim() },
        });
        await transaction.pipelineStage.createMany({
          data: DEFAULT_PIPELINE_STAGES.map((stage) => ({
            businessId: business.id,
            ...stage,
          })),
        });
        return transaction.user.create({
          data: {
            businessId: business.id,
            email: dto.email,
            name: dto.ownerName.trim(),
            passwordHash,
            phone: dto.phone.trim(),
            role: "OWNER",
          },
          include: { business: true },
        });
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "An account with this email already exists",
        );
      }
      throw error;
    }

    return this.createSession(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email,
        deletedAt: null,
        business: { deletedAt: null },
      },
      include: { business: true },
    });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password");
    }
    return this.createSession(user);
  }

  async refresh(rawRefreshToken: string) {
    const payload = await this.verifyRefreshToken(rawRefreshToken);
    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        businessId: payload.businessId,
        deletedAt: null,
        business: { deletedAt: null },
      },
      include: { business: true },
    });

    if (
      !user?.refreshTokenHash ||
      !this.refreshTokenMatches(rawRefreshToken, user.refreshTokenHash)
    ) {
      throw new UnauthorizedException("Refresh token is no longer valid");
    }
    return this.createSession(user);
  }

  async logout(rawRefreshToken?: string) {
    if (!rawRefreshToken) return;
    try {
      const payload = await this.verifyRefreshToken(rawRefreshToken);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { refreshTokenHash: true },
      });
      if (
        user?.refreshTokenHash &&
        this.refreshTokenMatches(rawRefreshToken, user.refreshTokenHash)
      ) {
        await this.prisma.user.update({
          where: { id: payload.sub },
          data: { refreshTokenHash: null },
        });
      }
    } catch {
      // Cookies are still cleared for expired or invalid tokens.
    }
  }

  async getSession(userId: string, businessId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, businessId, deletedAt: null },
      include: { business: true },
    });
    if (!user || user.business.deletedAt) {
      throw new UnauthorizedException("Session is no longer valid");
    }
    return this.toPublicSession(user);
  }

  private async createSession(user: UserWithBusiness) {
    const payload = {
      sub: user.id,
      businessId: user.businessId,
      role: user.role,
    };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(
        { ...payload, type: "access", jti: randomUUID() },
        { secret: this.accessSecret, expiresIn: ACCESS_TOKEN_SECONDS },
      ),
      this.jwt.signAsync(
        { ...payload, type: "refresh", jti: randomUUID() },
        { secret: this.refreshSecret, expiresIn: REFRESH_TOKEN_SECONDS },
      ),
    ]);
    const refreshTokenHash = this.hashRefreshToken(refreshToken);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash },
    });

    return {
      response: {
        ...this.toPublicSession(user),
        accessToken,
        expiresIn: ACCESS_TOKEN_SECONDS,
      } satisfies AuthResponse,
      accessToken,
      refreshToken,
    };
  }

  private async verifyRefreshToken(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.refreshSecret,
      });
      if (payload.type !== "refresh" || !payload.businessId) throw new Error();
      return payload;
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
  }

  private hashRefreshToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private refreshTokenMatches(token: string, storedHash: string): boolean {
    const candidateHash = this.hashRefreshToken(token);
    if (candidateHash.length !== storedHash.length) return false;
    return timingSafeEqual(
      Buffer.from(candidateHash, "hex"),
      Buffer.from(storedHash, "hex"),
    );
  }

  private toPublicSession(user: UserWithBusiness) {
    return {
      user: {
        id: user.id,
        businessId: user.businessId,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
      },
      business: {
        id: user.business.id,
        name: user.business.name,
        businessType: user.business.businessType,
        teamSize: user.business.teamSize,
        onboardingCompletedAt:
          user.business.onboardingCompletedAt?.toISOString() ?? null,
        inventoryEnabled: user.business.inventoryEnabled,
      },
    };
  }
}
