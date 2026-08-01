import {
  INestApplication,
  NotFoundException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthGuard } from '../src/auth/auth.guard';
import { AuthenticatedUser } from '../src/auth/authenticated-user.type';
import { TrainersController } from '../src/trainers/trainers.controller';
import { TrainersService } from '../src/trainers/trainers.service';

describe('Trainer profile (e2e)', () => {
  const user: AuthenticatedUser = {
    id: 'auth-user-id',
    email: 'personal@example.com',
  };
  const profile = {
    id: 'trainer-id',
    name: 'Personal Teste',
    email: user.email,
    createdAt: new Date('2026-07-17T12:00:00.000Z'),
    updatedAt: new Date('2026-07-17T12:00:00.000Z'),
  };
  let app: INestApplication<App>;
  let trainersService: {
    createProfile: jest.Mock;
    getProfile: jest.Mock;
    updateProfile: jest.Mock;
  };

  beforeEach(async () => {
    trainersService = {
      createProfile: jest.fn().mockResolvedValue(profile),
      getProfile: jest.fn().mockResolvedValue(profile),
      updateProfile: jest
        .fn()
        .mockResolvedValue({ ...profile, name: 'Novo Nome' }),
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [TrainersController],
      providers: [
        {
          provide: TrainersService,
          useValue: trainersService,
        },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => {
            getRequest: () => { user?: AuthenticatedUser };
          };
        }) => {
          context.switchToHttp().getRequest().user = user;
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

  it('POST /api/trainers/profile cria o perfil autenticado', async () => {
    await request(app.getHttpServer())
      .post('/api/trainers/profile')
      .send({ name: '  Personal Teste  ' })
      .expect(201)
      .expect({
        ...profile,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      });

    expect(trainersService.createProfile).toHaveBeenCalledWith(user, {
      name: 'Personal Teste',
    });
  });

  it('POST /api/trainers/profile rejeita campos não permitidos', async () => {
    await request(app.getHttpServer())
      .post('/api/trainers/profile')
      .send({ name: 'Personal Teste', email: 'outro@example.com' })
      .expect(400);

    expect(trainersService.createProfile).not.toHaveBeenCalled();
  });

  it('GET /api/me retorna o perfil autenticado', async () => {
    await request(app.getHttpServer())
      .get('/api/me')
      .expect(200)
      .expect({
        ...profile,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      });

    expect(trainersService.getProfile).toHaveBeenCalledWith(user);
  });

  it('GET /api/me preserva o 404 quando o perfil ainda não existe', async () => {
    trainersService.getProfile.mockRejectedValue(
      new NotFoundException('Perfil do personal não encontrado'),
    );

    await request(app.getHttpServer()).get('/api/me').expect(404);
  });

  it('GET /api/trainers/profile retorna o próprio perfil', async () => {
    await request(app.getHttpServer())
      .get('/api/trainers/profile')
      .expect(200)
      .expect({
        ...profile,
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      });

    expect(trainersService.getProfile).toHaveBeenCalledWith(user);
  });

  it('PATCH /api/trainers/profile atualiza o nome do próprio perfil', async () => {
    await request(app.getHttpServer())
      .patch('/api/trainers/profile')
      .send({ name: '  Novo Nome  ' })
      .expect(200)
      .expect({
        ...profile,
        name: 'Novo Nome',
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      });

    expect(trainersService.updateProfile).toHaveBeenCalledWith(user, {
      name: 'Novo Nome',
    });
  });

  it('PATCH /api/trainers/profile rejeita alteração de email', async () => {
    await request(app.getHttpServer())
      .patch('/api/trainers/profile')
      .send({ name: 'Novo Nome', email: 'outro@example.com' })
      .expect(400);

    expect(trainersService.updateProfile).not.toHaveBeenCalled();
  });

  it('PATCH /api/trainers/profile exige um nome válido', async () => {
    await request(app.getHttpServer())
      .patch('/api/trainers/profile')
      .send({ name: ' ' })
      .expect(400);

    expect(trainersService.updateProfile).not.toHaveBeenCalled();
  });
});
