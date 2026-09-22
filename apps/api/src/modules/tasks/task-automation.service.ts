import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { RelatedEntityType, TaskSource, TaskStatus } from "@prisma/client";
import type { Queue } from "bullmq";
import { PrismaService } from "../../prisma/prisma.service";
import { InvoiceAutomationService } from "../billing/invoice-automation.service";
import {
  SEND_WHATSAPP_REMINDER_JOB,
  STALE_DEAL_DAYS,
  WHATSAPP_REMINDER_QUEUE,
} from "./tasks.constants";
import { TasksService } from "./tasks.service";

@Injectable()
export class TaskAutomationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tasks: TasksService,
    private readonly invoices: InvoiceAutomationService,
    @InjectQueue(WHATSAPP_REMINDER_QUEUE)
    private readonly remindersQueue: Queue,
  ) {}

  async runDaily(now = new Date()) {
    const businesses = await this.prisma.business.findMany({
      where: { deletedAt: null },
      select: { id: true },
      orderBy: { id: "asc" },
    });
    let staleTasksCreated = 0;
    let tasksMarkedOverdue = 0;
    let remindersQueued = 0;
    let invoicesMarkedOverdue = 0;
    let paymentReminderTasksCreated = 0;

    for (const business of businesses) {
      staleTasksCreated += await this.createStaleDealTasks(business.id, now);
      const invoiceResult = await this.invoices.syncOverdue(business.id, now);
      invoicesMarkedOverdue += invoiceResult.invoicesMarkedOverdue;
      paymentReminderTasksCreated += invoiceResult.reminderTasksCreated;
      const overdue = await this.tasks.markOverdue(business.id, now);
      tasksMarkedOverdue += overdue.count;
      remindersQueued += await this.queueOverdueReminders(business.id);
    }

    return {
      businessesProcessed: businesses.length,
      staleTasksCreated,
      invoicesMarkedOverdue,
      paymentReminderTasksCreated,
      tasksMarkedOverdue,
      remindersQueued,
    };
  }

  private async createStaleDealTasks(businessId: string, now: Date) {
    const staleBefore = new Date(
      now.getTime() - STALE_DEAL_DAYS * 24 * 60 * 60 * 1000,
    );
    const deals = await this.prisma.deal.findMany({
      where: {
        businessId,
        deletedAt: null,
        stageChangedAt: { lte: staleBefore },
        stage: {
          is: { isWon: false, isLost: false, deletedAt: null },
        },
      },
      select: {
        id: true,
        title: true,
        assignedToId: true,
        stageChangedAt: true,
        stage: { select: { name: true } },
      },
    });
    if (!deals.length) return 0;

    const previousTasks = await this.prisma.task.findMany({
      where: {
        businessId,
        deletedAt: null,
        source: TaskSource.STALE_DEAL_STAGE,
        relatedEntityType: RelatedEntityType.DEAL,
        relatedEntityId: { in: deals.map((deal) => deal.id) },
      },
      select: { relatedEntityId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    const latestTaskByDeal = new Map<string, Date>();
    for (const task of previousTasks) {
      if (!latestTaskByDeal.has(task.relatedEntityId)) {
        latestTaskByDeal.set(task.relatedEntityId, task.createdAt);
      }
    }
    const missing = deals.filter((deal) => {
      const latestTask = latestTaskByDeal.get(deal.id);
      return !latestTask || latestTask < deal.stageChangedAt;
    });
    if (!missing.length) return 0;

    const result = await this.prisma.task.createMany({
      data: missing.map((deal) => ({
        businessId,
        title: "Follow up: " + deal.title + " (" + deal.stage.name + ")",
        dueAt: now,
        assignedToId: deal.assignedToId,
        relatedEntityType: RelatedEntityType.DEAL,
        relatedEntityId: deal.id,
        source: TaskSource.STALE_DEAL_STAGE,
      })),
    });
    return result.count;
  }

  private async queueOverdueReminders(businessId: string) {
    const overdueTasks = await this.prisma.task.findMany({
      where: {
        businessId,
        deletedAt: null,
        status: TaskStatus.OVERDUE,
      },
      select: {
        id: true,
        title: true,
        dueAt: true,
        assignedTo: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { dueAt: "asc" },
    });
    if (!overdueTasks.length) return 0;

    await this.remindersQueue.addBulk(
      overdueTasks.map((task) => ({
        name: SEND_WHATSAPP_REMINDER_JOB,
        data: {
          businessId,
          taskId: task.id,
          taskTitle: task.title,
          dueAt: task.dueAt.toISOString(),
          assignedTo: task.assignedTo,
        },
        opts: {
          jobId: "overdue-task-" + task.id,
          attempts: 3,
          backoff: { type: "exponential", delay: 60_000 },
          removeOnComplete: { age: 90 * 24 * 60 * 60, count: 10_000 },
          removeOnFail: { age: 90 * 24 * 60 * 60, count: 5_000 },
        },
      })),
    );
    return overdueTasks.length;
  }
}
