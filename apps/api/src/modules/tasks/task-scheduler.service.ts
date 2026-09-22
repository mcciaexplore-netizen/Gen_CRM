import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import type { Queue } from "bullmq";
import {
  DAILY_TASK_MAINTENANCE_JOB,
  DAILY_TASK_SCHEDULER_ID,
  TASK_MAINTENANCE_QUEUE,
} from "./tasks.constants";

@Injectable()
export class TaskSchedulerService implements OnApplicationBootstrap {
  constructor(
    @InjectQueue(TASK_MAINTENANCE_QUEUE)
    private readonly maintenanceQueue: Queue,
  ) {}

  async onApplicationBootstrap() {
    await this.maintenanceQueue.upsertJobScheduler(
      DAILY_TASK_SCHEDULER_ID,
      { pattern: "0 5 0 * * *", tz: "Asia/Kolkata" },
      {
        name: DAILY_TASK_MAINTENANCE_JOB,
        data: {},
        opts: {
          attempts: 3,
          backoff: { type: "exponential", delay: 60_000 },
          removeOnComplete: { age: 30 * 24 * 60 * 60, count: 100 },
          removeOnFail: { age: 90 * 24 * 60 * 60, count: 500 },
        },
      },
    );
  }
}
