import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({
    example: 'The replacement item has been dispatched via GIG Logistics.',
    description: 'Message body. Supports plain text.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description:
      'Set to true for internal agent notes. Internal messages are NOT visible to the customer or vendor.',
  })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean = false;
}
