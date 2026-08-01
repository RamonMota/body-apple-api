import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { AuthenticatedUser } from '../auth/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTrainerProfileDto } from './dto/create-trainer-profile.dto';
import { UpdateTrainerProfileDto } from './dto/update-trainer-profile.dto';
import { TrainerProfile } from './trainer-profile.type';

const trainerProfileSelect = {
  id: true,
  name: true,
  email: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.TrainerSelect;

@Injectable()
export class TrainersService {
  constructor(private readonly prisma: PrismaService) {}

  async createProfile(
    user: AuthenticatedUser,
    dto: CreateTrainerProfileDto,
  ): Promise<TrainerProfile> {
    try {
      return await this.prisma.trainer.create({
        data: {
          authUserId: user.id,
          email: user.email,
          name: dto.name.trim(),
        },
        select: trainerProfileSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Perfil do personal já existe');
      }

      throw error;
    }
  }

  async getProfile(user: AuthenticatedUser): Promise<TrainerProfile> {
    const profile = await this.prisma.trainer.findUnique({
      where: { authUserId: user.id },
      select: trainerProfileSelect,
    });

    if (!profile) {
      throw new NotFoundException('Perfil do personal não encontrado');
    }

    return profile;
  }

  async updateProfile(
    user: AuthenticatedUser,
    dto: UpdateTrainerProfileDto,
  ): Promise<TrainerProfile> {
    try {
      return await this.prisma.trainer.update({
        where: { authUserId: user.id },
        data: { name: dto.name.trim() },
        select: trainerProfileSelect,
      });
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
}
