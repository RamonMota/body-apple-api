import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/authenticated-user.type';
import { CreateTrainerProfileDto } from './dto/create-trainer-profile.dto';
import { UpdateTrainerProfileDto } from './dto/update-trainer-profile.dto';
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

  @Get('me')
  getCurrentProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<TrainerProfile> {
    return this.trainersService.getProfile(user);
  }
}
