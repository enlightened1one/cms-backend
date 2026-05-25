import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ComplaintStatus } from '@prisma/client';

export class UpdateStatusDto {
  @ApiProperty({
    enum: ComplaintStatus,
    example: ComplaintStatus.IN_PROGRESS,
    description: 'The new status for this complaint',
  })
  @IsEnum(ComplaintStatus)
  status: ComplaintStatus;

  @ApiPropertyOptional({
    example: 'A replacement has been dispatched and will arrive in 24 hours.',
    description: 'Agent note required when status is RESOLVED',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  resolutionNote?: string;
}
