import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({ example: 'Chidinma' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Nwosu' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: 'chidinma@fastlogistics.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Secure@1234' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  password: string;

  @ApiPropertyOptional({ example: '+2348098765432' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ enum: Role, example: Role.AGENT })
  @IsEnum(Role)
  role: Role;
}
