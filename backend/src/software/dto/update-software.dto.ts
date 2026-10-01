import { ArrayUnique, IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { SoftwareLicense } from '../software-license.enum.js';

export class UpdateSoftwareDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  version?: string;

  @IsOptional()
  @IsEnum(SoftwareLicense)
  licencia?: SoftwareLicense;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  asignatura_ids?: number[];
}
