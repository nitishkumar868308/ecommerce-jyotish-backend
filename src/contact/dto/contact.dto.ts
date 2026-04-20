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

  @ApiPropertyOptional({ example: 'Order question' })
  @IsString()
  @IsOptional()
  subject?: string;

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
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  contactMessageId?: number;

  @ApiPropertyOptional({ example: 'admin', default: 'admin' })
  @IsOptional()
  @IsString()
  sender?: string;

  @ApiPropertyOptional({ example: 'Re: Order question' })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional({
    example: 'Thank you for reaching out...',
    description: 'Reply body. Either `body` or `message` is accepted.',
  })
  @IsOptional()
  @IsString()
  body?: string;

  @ApiPropertyOptional({ example: 'Thank you for reaching out...' })
  @IsOptional()
  @IsString()
  message?: string;
}
