import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateSentMessageDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({ example: `Instacia-01` })
  @IsString()
  @IsNotEmpty()
  isntance: string;

  @ApiProperty({ example: `1900-01-01` })
  @IsDateString()
  @IsNotEmpty()
  sentDate: Date;

  @ApiProperty({ example: `Feliz aniversário Jhon Doe` })
  @IsString()
  @IsNotEmpty()
  message: string;
}
