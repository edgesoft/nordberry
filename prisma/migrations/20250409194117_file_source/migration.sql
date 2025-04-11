-- CreateEnum
CREATE TYPE "FileSource" AS ENUM ('S3', 'SHAREPOINT');

-- AlterTable
ALTER TABLE "File" ADD COLUMN     "source" "FileSource" NOT NULL DEFAULT 'S3';
