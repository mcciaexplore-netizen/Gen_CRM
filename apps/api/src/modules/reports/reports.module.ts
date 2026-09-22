import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { TasksModule } from "../tasks/tasks.module";
import { WhatsAppModule } from "../whatsapp/whatsapp.module";
import { DashboardDigestProcessor } from "./dashboard-digest.processor";
import { DashboardDigestSchedulerService } from "./dashboard-digest-scheduler.service";
import { OWNER_DIGEST_QUEUE } from "./reports.constants";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";

@Module({
  imports: [
    BillingModule,
    TasksModule,
    WhatsAppModule,
    BullModule.registerQueue({ name: OWNER_DIGEST_QUEUE }),
  ],
  controllers: [ReportsController],
  providers: [
    ReportsService,
    DashboardDigestSchedulerService,
    DashboardDigestProcessor,
  ],
})
export class ReportsModule {}
