import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { DeviceType } from '../device-type.enum.js';

export class NextDeviceCodeDto {
  @IsEnum(DeviceType)
  tipo!: DeviceType;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  ubicacion!: string;
}
