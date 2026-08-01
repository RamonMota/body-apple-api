import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { TrainingRoutineStatus } from '../../../generated/prisma/client';
import { trimRoutineString } from './routine-field.transforms';

export class ListRoutinesQueryDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(trimRoutineString)
  @IsString()
  @MaxLength(100)
  search?: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum(TrainingRoutineStatus)
  status?: TrainingRoutineStatus;
}
