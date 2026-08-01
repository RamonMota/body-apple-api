import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TrainingRoutineStatus } from '../../generated/prisma/client';
import { AuthenticatedUser } from '../auth/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { ListRoutinesQueryDto } from './dto/list-routines-query.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';
import {
  PaginatedTrainingRoutines,
  TrainingRoutineView,
} from './routine.types';

const routineSelect = {
  id: true,
  name: true,
  startDate: true,
  endDate: true,
  removeOnExpiration: true,
  instructions: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.TrainingRoutineSelect;

type SelectedRoutine = Prisma.TrainingRoutineGetPayload<{
  select: typeof routineSelect;
}>;

@Injectable()
export class RoutinesService {
  constructor(private readonly prisma: PrismaService) {}

  async createForTrainer(
    user: AuthenticatedUser,
    dto: CreateRoutineDto,
  ): Promise<TrainingRoutineView> {
    const removeOnExpiration = dto.removeOnExpiration ?? false;
    this.validatePeriod(
      dto.startDate ?? null,
      dto.endDate ?? null,
      removeOnExpiration,
    );

    try {
      const routine = await this.prisma.trainingRoutine.create({
        data: {
          trainer: { connect: { authUserId: user.id } },
          name: dto.name.trim(),
          ...(dto.startDate !== undefined && { startDate: dto.startDate }),
          ...(dto.endDate !== undefined && { endDate: dto.endDate }),
          removeOnExpiration,
          ...(dto.instructions !== undefined && {
            instructions: dto.instructions.trim(),
          }),
          status: TrainingRoutineStatus.draft,
        },
        select: routineSelect,
      });

      return this.toView(routine);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Perfil do personal não encontrado');
      }

      throw error;
    }
  }

  async listForTrainer(
    user: AuthenticatedUser,
    query: ListRoutinesQueryDto,
  ): Promise<PaginatedTrainingRoutines> {
    const search = query.search?.trim();
    const where: Prisma.TrainingRoutineWhereInput = {
      deletedAt: null,
      trainer: { authUserId: user.id },
      ...(query.status !== undefined && { status: query.status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { instructions: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    const skip = (query.page - 1) * query.limit;
    const [routines, total] = await this.prisma.$transaction([
      this.prisma.trainingRoutine.findMany({
        where,
        select: routineSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip,
        take: query.limit,
      }),
      this.prisma.trainingRoutine.count({ where }),
    ]);

    return {
      data: routines.map((routine) => this.toView(routine)),
      meta: {
        page: query.page,
        pageSize: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async getForTrainer(
    user: AuthenticatedUser,
    routineId: string,
  ): Promise<TrainingRoutineView> {
    const routine = await this.findActiveRoutine(user, routineId);

    if (!routine) {
      throw this.routineNotFound();
    }

    return this.toView(routine);
  }

  async updateForTrainer(
    user: AuthenticatedUser,
    routineId: string,
    dto: UpdateRoutineDto,
  ): Promise<TrainingRoutineView> {
    const existing = await this.findActiveRoutine(user, routineId);

    if (!existing) {
      throw this.routineNotFound();
    }

    const startDate =
      dto.startDate !== undefined ? dto.startDate : existing.startDate;
    const endDate = dto.endDate !== undefined ? dto.endDate : existing.endDate;
    const removeOnExpiration =
      dto.removeOnExpiration ?? existing.removeOnExpiration;
    this.validatePeriod(startDate, endDate, removeOnExpiration);

    const data: Prisma.TrainingRoutineUpdateManyMutationInput = {
      ...(dto.name !== undefined && { name: dto.name.trim() }),
      ...(dto.startDate !== undefined && { startDate: dto.startDate }),
      ...(dto.endDate !== undefined && { endDate: dto.endDate }),
      ...(dto.removeOnExpiration !== undefined && {
        removeOnExpiration: dto.removeOnExpiration,
      }),
      ...(dto.instructions !== undefined && {
        instructions: dto.instructions?.trim() ?? null,
      }),
      ...(dto.status !== undefined && { status: dto.status }),
    };

    const result = await this.prisma.trainingRoutine.updateMany({
      where: {
        id: routineId,
        deletedAt: null,
        trainer: { authUserId: user.id },
      },
      data,
    });

    if (result.count === 0) {
      throw this.routineNotFound();
    }

    return this.getForTrainer(user, routineId);
  }

  async deleteForTrainer(
    user: AuthenticatedUser,
    routineId: string,
  ): Promise<void> {
    const result = await this.prisma.trainingRoutine.updateMany({
      where: {
        id: routineId,
        deletedAt: null,
        trainer: { authUserId: user.id },
      },
      data: { deletedAt: new Date() },
    });

    if (result.count > 0) {
      return;
    }

    const existing = await this.prisma.trainingRoutine.findFirst({
      where: {
        id: routineId,
        trainer: { authUserId: user.id },
      },
      select: { id: true },
    });

    if (!existing) {
      throw this.routineNotFound();
    }
  }

  private findActiveRoutine(
    user: AuthenticatedUser,
    routineId: string,
  ): Promise<SelectedRoutine | null> {
    return this.prisma.trainingRoutine.findFirst({
      where: {
        id: routineId,
        deletedAt: null,
        trainer: { authUserId: user.id },
      },
      select: routineSelect,
    });
  }

  private validatePeriod(
    startDate: Date | null,
    endDate: Date | null,
    removeOnExpiration: boolean,
  ): void {
    if (startDate && endDate && endDate.getTime() < startDate.getTime()) {
      throw new BadRequestException(
        'endDate não pode ser anterior a startDate',
      );
    }

    if (removeOnExpiration && !endDate) {
      throw new BadRequestException(
        'endDate é obrigatória quando removeOnExpiration é true',
      );
    }
  }

  private toView(routine: SelectedRoutine): TrainingRoutineView {
    return {
      ...routine,
      startDate: this.toDateOnly(routine.startDate),
      endDate: this.toDateOnly(routine.endDate),
    };
  }

  private toDateOnly(date: Date | null): string | null {
    return date?.toISOString().slice(0, 10) ?? null;
  }

  private routineNotFound(): NotFoundException {
    return new NotFoundException('Rotina não encontrada');
  }
}
