import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { GmailController } from "./gmail.controller";
import { GmailService } from "./gmail.service";
import { SmtpService } from "./smtp.service";

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>("JWT_ACCESS_SECRET"),
      }),
    }),
  ],
  controllers: [GmailController],
  providers: [GmailService, SmtpService],
  exports: [GmailService, SmtpService],
})
export class GmailModule {}
