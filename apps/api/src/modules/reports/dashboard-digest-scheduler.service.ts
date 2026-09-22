import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import type { Queue } from "bullmq";
import { safeBusinessTimeZone } from "../../common/time/business-calendar";
import { PrismaService } from "../../prisma/prisma.service";
import {
  DAILY_DIGEST_PATTERN,
  OWNER_DIGEST_QUEUE,
  SEND_OWNER_DIGEST_JOB,
  SYNC_DIGEST_SCHEDULES_PATTERN,
  SYNC_OWNER_DIGEST_SCHEDULER_ID,
  SYNC_OWNER_DIGEST_SCHEDULES_JOB,
  WEEKLY_DIGEST_PATTERN,
} from "./reports.constants";

@Injectable()
export class DashboardDigestSchedulerService implements OnApplicationBootstrap {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(OWNER_DIGEST_QUEUE) private readonly queue: Queue,
  ) {}

  async onApplicationBootstrap() {
    await this.queue.upsertJobScheduler(
      SYNC_OWNER_DIGEST_SCHEDULER_ID,
      { pattern: SYNC_DIGEST_SCHEDULES_PATTERN },
      {
        name: SYNC_OWNER_DIGEST_SCHEDULES_JOB,
        data: {},
        opts: this.jobOptions(10),
      },
    );
    await this.syncSchedules();
  }

  async syncSchedules() {
    const businesses = await this.prisma.business.findMany({
      where: { deletedAt: null },
      select: { id: true, timezone: true },
      orderBy: { id: "asc" },
    });
    for (const business of businesses) {
      const timeZone = safeBusinessTimeZone(business.timezone);
      await Promise.all([
        this.queue.upsertJobScheduler(
          `owner-digest-daily-${business.id}`,
          { pattern: DAILY_DIGEST_PATTERN, tz: timeZone },
          {
            name: SEND_OWNER_DIGEST_JOB,
            data: { businessId: business.id, frequency: "daily" },
            opts: this.jobOptions(1_000),
          },
        ),
        this.queue.upsertJobScheduler(
          `owner-digest-weekly-${business.id}`,
          { pattern: WEEKLY_DIGEST_PATTERN, tz: timeZone },
          {
            name: SEND_OWNER_DIGEST_JOB,
            data: { businessId: business.id, frequency: "weekly" },
            opts: this.jobOptions(1_000),
          },
        ),
      ]);
    }
    return { businessesScheduled: businesses.length };
  }

  private jobOptions(count: number) {
    return {
      attempts: 3,
      backoff: { type: "exponential" as const, delay: 60_000 },
      removeOnComplete: { age: 90 * 24 * 60 * 60, count },
      removeOnFail: { age: 90 * 24 * 60 * 60, count },
    };
  }
}
