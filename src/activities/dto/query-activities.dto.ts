import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ActivityAction } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryActivitiesDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: ActivityAction,
    description: 'Filter by a specific action type',
  })
  @IsOptional()
  @IsEnum(ActivityAction)
  action?: ActivityAction;

  @ApiPropertyOptional({ description: 'Filter by actor (user) ID' })
  @IsOptional()
  @IsString()
  actorId?: string;
}
