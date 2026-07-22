import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, ArrayNotEmpty } from 'class-validator';

export class CreateMessageVariableDto {
  @ApiProperty({  example: ['{{nomeCliente}}', '{{numeroPedido}}', '{{valorTotal}}'] })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  variables: string[];

  @ApiProperty({ example: 'bankSlip'})
  @IsString()
  function: string;
}
