import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class SendManualMessageDto {
    @ApiProperty({ example: `00001` })
    @IsString()
    @IsNotEmpty()
    chargeId: string
}