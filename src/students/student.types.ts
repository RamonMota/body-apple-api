import { Student } from '../../generated/prisma/client';

export type StudentView = Omit<Student, 'trainerId'>;

export interface PaginatedStudents {
  data: StudentView[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
