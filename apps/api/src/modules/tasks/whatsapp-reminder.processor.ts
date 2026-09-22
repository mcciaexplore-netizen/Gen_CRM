import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { WhatsAppService } from "../whatsapp/whatsapp.service";
import {
  SEND_WHATSAPP_REMINDER_JOB,
  WHATSAPP_REMINDER_QUEUE,
} from "./tasks.constants";

interface WhatsAppReminderJobData {
  businessId: string;
  taskId: string;
  taskTitle: string;
  dueAt: string;
  assignedTo: { id: string; name: string; phone: string };
}

@Processor(WHATSAPP_REMINDER_QUEUE)
export class WhatsAppReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(WhatsAppReminderProcessor.name);

  constructor(private readonly whatsapp: WhatsAppService) {
    super();
  }

  async process(job: Job<WhatsAppReminderJobData>) {
    if (job.name !== SEND_WHATSAPP_REMINDER_JOB) {
      throw new Error("Unsupported WhatsApp reminder job: " + job.name);
    }
    const result = await this.whatsapp.sendTaskReminder(job.data);
    this.logger.log(
      "WhatsApp task reminder " +
        result.status +
        " for task " +
        job.data.taskId,
    );
    return result;
  }
}
