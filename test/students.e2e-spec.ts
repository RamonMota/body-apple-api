import {
  ConflictException,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  StudentGender,
  StudentRegistrationSource,
  StudentStatus,
} from '../generated/prisma/client';
import { AuthGuard } from '../src/auth/auth.guard';
import { AuthenticatedUser } from '../src/auth/authenticated-user.type';
import { StudentsController } from '../src/students/students.controller';
import { StudentsService } from '../src/students/students.service';

describe('Students (e2e)', () => {
  const user: AuthenticatedUser = {
    id: 'auth-user-id',
    email: 'personal@example.com',
  };
  const studentId = '8e4367b8-658c-46a2-ae1f-58a57a6f5e20';
  const student = {
    id: studentId,
    fullName: 'Ana Silva',
    phone: '+5585999999999',
    birthDate: new Date('1995-05-20T00:00:00.000Z'),
    gender: StudentGender.female,
    status: StudentStatus.active,
    registrationSource: StudentRegistrationSource.trainer,
    createdAt: new Date('2026-07-21T12:00:00.000Z'),
    updatedAt: new Date('2026-07-21T12:00:00.000Z'),
    deletedAt: null,
  };
  let app: INestApplication<App>;
  let studentsService: {
    createForTrainer: jest.Mock;
    listForTrainer: jest.Mock;
    getForTrainer: jest.Mock;
    updateForTrainer: jest.Mock;
    deleteForTrainer: jest.Mock;
  };

  beforeEach(async () => {
    studentsService = {
      createForTrainer: jest.fn().mockResolvedValue(student),
      listForTrainer: jest.fn().mockResolvedValue({
        data: [student],
        meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      }),
      getForTrainer: jest.fn().mockResolvedValue(student),
      updateForTrainer: jest
        .fn()
        .mockResolvedValue({ ...student, status: StudentStatus.inactive }),
      deleteForTrainer: jest.fn().mockResolvedValue(undefined),
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [StudentsController],
      providers: [{ provide: StudentsService, useValue: studentsService }],
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

  it('POST /api/students cria e normaliza os campos', async () => {
    await request(app.getHttpServer())
      .post('/api/students')
      .send({
        fullName: '  Ana Silva  ',
        phone: '(85) 99999-9999',
        birthDate: '1995-05-20',
        gender: StudentGender.female,
      })
      .expect(201);

    expect(studentsService.createForTrainer).toHaveBeenCalledWith(user, {
      fullName: 'Ana Silva',
      phone: '+5585999999999',
      birthDate: new Date('1995-05-20T00:00:00.000Z'),
      gender: StudentGender.female,
    });
  });

  it.each([
    ['campos obrigatórios', {}],
    [
      'telefone inválido',
      {
        fullName: 'Ana Silva',
        phone: '123',
        birthDate: '1995-05-20',
        gender: StudentGender.female,
      },
    ],
    [
      'data inexistente',
      {
        fullName: 'Ana Silva',
        phone: '(85) 99999-9999',
        birthDate: '1995-02-30',
        gender: StudentGender.female,
      },
    ],
    [
      'data futura',
      {
        fullName: 'Ana Silva',
        phone: '(85) 99999-9999',
        birthDate: '2999-01-01',
        gender: StudentGender.female,
      },
    ],
    [
      'gênero fora do domínio',
      {
        fullName: 'Ana Silva',
        phone: '(85) 99999-9999',
        birthDate: '1995-05-20',
        gender: 'invalid',
      },
    ],
  ])('POST /api/students rejeita %s', async (_case, body) => {
    await request(app.getHttpServer())
      .post('/api/students')
      .send(body)
      .expect(400);

    expect(studentsService.createForTrainer).not.toHaveBeenCalled();
  });

  it('POST /api/students preserva conflito de telefone', async () => {
    studentsService.createForTrainer.mockRejectedValue(
      new ConflictException('Telefone já cadastrado'),
    );

    await request(app.getHttpServer())
      .post('/api/students')
      .send({
        fullName: 'Ana Silva',
        phone: '+5585999999999',
        birthDate: '1995-05-20',
        gender: StudentGender.female,
      })
      .expect(409);
  });

  it('POST /api/students rejeita campos internos', async () => {
    await request(app.getHttpServer())
      .post('/api/students')
      .send({
        fullName: 'Ana Silva',
        phone: '+5585999999999',
        birthDate: '1995-05-20',
        gender: StudentGender.female,
        trainerId: 'outro-personal',
        registrationSource: 'trainer',
        deletedAt: null,
      })
      .expect(400);

    expect(studentsService.createForTrainer).not.toHaveBeenCalled();
  });

  it('GET /api/students transforma paginação, busca e status', async () => {
    await request(app.getHttpServer())
      .get('/api/students?page=2&pageSize=5&search=%20Ana%20&status=active')
      .expect(200);

    expect(studentsService.listForTrainer).toHaveBeenCalledWith(
      user,
      expect.objectContaining({
        page: 2,
        pageSize: 5,
        search: 'Ana',
        status: StudentStatus.active,
      }),
    );
  });

  it('GET /api/students rejeita paginação inválida e query desconhecida', async () => {
    await request(app.getHttpServer())
      .get('/api/students?page=0&trainerId=outro')
      .expect(400);

    expect(studentsService.listForTrainer).not.toHaveBeenCalled();
  });

  it('GET /api/students/:studentId obtém um aluno', async () => {
    await request(app.getHttpServer())
      .get(`/api/students/${studentId}`)
      .expect(200);

    expect(studentsService.getForTrainer).toHaveBeenCalledWith(user, studentId);
  });

  it('PATCH /api/students/:studentId faz edição parcial', async () => {
    await request(app.getHttpServer())
      .patch(`/api/students/${studentId}`)
      .send({ status: StudentStatus.inactive })
      .expect(200);

    expect(studentsService.updateForTrainer).toHaveBeenCalledWith(
      user,
      studentId,
      { status: StudentStatus.inactive },
    );
  });

  it('PATCH /api/students/:studentId rejeita campos internos', async () => {
    await request(app.getHttpServer())
      .patch(`/api/students/${studentId}`)
      .send({ trainerId: 'outro-personal' })
      .expect(400);

    expect(studentsService.updateForTrainer).not.toHaveBeenCalled();
  });

  it('DELETE /api/students/:studentId retorna 204', async () => {
    await request(app.getHttpServer())
      .delete(`/api/students/${studentId}`)
      .expect(204)
      .expect('');

    expect(studentsService.deleteForTrainer).toHaveBeenCalledWith(
      user,
      studentId,
    );
  });
});
