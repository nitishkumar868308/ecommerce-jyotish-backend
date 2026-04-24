import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class StartChatSessionDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  userId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  astrologerId: number;

  @ApiPropertyOptional({ example: 'chat', enum: ['chat', 'call'] })
  @IsOptional()
  @IsIn(['chat', 'call'])
  type?: 'chat' | 'call';

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  serviceId?: number;
}

export class RequestChatDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  userId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  astrologerId: number;

  @ApiPropertyOptional({ example: 1 })
  @IsInt()
  @IsOptional()
  serviceId?: number;
}

export class AcceptChatDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  sessionId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  astrologerId: number;
}

export class RejectChatDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  sessionId: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  astrologerId: number;

  @ApiPropertyOptional({
    example: 'Busy with another consultation',
    description:
      'Shown to the user and stored on the session for admin review.',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class EndChatDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  sessionId: number;
}

export class ResumeChatDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  sessionId: number;
}

export class SendMessageDto {
  @ApiProperty({ example: 'USER', enum: ['USER', 'ASTROLOGER'] })
  @IsIn(['USER', 'ASTROLOGER'])
  senderType: 'USER' | 'ASTROLOGER';

  @ApiProperty({ example: 1 })
  @IsInt()
  senderId: number;

  @ApiProperty({ example: 'Namaste, how can I help?' })
  @IsString()
  text: string;
}
