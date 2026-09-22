import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ContactsModule } from "../contacts/contacts.module";
import { ChannelsModule } from "../channels/channels.module";
import { WhatsAppModule } from "../whatsapp/whatsapp.module";
import { WHATSAPP_WEBHOOK_QUEUE } from "./conversations.constants";
import { ConversationsController } from "./conversations.controller";
import { ConversationsService } from "./conversations.service";
import { WhatsAppWebhookController } from "./whatsapp-webhook.controller";
import { WhatsAppWebhookProcessor } from "./whatsapp-webhook.processor";
import { WhatsAppWebhookService } from "./whatsapp-webhook.service";

@Module({
  imports: [
    ContactsModule,
    ChannelsModule,
    WhatsAppModule,
    BullModule.registerQueue({ name: WHATSAPP_WEBHOOK_QUEUE }),
  ],
  controllers: [ConversationsController, WhatsAppWebhookController],
  providers: [
    ConversationsService,
    WhatsAppWebhookService,
    WhatsAppWebhookProcessor,
  ],
})
export class ConversationsModule {}
