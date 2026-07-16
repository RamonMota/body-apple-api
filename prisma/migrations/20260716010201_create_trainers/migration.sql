-- CreateTable
CREATE TABLE "trainers" (
    "id" TEXT NOT NULL,
    "auth_user_id" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trainers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trainers_auth_user_id_key" ON "trainers"("auth_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "trainers_email_key" ON "trainers"("email");
