import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import {
  PROCESS_360DIALOG_WEBHOOK_JOB,
  WHATSAPP_WEBHOOK_QUEUE,
} from "./conversations.constants";
import { WhatsAppWebhookService } from "./whatsapp-webhook.service";

@Processor(WHATSAPP_WEBHOOK_QUEUE)
export class WhatsAppWebhookProcessor extends WorkerHost {
  constructor(private readonly webhooks: WhatsAppWebhookService) {
    super();
  }

  async process(job: Job<{ payload: unknown }>) {
    if (job.name !== PROCESS_360DIALOG_WEBHOOK_JOB) {
      throw new Error("Unsupported WhatsApp webhook job: " + job.name);
    }
    return this.webhooks.process(job.data.payload);
  }
}
