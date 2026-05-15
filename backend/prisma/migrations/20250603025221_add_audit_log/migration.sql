/*
  Warnings:

  - You are about to drop the column `resource` on the `AuditLog` table. All the data in the column will be lost.
  - Added the required column `context` to the `AuditLog` table without a default value. This is not possible if the table is not empty.
  - Made the column `userId` on table `AuditLog` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- AlterTable
ALTER TABLE "AuditLog" DROP COLUMN "resource",
ADD COLUMN     "context" TEXT NOT NULL,
ALTER COLUMN "userId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
