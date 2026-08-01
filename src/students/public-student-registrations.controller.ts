import { Body, Controller, Param, Post } from '@nestjs/common';
import { CreateSelfRegisteredStudentDto } from './dto/create-self-registered-student.dto';
import { StudentRegistrationTokenParamDto } from './dto/student-registration-token-param.dto';
import { StudentView } from './student.types';
import { StudentsService } from './students.service';

@Controller('public/student-registrations')
export class PublicStudentRegistrationsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post(':token')
  create(
    @Param() params: StudentRegistrationTokenParamDto,
    @Body() dto: CreateSelfRegisteredStudentDto,
  ): Promise<StudentView> {
    return this.studentsService.createFromRegistrationLink(params.token, dto);
  }
}
