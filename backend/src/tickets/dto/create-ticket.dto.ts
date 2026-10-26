import { IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class CreateTicketDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  id_dispositivo?: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'La ubicación no puede estar vacía' })
  @MaxLength(100)
  ubicacion!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'El síntoma no puede estar vacío' })
  @MaxLength(2000)
  sintoma!: string;
}
