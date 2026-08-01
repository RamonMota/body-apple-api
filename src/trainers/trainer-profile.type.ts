import { Trainer } from '../../generated/prisma/client';

export type TrainerProfile = Omit<
  Trainer,
  'authUserId' | 'studentRegistrationToken'
>;
