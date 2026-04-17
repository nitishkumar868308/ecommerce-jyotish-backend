import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateVideoStoryDto {
  @ApiProperty() @IsString() title: string;
  @ApiProperty() @IsString() url: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}
