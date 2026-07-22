import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { MessageSeed } from '../../core/seeds/messages.seed'
import { Message } from './entities/message.entity'
import { MessagesController } from './messages.controller'
import { MessagesService } from './messages.service'

@Module({
	imports: [TypeOrmModule.forFeature([Message])],
	controllers: [MessagesController],
	providers: [MessagesService, MessageSeed],
	exports: [MessagesService],
})
export class MessagesModule {}
