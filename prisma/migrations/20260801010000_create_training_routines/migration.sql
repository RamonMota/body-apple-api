-- CreateEnum
CREATE TYPE "training_routine_status" AS ENUM ('draft', 'active', 'archived');

-- CreateTable
CREATE TABLE "training_routines" (
    "id" TEXT NOT NULL,
    "trainer_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "remove_on_expiration" BOOLEAN NOT NULL DEFAULT false,
    "instructions" TEXT,
    "status" "training_routine_status" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "training_routines_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "training_routines_date_order_check" CHECK (
        "start_date" IS NULL OR "end_date" IS NULL OR "end_date" >= "start_date"
    ),
    CONSTRAINT "training_routines_expiration_end_date_check" CHECK (
        NOT "remove_on_expiration" OR "end_date" IS NOT NULL
    )
);

-- CreateIndex
CREATE INDEX "training_routines_trainer_id_deleted_at_status_idx" ON "training_routines"("trainer_id", "deleted_at", "status");

-- CreateIndex
CREATE INDEX "training_routines_trainer_id_created_at_id_idx" ON "training_routines"("trainer_id", "created_at", "id");

-- AddForeignKey
ALTER TABLE "training_routines" ADD CONSTRAINT "training_routines_trainer_id_fkey" FOREIGN KEY ("trainer_id") REFERENCES "trainers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
