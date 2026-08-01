import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, TrainingRoutineStatus } from '../../generated/prisma/client';
import { AuthenticatedUser } from '../auth/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { ListRoutinesQueryDto } from './dto/list-routines-query.dto';
import { RoutinesService } from './routines.service';

describe('RoutinesService', () => {
  const user: AuthenticatedUser = {
    id: 'auth-user-id',
    email: 'personal@example.com',
  };
  const anotherUser: AuthenticatedUser = {
    id: 'another-auth-user-id',
    email: 'another@example.com',
  };
  const routine = {
    id: '49bce5e5-f0c4-4e63-882c-75ae74ba0b02',
    name: 'Hipertrofia — 4 dias',
    startDate: new Date('2026-08-03T00:00:00.000Z'),
    endDate: new Date('2026-09-03T00:00:00.000Z'),
    removeOnExpiration: true,
    instructions: 'Executar quatro vezes por semana.',
    status: TrainingRoutineStatus.draft,
    createdAt: new Date('2026-08-01T12:00:00.000Z'),
    updatedAt: new Date('2026-08-01T12:00:00.000Z'),
    deletedAt: null,
  };
  const routineView = {
    ...routine,
    startDate: '2026-08-03',
    endDate: '2026-09-03',
  };
  let prisma: {
    trainingRoutine: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let service: RoutinesService;

  beforeEach(() => {
    prisma = {
      trainingRoutine: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(async (operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
    };
    service = new RoutinesService(prisma as unknown as PrismaService);
  });

  it('cria rotina somente com nome usando os defaults do domínio', async () => {
    prisma.trainingRoutine.create.mockResolvedValue({
      ...routine,
      startDate: null,
      endDate: null,
      removeOnExpiration: false,
      instructions: null,
    });

    await expect(
      service.createForTrainer(user, { name: '  Rotina inicial  ' }),
    ).resolves.toEqual({
      ...routineView,
      name: routine.name,
      startDate: null,
      endDate: null,
      removeOnExpiration: false,
      instructions: null,
    });
    expect(prisma.trainingRoutine.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          trainer: { connect: { authUserId: user.id } },
          name: 'Rotina inicial',
          removeOnExpiration: false,
          status: TrainingRoutineStatus.draft,
        },
      }),
    );
  });

  it('cria rotina com todos os campos e serializa datas civis', async () => {
    prisma.trainingRoutine.create.mockResolvedValue(routine);

    await expect(
      service.createForTrainer(user, {
        name: routine.name,
        startDate: routine.startDate,
        endDate: routine.endDate,
        removeOnExpiration: true,
        instructions: `  ${routine.instructions}  `,
      }),
    ).resolves.toEqual(routineView);
    expect(prisma.trainingRoutine.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          startDate: routine.startDate,
          endDate: routine.endDate,
          removeOnExpiration: true,
          instructions: routine.instructions,
        }) as unknown,
      }),
    );
  });

  it('rejeita data final anterior à inicial', async () => {
    await expect(
      service.createForTrainer(user, {
        name: routine.name,
        startDate: routine.startDate,
        endDate: new Date('2026-08-02T00:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.trainingRoutine.create).not.toHaveBeenCalled();
  });

  it('exige endDate quando removeOnExpiration é true', async () => {
    await expect(
      service.createForTrainer(user, {
        name: routine.name,
        removeOnExpiration: true,
      }),
    ).rejects.toThrow('endDate é obrigatória quando removeOnExpiration é true');
  });

  it('traduz perfil inexistente ao criar', async () => {
    prisma.trainingRoutine.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('not found', {
        code: 'P2025',
        clientVersion: '7.8.0',
      }),
    );

    await expect(
      service.createForTrainer(user, { name: routine.name }),
    ).rejects.toThrow('Perfil do personal não encontrado');
  });

  it('lista com paginação, busca, status e escopo do personal', async () => {
    prisma.trainingRoutine.findMany.mockResolvedValue([routine]);
    prisma.trainingRoutine.count.mockResolvedValue(1);
    const query = Object.assign(new ListRoutinesQueryDto(), {
      page: 2,
      limit: 5,
      search: 'hipertrofia',
      status: TrainingRoutineStatus.draft,
    });

    await expect(service.listForTrainer(user, query)).resolves.toEqual({
      data: [routineView],
      meta: { page: 2, pageSize: 5, total: 1, totalPages: 1 },
    });
    expect(prisma.trainingRoutine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          trainer: { authUserId: user.id },
          status: TrainingRoutineStatus.draft,
          OR: [
            {
              name: { contains: 'hipertrofia', mode: 'insensitive' },
            },
            {
              instructions: {
                contains: 'hipertrofia',
                mode: 'insensitive',
              },
            },
          ],
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: 5,
        take: 5,
      }),
    );
  });

  it('consulta rotina somente no escopo do personal autenticado', async () => {
    prisma.trainingRoutine.findFirst.mockResolvedValue(routine);

    await expect(service.getForTrainer(user, routine.id)).resolves.toEqual(
      routineView,
    );
    expect(prisma.trainingRoutine.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: routine.id,
          deletedAt: null,
          trainer: { authUserId: user.id },
        },
      }),
    );
  });

  it('retorna 404 para rotina inexistente ou de outro personal', async () => {
    prisma.trainingRoutine.findFirst.mockResolvedValue(null);

    await expect(
      service.getForTrainer(anotherUser, routine.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('atualiza parcialmente considerando o período salvo', async () => {
    const updated = {
      ...routine,
      endDate: new Date('2026-10-03T00:00:00.000Z'),
      status: TrainingRoutineStatus.active,
    };
    prisma.trainingRoutine.findFirst
      .mockResolvedValueOnce(routine)
      .mockResolvedValueOnce(updated);
    prisma.trainingRoutine.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.updateForTrainer(user, routine.id, {
        endDate: updated.endDate,
        status: TrainingRoutineStatus.active,
      }),
    ).resolves.toEqual({
      ...routineView,
      endDate: '2026-10-03',
      status: TrainingRoutineStatus.active,
    });
    expect(prisma.trainingRoutine.updateMany).toHaveBeenCalledWith({
      where: {
        id: routine.id,
        deletedAt: null,
        trainer: { authUserId: user.id },
      },
      data: {
        endDate: updated.endDate,
        status: TrainingRoutineStatus.active,
      },
    });
  });

  it('rejeita atualização isolada de endDate anterior à startDate salva', async () => {
    prisma.trainingRoutine.findFirst.mockResolvedValue(routine);

    await expect(
      service.updateForTrainer(user, routine.id, {
        endDate: new Date('2026-08-02T00:00:00.000Z'),
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.trainingRoutine.updateMany).not.toHaveBeenCalled();
  });

  it('rejeita remover endDate mantendo removeOnExpiration ativo', async () => {
    prisma.trainingRoutine.findFirst.mockResolvedValue(routine);

    await expect(
      service.updateForTrainer(user, routine.id, { endDate: null }),
    ).rejects.toThrow('endDate é obrigatória quando removeOnExpiration é true');
    expect(prisma.trainingRoutine.updateMany).not.toHaveBeenCalled();
  });

  it('permite limpar datas e instruções quando remoção automática é desativada', async () => {
    const updated = {
      ...routine,
      startDate: null,
      endDate: null,
      instructions: null,
      removeOnExpiration: false,
    };
    prisma.trainingRoutine.findFirst
      .mockResolvedValueOnce(routine)
      .mockResolvedValueOnce(updated);
    prisma.trainingRoutine.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.updateForTrainer(user, routine.id, {
        startDate: null,
        endDate: null,
        instructions: null,
        removeOnExpiration: false,
      }),
    ).resolves.toEqual({
      ...routineView,
      startDate: null,
      endDate: null,
      instructions: null,
      removeOnExpiration: false,
    });
  });

  it('faz exclusão lógica no escopo do personal', async () => {
    prisma.trainingRoutine.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      service.deleteForTrainer(user, routine.id),
    ).resolves.toBeUndefined();
    expect(prisma.trainingRoutine.updateMany).toHaveBeenCalledWith({
      where: {
        id: routine.id,
        deletedAt: null,
        trainer: { authUserId: user.id },
      },
      data: { deletedAt: expect.any(Date) as unknown },
    });
  });

  it('trata como sucesso excluir novamente a rotina do mesmo personal', async () => {
    prisma.trainingRoutine.updateMany.mockResolvedValue({ count: 0 });
    prisma.trainingRoutine.findFirst.mockResolvedValue({ id: routine.id });

    await expect(
      service.deleteForTrainer(user, routine.id),
    ).resolves.toBeUndefined();
  });

  it('não exclui rotina de outro personal', async () => {
    prisma.trainingRoutine.updateMany.mockResolvedValue({ count: 0 });
    prisma.trainingRoutine.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteForTrainer(anotherUser, routine.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
