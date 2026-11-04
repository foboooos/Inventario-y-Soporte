import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { LOCATION_SIGLA_MESSAGE, LOCATION_SIGLA_PATTERN } from '../location-sigla.js';

export class UpdateLocationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  @Matches(LOCATION_SIGLA_PATTERN, { message: LOCATION_SIGLA_MESSAGE })
  sigla?: string;
}
