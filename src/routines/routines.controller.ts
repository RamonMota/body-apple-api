import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { AuthenticatedUser } from '../auth/authenticated-user.type';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { ListRoutinesQueryDto } from './dto/list-routines-query.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';
import {
  PaginatedTrainingRoutines,
  TrainingRoutineView,
} from './routine.types';
import { RoutinesService } from './routines.service';

@Controller('routines')
@UseGuards(AuthGuard)
export class RoutinesController {
  constructor(private readonly routinesService: RoutinesService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRoutineDto,
  ): Promise<TrainingRoutineView> {
    return this.routinesService.createForTrainer(user, dto);
  }

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListRoutinesQueryDto,
  ): Promise<PaginatedTrainingRoutines> {
    return this.routinesService.listForTrainer(user, query);
  }

  @Get(':routineId')
  getById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('routineId', new ParseUUIDPipe({ version: '4' })) routineId: string,
  ): Promise<TrainingRoutineView> {
    return this.routinesService.getForTrainer(user, routineId);
  }

  @Patch(':routineId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('routineId', new ParseUUIDPipe({ version: '4' })) routineId: string,
    @Body() dto: UpdateRoutineDto,
  ): Promise<TrainingRoutineView> {
    return this.routinesService.updateForTrainer(user, routineId, dto);
  }

  @Delete(':routineId')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('routineId', new ParseUUIDPipe({ version: '4' })) routineId: string,
  ): Promise<void> {
    return this.routinesService.deleteForTrainer(user, routineId);
  }
}
