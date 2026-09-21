import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateTicketDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  id_dispositivo?: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  ubicacion!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  sintoma!: string;
}
