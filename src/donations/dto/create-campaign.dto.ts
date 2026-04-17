import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsArray, IsNumber } from 'class-validator';

export class CreateCampaignDto {
  @ApiProperty({ example: 'Plant a Tree' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Help us plant trees across the country' })
  @IsString()
  description: string;

  @ApiProperty({ example: [10, 50, 100, 500] })
  @IsArray()
  @IsNumber({}, { each: true })
  amounts: number[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
