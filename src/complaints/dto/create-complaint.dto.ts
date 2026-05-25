import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { ComplaintCategory, ComplaintPriority } from '@prisma/client';

export class CreateComplaintDto {
  @ApiProperty({
    example: 'ORD-9921',
    description: 'The order reference this complaint relates to',
  })
  @IsString()
  @IsNotEmpty()
  orderRef: string;

  @ApiProperty({ example: 'Chioma Obi' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  customerName: string;

  @ApiProperty({ example: 'chioma@gmail.com' })
  @IsEmail()
  customerEmail: string;

  @ApiPropertyOptional({ example: '08012345678' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiProperty({
    enum: ComplaintCategory,
    example: ComplaintCategory.WRONG_ITEM_DELIVERED,
  })
  @IsEnum(ComplaintCategory)
  category: ComplaintCategory;

  @ApiProperty({ example: 'I received a blue shirt instead of the black one I ordered.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['https://cdn.example.com/photo1.jpg'],
    description: 'Up to 5 photo URLs (uploaded separately)',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: 'Maximum 5 photos allowed per complaint' })
  @IsUrl({}, { each: true, message: 'Each photo must be a valid URL' })
  photos?: string[];

  @ApiPropertyOptional({
    enum: ComplaintPriority,
    default: ComplaintPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(ComplaintPriority)
  priority?: ComplaintPriority;
}
