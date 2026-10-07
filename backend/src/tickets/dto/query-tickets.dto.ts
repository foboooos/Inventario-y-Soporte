import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export enum EstadoFiltro {
  EN_ESPERA = 'EN_ESPERA',
  EN_PROCESO = 'EN_PROCESO',
  OPERATIVO = 'OPERATIVO',
  INACTIVO = 'INACTIVO',
  BAJA_TECNICA = 'BAJA_TECNICA',
}

export class QueryTicketsDto {
  @IsOptional()
  @IsEnum(EstadoFiltro)
  estado?: EstadoFiltro;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  ubicacion?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  desde?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  hasta?: string;
}
