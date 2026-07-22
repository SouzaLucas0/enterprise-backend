import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MessageVariable } from '../../features/message-variables/entities/message-variable.entity';
import { Message } from '../../features/messages/entities/message.entity';
import { AppMetaModule } from '../app-meta/app-meta.module';
import { AllConfigSeed } from './all-config.seed';
import { MessageVariablesSeed } from './message-variables.seed';
import { MessageSeed } from './messages.seed';
import { SeedService } from './seed.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, MessageVariable]),
    AppMetaModule,
  ],
  providers: [
    SeedService,
    AllConfigSeed,
    MessageSeed,
    MessageVariablesSeed,
    Message,
  ],
  exports: [SeedService],
})
export class SeedModule {}
