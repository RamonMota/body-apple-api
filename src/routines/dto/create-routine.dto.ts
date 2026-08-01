import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  parseRoutineDateOnly,
  trimRoutineString,
} from './routine-field.transforms';

export class CreateRoutineDto {
  @Transform(trimRoutineString)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(/\S/, { message: 'name não pode conter apenas espaços' })
  name!: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(parseRoutineDateOnly)
  @IsDate({
    message: 'startDate deve ser uma data válida no formato YYYY-MM-DD',
  })
  startDate?: Date;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(parseRoutineDateOnly)
  @IsDate({
    message: 'endDate deve ser uma data válida no formato YYYY-MM-DD',
  })
  endDate?: Date;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsBoolean()
  removeOnExpiration?: boolean;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Transform(trimRoutineString)
  @IsString()
  @MaxLength(2000)
  instructions?: string;
}
