import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEmail, IsInt, IsOptional } from 'class-validator';

export class CreateContactDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'I need help with my order' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ example: 'jyotish', default: 'website' })
  @IsString()
  @IsOptional()
  platform?: string;
}

export class MarkReadDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  id: number;
}

export class ReplyContactDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  contactMessageId: number;

  @ApiProperty({ example: 'admin' })
  @IsString()
  @IsNotEmpty()
  sender: string;

  @ApiProperty({ example: 'Thank you for reaching out...' })
  @IsString()
  @IsNotEmpty()
  message: string;
}
