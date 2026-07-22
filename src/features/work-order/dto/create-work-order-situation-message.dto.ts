import { ApiProperty } from "@nestjs/swagger"
import { IsBoolean, IsInt, IsString } from "class-validator"

export class CreateWorkOrderSituationMessageDto {
	@ApiProperty({ example: 'Olá, {{nomeCliente}}, seu veículo iniciou o serviço.' })
	@IsString()
	message: string

	@ApiProperty({ example: 1 })
	@IsInt()
	situationId: number
}
