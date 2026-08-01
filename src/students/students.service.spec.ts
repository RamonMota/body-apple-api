import { ConflictException, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  StudentGender,
  StudentRegistrationSource,
  StudentStatus,
} from '../../generated/prisma/client';
import { AuthenticatedUser } from '../auth/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { ListStudentsQueryDto } from './dto/list-students-query.dto';
import { StudentsService } from './students.service';

describe('StudentsService', () => {
  const user: AuthenticatedUser = {
    id: 'auth-user-id',
    email: 'personal@example.com',
  };
  const anotherUser: AuthenticatedUser = {
    id: 'another-auth-user-id',
    email: 'another@example.com',
  };
  const student = {
    id: '8e4367b8-658c-46a2-ae1f-58a57a6f5e20',
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
  const registrationToken = 'a'.repeat(43);
  let prisma: {
    student: {
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findFirst: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let service: StudentsService;

  beforeEach(() => {
    prisma = {
      student: {
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
    service = new StudentsService(prisma as unknown as PrismaService);
  });

  it('cria aluno com telefone normalizado e identidade do token', async () => {
    prisma.student.create.mockResolvedValue(student);

    await expect(
      service.createForTrainer(user, {
        fullName: '  Ana Silva  ',
        phone: '(85) 99999-9999',
        birthDate: student.birthDate,
        gender: StudentGender.female,
      }),
    ).resolves.toEqual(student);
    expect(prisma.student.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          trainer: { connect: { authUserId: user.id } },
          fullName: 'Ana Silva',
          phone: '+5585999999999',
          status: StudentStatus.active,
          registrationSource: StudentRegistrationSource.trainer,
        }) as unknown,
      }),
    );
  });

  it('traduz telefone duplicado para conflito', async () => {
    prisma.student.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '7.8.0',
      }),
    );

    await expect(
      service.createForTrainer(user, {
        fullName: student.fullName,
        phone: student.phone,
        birthDate: student.birthDate,
        gender: student.gender,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('cria autocadastro pelo token público sem aceitar identidade do browser', async () => {
    const selfRegisteredStudent = {
      ...student,
      registrationSource: StudentRegistrationSource.selfRegistration,
    };
    prisma.student.create.mockResolvedValue(selfRegisteredStudent);

    await expect(
      service.createFromRegistrationLink(registrationToken, {
        fullName: '  Ana Silva  ',
        phone: '(85) 99999-9999',
        birthDate: student.birthDate,
        gender: StudentGender.female,
      }),
    ).resolves.toEqual(selfRegisteredStudent);
    expect(prisma.student.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          trainer: {
            connect: { studentRegistrationToken: registrationToken },
          },
          fullName: 'Ana Silva',
          phone: '+5585999999999',
          birthDate: student.birthDate,
          gender: StudentGender.female,
          status: StudentStatus.active,
          registrationSource: StudentRegistrationSource.selfRegistration,
        },
      }),
    );
  });

  it('não revela se o conflito público foi causado pelo telefone', async () => {
    prisma.student.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: '7.8.0',
      }),
    );

    await expect(
      service.createFromRegistrationLink(registrationToken, {
        fullName: student.fullName,
        phone: student.phone,
        birthDate: student.birthDate,
        gender: student.gender,
      }),
    ).rejects.toThrow('Não foi possível concluir o cadastro');
  });

  it('retorna 404 genérico para token inexistente ou desativado', async () => {
    prisma.student.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('not found', {
        code: 'P2025',
        clientVersion: '7.8.0',
      }),
    );

    await expect(
      service.createFromRegistrationLink(registrationToken, {
        fullName: student.fullName,
        phone: student.phone,
        birthDate: student.birthDate,
        gender: student.gender,
      }),
    ).rejects.toThrow('Link de cadastro inválido ou desativado');
  });

  it('lista com paginação, busca, status, exclusão lógica e escopo do personal', async () => {
    prisma.student.findMany.mockResolvedValue([student]);
    prisma.student.count.mockResolvedValue(1);
    const query = Object.assign(new ListStudentsQueryDto(), {
      page: 2,
      pageSize: 5,
      search: 'Ana 9999',
      status: StudentStatus.active,
    });

    await expect(service.listForTrainer(user, query)).resolves.toEqual({
      data: [student],
      meta: { page: 2, pageSize: 5, total: 1, totalPages: 1 },
    });
    expect(prisma.student.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          status: StudentStatus.active,
          trainer: { authUserId: user.id },
          OR: [
            {
              fullName: { contains: 'Ana 9999', mode: 'insensitive' },
            },
            { phone: { contains: '9999' } },
          ],
        }) as unknown,
        orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
        skip: 5,
        take: 5,
      }),
    );
  });

  it('obtém aluno somente dentro do escopo do personal autenticado', async () => {
    prisma.student.findFirst.mockResolvedValue(student);

    await expect(service.getForTrainer(user, student.id)).resolves.toEqual(
      student,
    );
    expect(prisma.student.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: student.id,
          deletedAt: null,
          trainer: { authUserId: user.id },
        },
      }),
    );
  });

  it('retorna 404 sem revelar aluno de outro personal', async () => {
    prisma.student.findFirst.mockResolvedValue(null);

    await expect(
      service.getForTrainer(anotherUser, student.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('edita parcialmente usando o personal na própria query de atualização', async () => {
    prisma.student.updateMany.mockResolvedValue({ count: 1 });
    prisma.student.findFirst.mockResolvedValue({
      ...student,
      fullName: 'Ana Souza',
    });

    await expect(
      service.updateForTrainer(user, student.id, {
        fullName: '  Ana Souza  ',
      }),
    ).resolves.toEqual({ ...student, fullName: 'Ana Souza' });
    expect(prisma.student.updateMany).toHaveBeenCalledWith({
      where: {
        id: student.id,
        deletedAt: null,
        trainer: { authUserId: user.id },
      },
      data: { fullName: 'Ana Souza' },
    });
  });

  it('não edita aluno de outro personal', async () => {
    prisma.student.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.updateForTrainer(anotherUser, student.id, {
        status: StudentStatus.inactive,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.student.findFirst).not.toHaveBeenCalled();
  });

  it('faz exclusão lógica e inativa o aluno', async () => {
    prisma.student.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.deleteForTrainer(user, student.id)).resolves.toBe(
      undefined,
    );
    expect(prisma.student.updateMany).toHaveBeenCalledWith({
      where: {
        id: student.id,
        deletedAt: null,
        trainer: { authUserId: user.id },
      },
      data: {
        deletedAt: expect.any(Date) as unknown,
        status: StudentStatus.inactive,
      },
    });
  });

  it('trata como sucesso excluir novamente o mesmo aluno', async () => {
    prisma.student.updateMany.mockResolvedValue({ count: 0 });
    prisma.student.findFirst.mockResolvedValue({ id: student.id });

    await expect(service.deleteForTrainer(user, student.id)).resolves.toBe(
      undefined,
    );
  });

  it('não exclui aluno de outro personal', async () => {
    prisma.student.updateMany.mockResolvedValue({ count: 0 });
    prisma.student.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteForTrainer(anotherUser, student.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.student.findFirst).toHaveBeenCalledWith({
      where: {
        id: student.id,
        trainer: { authUserId: anotherUser.id },
      },
      select: { id: true },
    });
  });
});
