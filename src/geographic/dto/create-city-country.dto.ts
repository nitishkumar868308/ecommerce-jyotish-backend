import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsInt, IsOptional, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCityCountryDto {
  @ApiProperty() @IsString() name: string;
  @ApiProperty() @IsInt() state_id: number;
  @ApiProperty() @IsString() state_code: string;
  @ApiProperty() @IsString() state_name: string;
  @ApiProperty() @IsInt() country_id: number;
  @ApiProperty() @IsString() country_code: string;
  @ApiProperty() @IsString() country_name: string;
  @ApiProperty() @IsString() latitude: string;
  @ApiProperty() @IsString() longitude: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() active?: boolean;
}
