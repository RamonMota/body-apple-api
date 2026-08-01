import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { AuthenticatedUser } from '../auth/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { TrainersService } from './trainers.service';

describe('TrainersService', () => {
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
  let prisma: {
    trainer: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let service: TrainersService;

  beforeEach(() => {
    prisma = {
      trainer: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new TrainersService(prisma as unknown as PrismaService);
  });

  it('cria o perfil ligado ao sub e email do token', async () => {
    prisma.trainer.create.mockResolvedValue(profile);

    await expect(
      service.createProfile(user, { name: '  Personal Teste  ' }),
    ).resolves.toEqual(profile);
    expect(prisma.trainer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          authUserId: user.id,
          email: user.email,
          name: 'Personal Teste',
        },
      }),
    );
  });

  it('retorna conflito quando o perfil já existe', async () => {
    const error = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: '7.8.0',
    });
    prisma.trainer.create.mockRejectedValue(error);

    await expect(
      service.createProfile(user, { name: 'Personal Teste' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('consulta o perfil pelo id do usuário autenticado', async () => {
    prisma.trainer.findUnique.mockResolvedValue(profile);

    await expect(service.getProfile(user)).resolves.toEqual(profile);
    expect(prisma.trainer.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { authUserId: user.id } }),
    );
  });

  it('retorna 404 quando o usuário ainda não possui perfil', async () => {
    prisma.trainer.findUnique.mockResolvedValue(null);

    await expect(service.getProfile(user)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('atualiza somente o nome do perfil ligado ao usuário autenticado', async () => {
    const updatedProfile = { ...profile, name: 'Novo Nome' };
    prisma.trainer.update.mockResolvedValue(updatedProfile);

    await expect(
      service.updateProfile(user, { name: '  Novo Nome  ' }),
    ).resolves.toEqual(updatedProfile);
    expect(prisma.trainer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { authUserId: user.id },
        data: { name: 'Novo Nome' },
      }),
    );
  });

  it('retorna 404 ao atualizar um perfil inexistente', async () => {
    const error = new Prisma.PrismaClientKnownRequestError('not found', {
      code: 'P2025',
      clientVersion: '7.8.0',
    });
    prisma.trainer.update.mockRejectedValue(error);

    await expect(
      service.updateProfile(user, { name: 'Novo Nome' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
