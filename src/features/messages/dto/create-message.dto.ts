import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({ example: 'Feliz aniversário! 🎉' })
  @IsString()
  @IsNotEmpty()
  message: string;
}
