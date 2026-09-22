import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { BillingModule } from "../billing/billing.module";
import { WhatsAppModule } from "../whatsapp/whatsapp.module";
import { TaskAutomationService } from "./task-automation.service";
import { TaskMaintenanceProcessor } from "./task-maintenance.processor";
import { TaskSchedulerService } from "./task-scheduler.service";
import {
  TASK_MAINTENANCE_QUEUE,
  WHATSAPP_REMINDER_QUEUE,
} from "./tasks.constants";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";
import { WhatsAppReminderProcessor } from "./whatsapp-reminder.processor";

@Module({
  imports: [
    BillingModule,
    WhatsAppModule,
    BullModule.registerQueue(
      { name: TASK_MAINTENANCE_QUEUE },
      { name: WHATSAPP_REMINDER_QUEUE },
    ),
  ],
  controllers: [TasksController],
  providers: [
    TasksService,
    TaskAutomationService,
    TaskMaintenanceProcessor,
    WhatsAppReminderProcessor,
    TaskSchedulerService,
  ],
  exports: [TasksService],
})
export class TasksModule {}
