import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsInt } from 'class-validator';

export class CreateBlogDto {
  @ApiProperty({ example: 'Top 10 Tips' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'top-10-tips' })
  @IsString()
  slug: string;

  @ApiProperty({ example: 'Admin' })
  @IsString()
  authorName: string;

  @ApiProperty({ example: 'Lifestyle' })
  @IsString()
  category: string;

  @ApiProperty({ example: '<p>Blog content here</p>' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ example: 'A short excerpt' })
  @IsOptional()
  @IsString()
  excerpt?: string;

  @ApiPropertyOptional({ example: 'https://img.example.com/blog.jpg' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ example: 'https://img.example.com/author.jpg' })
  @IsOptional()
  @IsString()
  authorImage?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  readTime?: number;
}
