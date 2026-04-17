import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsInt, IsOptional } from 'class-validator';

export class UserDonateDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  userName: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  amount: number;

  @ApiProperty({ example: 1 })
  @IsInt()
  donationCampaignId: number;

  @ApiPropertyOptional({ example: 101 })
  @IsOptional()
  @IsInt()
  orderId?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  userId?: number;
}
