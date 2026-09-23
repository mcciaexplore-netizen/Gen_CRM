import { Module } from "@nestjs/common";
import { ContactsModule } from "../contacts/contacts.module";
import { ChannelsModule } from "../channels/channels.module";
import { WhatsAppModule } from "../whatsapp/whatsapp.module";
import { ConversationsController } from "./conversations.controller";
import { ConversationsService } from "./conversations.service";
import { WhatsAppWebhookController } from "./whatsapp-webhook.controller";
import { WhatsAppWebhookService } from "./whatsapp-webhook.service";

@Module({
  imports: [ContactsModule, ChannelsModule, WhatsAppModule],
  controllers: [ConversationsController, WhatsAppWebhookController],
  providers: [ConversationsService, WhatsAppWebhookService],
})
export class ConversationsModule {}
