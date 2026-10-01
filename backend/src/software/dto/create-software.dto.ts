import { ArrayUnique, IsArray, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { SoftwareLicense } from '../software-license.enum.js';

export class CreateSoftwareDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nombre!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  version!: string;

  @IsEnum(SoftwareLicense)
  licencia!: SoftwareLicense;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  asignatura_ids?: number[];
}
