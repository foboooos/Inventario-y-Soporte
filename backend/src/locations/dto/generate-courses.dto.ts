import { IsInt, Min } from 'class-validator';

export class GenerateCoursesDto {
  @IsInt()
  @Min(1)
  padre_id!: number;
}
