import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  StudentRegistrationSource,
  StudentStatus,
} from '../../generated/prisma/client';
import { AuthenticatedUser } from '../auth/authenticated-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { ListStudentsQueryDto } from './dto/list-students-query.dto';
import { normalizePhone } from './dto/student-field.transforms';
import { UpdateStudentDto } from './dto/update-student.dto';
import { PaginatedStudents, StudentView } from './student.types';

const studentSelect = {
  id: true,
  fullName: true,
  phone: true,
  birthDate: true,
  gender: true,
  status: true,
  registrationSource: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} satisfies Prisma.StudentSelect;

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createForTrainer(
    user: AuthenticatedUser,
    dto: CreateStudentDto,
  ): Promise<StudentView> {
    const phone = this.requireNormalizedPhone(dto.phone);

    try {
      return await this.prisma.student.create({
        data: {
          trainer: { connect: { authUserId: user.id } },
          fullName: dto.fullName.trim(),
          phone,
          birthDate: dto.birthDate,
          gender: dto.gender,
          status: dto.status ?? StudentStatus.active,
          registrationSource: StudentRegistrationSource.trainer,
        },
        select: studentSelect,
      });
    } catch (error) {
      this.translateWriteError(error);
    }
  }

  async listForTrainer(
    user: AuthenticatedUser,
    query: ListStudentsQueryDto,
  ): Promise<PaginatedStudents> {
    const where = this.activeStudentScope(user, query);
    const skip = (query.page - 1) * query.pageSize;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.student.findMany({
        where,
        select: studentSelect,
        orderBy: [{ fullName: 'asc' }, { id: 'asc' }],
        skip,
        take: query.pageSize,
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      data,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    };
  }

  async getForTrainer(
    user: AuthenticatedUser,
    studentId: string,
  ): Promise<StudentView> {
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        deletedAt: null,
        trainer: { authUserId: user.id },
      },
      select: studentSelect,
    });

    if (!student) {
      throw this.studentNotFound();
    }

    return student;
  }

  async updateForTrainer(
    user: AuthenticatedUser,
    studentId: string,
    dto: UpdateStudentDto,
  ): Promise<StudentView> {
    const data: Prisma.StudentUpdateManyMutationInput = {
      ...(dto.fullName !== undefined && { fullName: dto.fullName.trim() }),
      ...(dto.phone !== undefined && {
        phone: this.requireNormalizedPhone(dto.phone),
      }),
      ...(dto.birthDate !== undefined && { birthDate: dto.birthDate }),
      ...(dto.gender !== undefined && { gender: dto.gender }),
      ...(dto.status !== undefined && { status: dto.status }),
    };

    try {
      const result = await this.prisma.student.updateMany({
        where: {
          id: studentId,
          deletedAt: null,
          trainer: { authUserId: user.id },
        },
        data,
      });

      if (result.count === 0) {
        throw this.studentNotFound();
      }

      return await this.getForTrainer(user, studentId);
    } catch (error) {
      this.translateWriteError(error);
    }
  }

  async deleteForTrainer(
    user: AuthenticatedUser,
    studentId: string,
  ): Promise<void> {
    const result = await this.prisma.student.updateMany({
      where: {
        id: studentId,
        deletedAt: null,
        trainer: { authUserId: user.id },
      },
      data: {
        deletedAt: new Date(),
        status: StudentStatus.inactive,
      },
    });

    if (result.count > 0) {
      return;
    }

    const existingStudent = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        trainer: { authUserId: user.id },
      },
      select: { id: true },
    });

    if (!existingStudent) {
      throw this.studentNotFound();
    }
  }

  private activeStudentScope(
    user: AuthenticatedUser,
    query: ListStudentsQueryDto,
  ): Prisma.StudentWhereInput {
    const search = query.search?.trim();
    const phoneSearch = search?.replace(/\D/g, '');

    return {
      deletedAt: null,
      trainer: { authUserId: user.id },
      ...(query.status !== undefined && { status: query.status }),
      ...(search && {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          ...(phoneSearch ? [{ phone: { contains: phoneSearch } }] : []),
        ],
      }),
    };
  }

  private requireNormalizedPhone(phone: string): string {
    const normalizedPhone = normalizePhone(phone);

    if (!normalizedPhone) {
      throw new BadRequestException('Telefone inválido');
    }

    return normalizedPhone;
  }

  private translateWriteError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Telefone já cadastrado');
      }

      if (error.code === 'P2025') {
        throw new NotFoundException('Perfil do personal não encontrado');
      }
    }

    throw error;
  }

  private studentNotFound(): NotFoundException {
    return new NotFoundException('Aluno não encontrado');
  }
}
