import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AssignComplaintDto {
  @ApiProperty({
    example: 'clx7abc123def456',
    description: 'User ID of the agent to assign this complaint to',
  })
  @IsString()
  @IsNotEmpty()
  agentId: string;
}
