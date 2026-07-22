import { forwardRef, Module } from '@nestjs/common';
import { AppMetaModule } from '../../core/app-meta/app-meta.module';
import { ChargeModule } from '../../features/charge/charge.module';
import { CustomerModule } from '../../features/customer/customer.module';
import { LogsModule } from '../../features/logs/logs.module';
import { MessagesModule } from '../../features/messages/messages.module';
import { FirebirdModule } from '../../integrations/firebird/firebird.module';
import { NotificationsModule } from '../../integrations/notifications/notifications.module';
import { WhatsappModule } from '../../integrations/whatsapp/whatsapp.module';
import { TasksChargeService } from './charge-task.service';


@Module({
  imports: [
    FirebirdModule,
    WhatsappModule,
    MessagesModule,
    CustomerModule,
    forwardRef(() => ChargeModule),
    LogsModule,
    NotificationsModule,
    AppMetaModule,
  ],
  providers: [TasksChargeService],
  exports: [TasksChargeService],
})
export class ChargeTaskModule {}
