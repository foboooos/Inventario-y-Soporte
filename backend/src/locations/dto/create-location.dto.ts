import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre!: string;
}
