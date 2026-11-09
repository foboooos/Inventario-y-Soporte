import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsUUID()
  usuario!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password!: string;

  @IsOptional()
  @IsBoolean()
  remember?: boolean;
}
