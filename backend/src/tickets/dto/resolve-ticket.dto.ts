import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { DeviceStatus } from '../../inventory/device-status.enum.js';

export class ResolveTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  causa_raiz!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  solucion_aplicada!: string;

  @IsEnum(DeviceStatus)
  estado_final!: DeviceStatus;
}
