import { IsEnum, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { DeviceStatus } from '../../inventory/device-status.enum.js';

export class ResolveTicketDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'La causa raíz no puede estar vacía' })
  @MaxLength(2000)
  causa_raiz!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'La solución aplicada no puede estar vacía' })
  @MaxLength(2000)
  solucion_aplicada!: string;

  @IsEnum(DeviceStatus)
  estado_final!: DeviceStatus;
}
