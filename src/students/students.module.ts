import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PublicStudentRegistrationsController } from './public-student-registrations.controller';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [AuthModule],
  controllers: [StudentsController, PublicStudentRegistrationsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
