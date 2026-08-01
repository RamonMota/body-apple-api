import { IsString, Matches } from 'class-validator';

export class StudentRegistrationTokenParamDto {
  @IsString()
  @Matches(/^[A-Za-z0-9_-]{43}$/, {
    message: 'token de cadastro inválido',
  })
  token!: string;
}
