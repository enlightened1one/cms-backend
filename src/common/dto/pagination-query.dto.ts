import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Page number (1-based)', default: 1, minimum: 1 })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== '' ? parseInt(value, 10) : 1))
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ description: 'Records per page', default: 10, maximum: 100 })
  @IsOptional()
  @Transform(({ value }) => (value !== undefined && value !== '' ? parseInt(value, 10) : 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;
}