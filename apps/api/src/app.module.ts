import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { AuditLogInterceptor } from "./common/interceptors/audit-log.interceptor";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { BusinessContextInterceptor } from "./common/interceptors/business-context.interceptor";
import { AuthModule } from "./modules/auth/auth.module";
import { AuditModule } from "./modules/audit/audit.module";
import { BroadcastsModule } from "./modules/broadcasts/broadcasts.module";
import { BillingModule } from "./modules/billing/billing.module";
import { BusinessModule } from "./modules/business/business.module";
import { ChannelsModule } from "./modules/channels/channels.module";
import { ContactsModule } from "./modules/contacts/contacts.module";
import { ConversationsModule } from "./modules/conversations/conversations.module";
import { DealsModule } from "./modules/deals/deals.module";
import { HealthModule } from "./modules/health/health.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { PipelineModule } from "./modules/pipeline/pipeline.module";
import { MarketplaceModule } from "./modules/marketplace/marketplace.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { TasksModule } from "./modules/tasks/tasks.module";
import { WhatsAppModule } from "./modules/whatsapp/whatsapp.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const redisUrl = new URL(
          config.get<string>("REDIS_URL", "redis://localhost:6379"),
        );
        const database = redisUrl.pathname.slice(1);
        return {
          prefix: "sahayakcrm",
          connection: {
            host: redisUrl.hostname,
            port: Number(redisUrl.port || 6379),
            ...(redisUrl.username
              ? { username: decodeURIComponent(redisUrl.username) }
              : {}),
            ...(redisUrl.password
              ? { password: decodeURIComponent(redisUrl.password) }
              : {}),
            ...(database ? { db: Number(database) } : {}),
            ...(redisUrl.protocol === "rediss:" ? { tls: {} } : {}),
          },
        };
      },
    }),
    PrismaModule,
    AuthModule,
    AuditModule,
    BroadcastsModule,
    BillingModule,
    BusinessModule,
    ChannelsModule,
    ContactsModule,
    ConversationsModule,
    DealsModule,
    PipelineModule,
    MarketplaceModule,
    ReportsModule,
    TasksModule,
    WhatsAppModule,
    HealthModule,
    InventoryModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_INTERCEPTOR, useClass: BusinessContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
})
export class AppModule {}
