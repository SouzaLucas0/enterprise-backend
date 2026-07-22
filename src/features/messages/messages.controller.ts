import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Logger, 
  BadRequestException, 
  NotFoundException
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';

@Controller('messages')
export class MessagesController {
  private readonly logger = new Logger(MessagesController.name);

  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  create(@Body() createMessageDto: CreateMessageDto) {
    return this.messagesService.create(createMessageDto);
  }

  @Get()
  findAll() {
    return this.messagesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: number) {
    const message = this.messagesService.findOne(id)

    if (!message) {
      throw new NotFoundException(`Mensagem com ID ${id} não encontrada.`)
    }

    return message
  }

  @Patch(':id')
  update(
    @Param('id') id: number, 
    @Body() updateMessageDto: UpdateMessageDto
  ) {
    return this.messagesService.update(id, updateMessageDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    const numericId = Number(id);

    if (isNaN(numericId)) {
      this.logger.error(`ID inválido ao remover: "${id}"`);
      throw new BadRequestException('O ID deve ser um número válido.');
    }

    return this.messagesService.remove(numericId);
  }
}
