import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class UploadFileDto {
  @ApiPropertyOptional({ example: 'profile-photos' })
  @IsString()
  @IsOptional()
  folder?: string;
}
