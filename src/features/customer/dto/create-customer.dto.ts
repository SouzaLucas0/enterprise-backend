import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateCustomerDto {
      @ApiProperty({ example: '00001' })
      @IsString()
      @IsNotEmpty()
      id: string

      @ApiProperty({ example: "John Doe" })
      @IsString()
      @IsNotEmpty()
      name: string;
    
      @ApiProperty({ example: "556984191509" })
      @IsString()
      @IsNotEmpty()
      contact: string;
    
      @ApiProperty({ example: "1990-01-01", default: null, nullable: true })
      @IsDateString()
      @IsOptional()
      bithday: Date | null;
    
      @ApiProperty({ example: "1990-01-01" })
      @IsDateString()
      @IsNotEmpty()
      lastPurchaseDate: Date;
    
      @ApiProperty({ example: 100.50 })
      @IsNumber()
      @IsOptional()
      lastPurchaseValue?: number;

      @ApiProperty({ example: 'EcoCentauro' })
      @IsString()
      company: string

      @ApiProperty({ example: true })
      @IsOptional()
      firstMessageSent?: boolean
}
