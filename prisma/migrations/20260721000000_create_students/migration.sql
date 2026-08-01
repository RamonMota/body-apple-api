-- CreateEnum
CREATE TYPE "student_gender" AS ENUM ('male', 'female', 'non_binary', 'prefer_not_to_say');

-- CreateEnum
CREATE TYPE "student_status" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "student_registration_source" AS ENUM ('trainer');

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "birth_date" DATE NOT NULL,
    "gender" "student_gender" NOT NULL,
    "status" "student_status" NOT NULL DEFAULT 'active',
    "registration_source" "student_registration_source" NOT NULL DEFAULT 'trainer',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "students_phone_key" ON "students"("phone");

-- CreateIndex
CREATE INDEX "students_trainer_id_deleted_at_status_idx" ON "students"("trainer_id", "deleted_at", "status");

-- CreateIndex
CREATE INDEX "students_trainer_id_full_name_id_idx" ON "students"("trainer_id", "full_name", "id");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
