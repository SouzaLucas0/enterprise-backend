import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MessageVariablesModule } from '../../features/message-variables/message-variables.module';
import { ParamsModule } from '../../features/params/params.module';
import { WhatsappInstance } from './entities/whatsapp-instance.entity';
import { WhatsappInstanceService } from './whatsapp-instance.service';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappService } from './whatsapp.service';

@Global()
@Module({
  imports: [
    ParamsModule,
    TypeOrmModule.forFeature([WhatsappInstance]),
    MessageVariablesModule
  ],
  controllers: [WhatsappController],
  providers: [WhatsappService, WhatsappInstanceService],
  exports: [WhatsappService, WhatsappInstanceService]
})
export class WhatsappModule {

}
