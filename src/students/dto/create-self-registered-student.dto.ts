import { Transform } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { StudentGender } from '../../../generated/prisma/client';
import { IsNotFutureDate } from './is-not-future-date.validator';
import {
  normalizePhoneField,
  parseDateOnly,
  trimString,
} from './student-field.transforms';

export class CreateSelfRegisteredStudentDto {
  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(/\S/, { message: 'fullName não pode conter apenas espaços' })
  fullName!: string;

  @Transform(normalizePhoneField)
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'phone deve ser um telefone válido em formato E.164',
  })
  phone!: string;

  @Transform(parseDateOnly)
  @IsDate({
    message: 'birthDate deve ser uma data válida no formato YYYY-MM-DD',
  })
  @IsNotFutureDate()
  birthDate!: Date;

  @IsEnum(StudentGender)
  gender!: StudentGender;
}
