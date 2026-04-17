import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, Max } from 'class-validator';

export class CreateBlogReviewDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  userId: number;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  userName: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  blogId: number;

  @ApiProperty({ example: 'Very informative!' })
  @IsString()
  comment: string;

  @ApiProperty({ example: 4, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;
}
