import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.type';
import { CreateTrainerProfileDto } from './dto/create-trainer-profile.dto';
import { UpdateTrainerProfileDto } from './dto/update-trainer-profile.dto';
import { StudentRegistrationLink } from './student-registration-link.type';
import { TrainerProfile } from './trainer-profile.type';
import { TrainersService } from './trainers.service';

@Controller()
@UseGuards(AuthGuard)
export class TrainersController {
  constructor(private readonly trainersService: TrainersService) {}

  @Post('trainers/profile')
  createProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTrainerProfileDto,
  ): Promise<TrainerProfile> {
    return this.trainersService.createProfile(user, dto);
  }

  @Get('trainers/profile')
  getProfile(@CurrentUser() user: AuthenticatedUser): Promise<TrainerProfile> {
    return this.trainersService.getProfile(user);
  }

  @Patch('trainers/profile')
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateTrainerProfileDto,
  ): Promise<TrainerProfile> {
    return this.trainersService.updateProfile(user, dto);
  }

  @Get('trainers/student-registration-link')
  getStudentRegistrationLink(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StudentRegistrationLink> {
    return this.trainersService.getStudentRegistrationLink(user);
  }

  @Post('trainers/student-registration-link')
  createStudentRegistrationLink(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<StudentRegistrationLink> {
    return this.trainersService.createStudentRegistrationLink(user);
  }

  @Delete('trainers/student-registration-link')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteStudentRegistrationLink(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.trainersService.deleteStudentRegistrationLink(user);
  }

  @Get('me')
  getCurrentProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TrainerProfile> {
    return this.trainersService.getProfile(user);
  }
}
