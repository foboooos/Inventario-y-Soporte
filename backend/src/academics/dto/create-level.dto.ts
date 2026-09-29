import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateLevelDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre!: string;
}
