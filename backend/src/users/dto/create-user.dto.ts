import { IsEmail, IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { UserRole } from '../user-role.enum.js';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(12)
  rut!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre!: string;

  @IsEmail()
  @MaxLength(150)
  email!: string;

  @IsEnum(UserRole)
  rol!: UserRole;
}
