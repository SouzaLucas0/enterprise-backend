import { Module } from '@nestjs/common';
import { AppMetaModule } from '../../core/app-meta/app-meta.module';
import { NotificationsGateway } from './notifications.gateway';

@Module({
  imports: [AppMetaModule],
  providers: [NotificationsGateway],
  exports: [NotificationsGateway],
})
export class NotificationsModule {}