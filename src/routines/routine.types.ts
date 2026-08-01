import {
  TrainingRoutine,
  TrainingRoutineStatus,
} from '../../generated/prisma/client';

export type TrainingRoutineView = Omit<
  TrainingRoutine,
  'trainerId' | 'startDate' | 'endDate'
> & {
  startDate: string | null;
  endDate: string | null;
  status: TrainingRoutineStatus;
};

export interface PaginatedTrainingRoutines {
  data: TrainingRoutineView[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}
