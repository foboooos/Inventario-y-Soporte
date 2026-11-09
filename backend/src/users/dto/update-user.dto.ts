import { IsDateString, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { UserRole } from '../user-role.enum.js';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  fecha_nacimiento?: string;

  @IsOptional()
  @IsEnum(UserRole)
  rol?: UserRole;
}
