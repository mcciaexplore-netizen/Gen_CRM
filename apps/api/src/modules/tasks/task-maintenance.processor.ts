import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import type { Job } from "bullmq";
import { TaskAutomationService } from "./task-automation.service";
import {
  DAILY_TASK_MAINTENANCE_JOB,
  TASK_MAINTENANCE_QUEUE,
} from "./tasks.constants";

@Processor(TASK_MAINTENANCE_QUEUE)
export class TaskMaintenanceProcessor extends WorkerHost {
  private readonly logger = new Logger(TaskMaintenanceProcessor.name);

  constructor(private readonly automation: TaskAutomationService) {
    super();
  }

  async process(job: Job) {
    if (job.name !== DAILY_TASK_MAINTENANCE_JOB) {
      throw new Error("Unsupported task maintenance job: " + job.name);
    }
    const result = await this.automation.runDaily();
    this.logger.log(
      "Daily task maintenance completed for " +
        result.businessesProcessed +
        " businesses",
    );
    return result;
  }
}
