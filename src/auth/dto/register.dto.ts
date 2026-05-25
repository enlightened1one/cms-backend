import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'Emeka', description: 'First name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Okafor', description: 'Last name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: 'emeka@fastlogistics.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    example: 'Secure@1234',
    description: 'Min 8 chars, must contain uppercase, lowercase, number, and special char',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message:
      'Password must contain at least one uppercase letter, lowercase letter, number, and special character',
  })
  password: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({
    enum: Role,
    example: Role.AGENT,
    description: 'User role within the tenant',
  })
  @IsEnum(Role)
  role: Role;

  @ApiProperty({
    example: 'clx7abc123def456',
    description: 'Tenant ID this user belongs to',
  })
  @IsString()
  @IsNotEmpty()
  tenantId: string;
}
