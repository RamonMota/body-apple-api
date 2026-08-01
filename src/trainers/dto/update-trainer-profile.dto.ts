import { Transform, TransformFnParams } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

function trimString({ value }: TransformFnParams): unknown {
  return typeof value === 'string' ? value.trim() : (value as unknown);
}

export class UpdateTrainerProfileDto {
  @Transform(trimString)
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Matches(/\S/, { message: 'name não pode conter apenas espaços' })
  name!: string;
}
