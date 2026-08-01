-- AlterEnum
ALTER TYPE "student_registration_source" ADD VALUE 'self_registration';

-- AlterTable
ALTER TABLE "trainers" ADD COLUMN "student_registration_token" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "trainers_student_registration_token_key" ON "trainers"("student_registration_token");
