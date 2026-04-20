import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({ example: 'New Arrival' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({
    example: 'new-arrival',
    description:
      'Optional override. Service auto-generates a unique slug from `name` when omitted.',
  })
  @IsString()
  @IsOptional()
  slug?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({ example: 'https://example.com/tag.jpg' })
  @IsString()
  @IsOptional()
  image?: string;
}
