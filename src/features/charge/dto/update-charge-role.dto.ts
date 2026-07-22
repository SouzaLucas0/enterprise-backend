import { ApiProperty, PartialType } from "@nestjs/swagger";
import { CreateChargeRoleDto } from "./create-charge-role.dto";
import { IsNumber, IsOptional } from "class-validator";

export class UpdateChargeRoleDto extends PartialType(CreateChargeRoleDto){
    @ApiProperty({ example: 1 })
    @IsNumber()
    @IsOptional()
    messageId?: number
}