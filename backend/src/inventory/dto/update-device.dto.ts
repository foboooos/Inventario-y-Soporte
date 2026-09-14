import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { DeviceStatus } from '../device-status.enum.js';
import { DeviceType } from '../device-type.enum.js';

export class UpdateDeviceDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  codigo_inventario?: string;

  @IsOptional()
  @IsEnum(DeviceType)
  tipo?: DeviceType;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  marca?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  modelo?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  ubicacion?: string;

  @IsOptional()
  @IsEnum(DeviceStatus)
  estado?: DeviceStatus;
}
