import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ResolveTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  causa_raiz!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  solucion_aplicada!: string;
}
