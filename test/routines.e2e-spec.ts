import {
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { TrainingRoutineStatus } from '../generated/prisma/client';
import { AuthGuard } from '../src/auth/auth.guard';
import { AuthenticatedUser } from '../src/auth/authenticated-user.type';
import { RoutinesController } from '../src/routines/routines.controller';
import { RoutinesService } from '../src/routines/routines.service';

describe('Routines (e2e)', () => {
  const user: AuthenticatedUser = {
    id: 'auth-user-id',
    email: 'personal@example.com',
  };
  const routineId = '49bce5e5-f0c4-4e63-882c-75ae74ba0b02';
  const accessToken = 'test-access-token';
  const routine = {
    id: routineId,
    name: 'Hipertrofia — 4 dias',
    startDate: '2026-08-03',
    endDate: '2026-09-03',
    removeOnExpiration: true,
    instructions: 'Executar quatro vezes por semana.',
    status: TrainingRoutineStatus.draft,
    createdAt: new Date('2026-08-01T12:00:00.000Z'),
    updatedAt: new Date('2026-08-01T12:00:00.000Z'),
    deletedAt: null,
  };
  let app: INestApplication<App>;
  let routinesService: {
    createForTrainer: jest.Mock;
    listForTrainer: jest.Mock;
    getForTrainer: jest.Mock;
    updateForTrainer: jest.Mock;
    deleteForTrainer: jest.Mock;
  };

  beforeEach(async () => {
    routinesService = {
      createForTrainer: jest.fn().mockResolvedValue(routine),
      listForTrainer: jest.fn().mockResolvedValue({
        data: [routine],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      }),
      getForTrainer: jest.fn().mockResolvedValue(routine),
      updateForTrainer: jest.fn().mockResolvedValue({
        ...routine,
        status: TrainingRoutineStatus.active,
      }),
      deleteForTrainer: jest.fn().mockResolvedValue(undefined),
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [RoutinesController],
      providers: [{ provide: RoutinesService, useValue: routinesService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => {
            getRequest: () => {
              headers: { authorization?: string };
              user?: AuthenticatedUser;
            };
          };
        }) => {
          const httpRequest = context.switchToHttp().getRequest();

          if (httpRequest.headers.authorization !== `Bearer ${accessToken}`) {
            throw new UnauthorizedException('Access token não informado');
          }

          httpRequest.user = user;
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('exige autenticação em rotas de rotinas', async () => {
    await request(app.getHttpServer()).get('/api/routines').expect(401);

    expect(routinesService.listForTrainer).not.toHaveBeenCalled();
  });

  it('POST /api/routines cria somente com nome e aplica transformações', async () => {
    await request(app.getHttpServer())
      .post('/api/routines')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '  Rotina inicial  ' })
      .expect(201);

    expect(routinesService.createForTrainer).toHaveBeenCalledWith(user, {
      name: 'Rotina inicial',
    });
  });

  it('POST /api/routines cria com todos os campos', async () => {
    await request(app.getHttpServer())
      .post('/api/routines')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: routine.name,
        startDate: routine.startDate,
        endDate: routine.endDate,
        removeOnExpiration: true,
        instructions: `  ${routine.instructions}  `,
      })
      .expect(201)
      .expect({
        ...routine,
        createdAt: routine.createdAt.toISOString(),
        updatedAt: routine.updatedAt.toISOString(),
      });

    expect(routinesService.createForTrainer).toHaveBeenCalledWith(user, {
      name: routine.name,
      startDate: new Date('2026-08-03T00:00:00.000Z'),
      endDate: new Date('2026-09-03T00:00:00.000Z'),
      removeOnExpiration: true,
      instructions: routine.instructions,
    });
  });

  it.each([
    ['data inexistente', { name: 'Rotina', startDate: '2026-02-30' }],
    ['data fora do formato', { name: 'Rotina', endDate: '03/09/2026' }],
    ['boolean inválido', { name: 'Rotina', removeOnExpiration: 'true' }],
    ['campo interno', { name: 'Rotina', trainerId: 'outro-personal' }],
    ['status na criação', { name: 'Rotina', status: 'active' }],
  ])('POST /api/routines rejeita %s', async (_case, body) => {
    await request(app.getHttpServer())
      .post('/api/routines')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(body)
      .expect(400);

    expect(routinesService.createForTrainer).not.toHaveBeenCalled();
  });

  it('GET /api/routines transforma paginação, busca e status', async () => {
    await request(app.getHttpServer())
      .get('/api/routines?page=2&limit=5&search=%20força%20&status=active')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(routinesService.listForTrainer).toHaveBeenCalledWith(
      user,
      expect.objectContaining({
        page: 2,
        limit: 5,
        search: 'força',
        status: TrainingRoutineStatus.active,
      }),
    );
  });

  it('GET /api/routines rejeita paginação inválida e query desconhecida', async () => {
    await request(app.getHttpServer())
      .get('/api/routines?page=0&trainerId=outro')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);

    expect(routinesService.listForTrainer).not.toHaveBeenCalled();
  });

  it('GET /api/routines/:routineId consulta uma rotina', async () => {
    await request(app.getHttpServer())
      .get(`/api/routines/${routineId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(routinesService.getForTrainer).toHaveBeenCalledWith(user, routineId);
  });

  it('GET /api/routines/:routineId rejeita UUID inválido', async () => {
    await request(app.getHttpServer())
      .get('/api/routines/id-invalido')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400);

    expect(routinesService.getForTrainer).not.toHaveBeenCalled();
  });

  it('PATCH /api/routines/:routineId permite atualização parcial e nullable', async () => {
    await request(app.getHttpServer())
      .patch(`/api/routines/${routineId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        startDate: null,
        endDate: null,
        instructions: null,
        removeOnExpiration: false,
        status: TrainingRoutineStatus.active,
      })
      .expect(200);

    expect(routinesService.updateForTrainer).toHaveBeenCalledWith(
      user,
      routineId,
      {
        startDate: null,
        endDate: null,
        instructions: null,
        removeOnExpiration: false,
        status: TrainingRoutineStatus.active,
      },
    );
  });

  it('PATCH /api/routines/:routineId rejeita null em campo não nullable', async () => {
    await request(app.getHttpServer())
      .patch(`/api/routines/${routineId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: null, removeOnExpiration: null })
      .expect(400);

    expect(routinesService.updateForTrainer).not.toHaveBeenCalled();
  });

  it('DELETE /api/routines/:routineId retorna 204', async () => {
    await request(app.getHttpServer())
      .delete(`/api/routines/${routineId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204)
      .expect('');

    expect(routinesService.deleteForTrainer).toHaveBeenCalledWith(
      user,
      routineId,
    );
  });
});
