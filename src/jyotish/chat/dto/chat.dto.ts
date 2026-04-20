import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

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
