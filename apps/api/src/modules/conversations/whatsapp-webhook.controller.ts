import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectQueue } from "@nestjs/bullmq";
import { Public } from "../../common/decorators/public.decorator";
import type { Queue } from "bullmq";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  PROCESS_360DIALOG_WEBHOOK_JOB,
  WHATSAPP_WEBHOOK_QUEUE,
} from "./conversations.constants";

@Controller("webhooks/360dialog")
export class WhatsAppWebhookController {
  constructor(
    private readonly config: ConfigService,
    @InjectQueue(WHATSAPP_WEBHOOK_QUEUE)
    private readonly webhooksQueue: Queue,
  ) {}

  @Post()
  @Public()
  async receive(
    @Headers("authorization") authorization: string | undefined,
    @Body() payload: unknown,
  ) {
    this.authorize(authorization);
    if (!payload || typeof payload !== "object") {
      throw new BadRequestException("Webhook payload must be an object");
    }
    const serialized = JSON.stringify(payload);
    const digest = createHash("sha256").update(serialized).digest("hex");
    await this.webhooksQueue.add(
      PROCESS_360DIALOG_WEBHOOK_JOB,
      { payload },
      {
        jobId: "d360-" + digest,
        attempts: 5,
        backoff: { type: "exponential", delay: 5_000 },
        removeOnComplete: { age: 8 * 24 * 60 * 60, count: 20_000 },
        removeOnFail: { age: 30 * 24 * 60 * 60, count: 10_000 },
      },
    );
    return { received: true };
  }

  private authorize(value: string | undefined) {
    const token = this.config.get<string>("WHATSAPP_WEBHOOK_TOKEN", "");
    const expected = Buffer.from("Bearer " + token);
    const received = Buffer.from(value || "");
    if (
      token.length < 16 ||
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    ) {
      throw new UnauthorizedException("Invalid webhook authorization");
    }
  }
}
