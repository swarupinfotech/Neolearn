-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "longDescription" TEXT,
ADD COLUMN     "objectives" JSONB,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tags" JSONB,
ADD COLUMN     "technology" TEXT,
ADD COLUMN     "xpReward" INTEGER NOT NULL DEFAULT 100;

-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "description" TEXT,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "ContentStatus" NOT NULL DEFAULT 'PUBLISHED';

-- AlterTable
ALTER TABLE "QuizAttempt" ADD COLUMN     "correctCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Challenge" ADD COLUMN     "gradingMode" TEXT NOT NULL DEFAULT 'function',
ADD COLUMN     "inputFormat" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "criteria" JSONB,
ADD COLUMN     "difficulty" TEXT NOT NULL DEFAULT 'Beginner',
ADD COLUMN     "objectives" JSONB,
ADD COLUMN     "tasks" JSONB,
ADD COLUMN     "technologies" JSONB;

-- AlterTable
ALTER TABLE "LearningPath" ADD COLUMN     "level" TEXT NOT NULL DEFAULT 'Beginner',
ADD COLUMN     "longDescription" TEXT,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "prerequisitePathIds" JSONB,
ADD COLUMN     "xpReward" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Course_technology_idx" ON "Course"("technology");

-- CreateIndex
CREATE INDEX "Course_difficulty_idx" ON "Course"("difficulty");

-- CreateIndex
CREATE INDEX "Quiz_status_order_idx" ON "Quiz"("status", "order");

-- CreateIndex
CREATE INDEX "Challenge_language_idx" ON "Challenge"("language");

-- CreateIndex
CREATE INDEX "Challenge_gradingMode_idx" ON "Challenge"("gradingMode");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_difficulty_idx" ON "Project"("difficulty");

-- CreateIndex
CREATE INDEX "LearningPath_level_idx" ON "LearningPath"("level");

