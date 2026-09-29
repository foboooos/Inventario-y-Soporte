import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateLevelDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre?: string;
}
