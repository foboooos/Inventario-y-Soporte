import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import { LOCATION_SIGLA_MESSAGE, LOCATION_SIGLA_PATTERN } from '../location-sigla.js';
import { LOCATION_TYPES, type LocationType } from '../location-type.js';

export class CreateLocationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre!: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  @Matches(LOCATION_SIGLA_PATTERN, { message: LOCATION_SIGLA_MESSAGE })
  sigla?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  padre_id?: number;

  @IsOptional()
  @IsIn([...LOCATION_TYPES])
  tipo?: LocationType;
}
