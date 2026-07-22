import { PartialType } from '@nestjs/swagger';
import { CreateMessageVariableDto } from './create-message-variable.dto';

export class UpdateMessageVariableDto extends PartialType(CreateMessageVariableDto) {}
