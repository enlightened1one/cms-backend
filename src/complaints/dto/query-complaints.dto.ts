import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ComplaintCategory, ComplaintPriority, ComplaintStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryComplaintsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Search by complaint ref, order ref, customer name, or email',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ComplaintStatus })
  @IsOptional()
  @IsEnum(ComplaintStatus)
  status?: ComplaintStatus;

  @ApiPropertyOptional({ enum: ComplaintCategory })
  @IsOptional()
  @IsEnum(ComplaintCategory)
  category?: ComplaintCategory;

  @ApiPropertyOptional({ enum: ComplaintPriority })
  @IsOptional()
  @IsEnum(ComplaintPriority)
  priority?: ComplaintPriority;

  @ApiPropertyOptional({ description: 'Filter by assigned agent ID' })
  @IsOptional()
  @IsString()
  assignedToId?: string;

  @ApiPropertyOptional({ description: 'Filter by order reference, e.g. ORD-9921' })
  @IsOptional()
  @IsString()
  orderRef?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['createdAt', 'updatedAt', 'priority', 'status'],
    default: 'createdAt',
  })
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
