import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { DashboardDigestFrequency } from "@msme-crm/shared-types";
import type { Job } from "bullmq";
import { WhatsAppService } from "../whatsapp/whatsapp.service";
import { DashboardDigestSchedulerService } from "./dashboard-digest-scheduler.service";
import {
  OWNER_DIGEST_QUEUE,
  SEND_OWNER_DIGEST_JOB,
  SYNC_OWNER_DIGEST_SCHEDULES_JOB,
} from "./reports.constants";
import { ReportsService } from "./reports.service";

interface OwnerDigestJobData {
  businessId: string;
  frequency: DashboardDigestFrequency;
}

@Processor(OWNER_DIGEST_QUEUE)
export class DashboardDigestProcessor extends WorkerHost {
  private readonly logger = new Logger(DashboardDigestProcessor.name);

  constructor(
    private readonly reports: ReportsService,
    private readonly whatsapp: WhatsAppService,
    private readonly scheduler: DashboardDigestSchedulerService,
  ) {
    super();
  }

  async process(job: Job<OwnerDigestJobData>) {
    if (job.name === SYNC_OWNER_DIGEST_SCHEDULES_JOB) {
      return this.scheduler.syncSchedules();
    }
    if (job.name !== SEND_OWNER_DIGEST_JOB) {
      throw new Error("Unsupported owner digest job: " + job.name);
    }
    const digest = await this.reports.digest(
      job.data.businessId,
      job.data.frequency,
    );
    const result = await this.whatsapp.sendOwnerDigest({
      businessId: job.data.businessId,
      frequency: job.data.frequency,
      message: digest.message,
    });
    this.logger.log(
      `${job.data.frequency} owner digest ${result.status} for business ${job.data.businessId}`,
    );
    return result;
  }
}
