import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class CreateSkuMappingDto {
  @ApiProperty() @IsString() channelSku: string;
  @ApiProperty() @IsString() ourSku: string;
}
