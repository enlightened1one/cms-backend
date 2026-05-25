import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class QueryMessagesDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'When false (default for non-admins), filters out internal notes',
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  includeInternal?: boolean;
}
