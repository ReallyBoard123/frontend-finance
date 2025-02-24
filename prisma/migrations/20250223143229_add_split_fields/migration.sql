-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "isSplit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "originalAmount" DOUBLE PRECISION,
ADD COLUMN     "splitIndex" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalSplits" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Transaction_documentNumber_idx" ON "Transaction"("documentNumber");
