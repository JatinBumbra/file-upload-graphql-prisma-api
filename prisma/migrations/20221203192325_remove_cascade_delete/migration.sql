-- DropForeignKey
ALTER TABLE "files_versions" DROP CONSTRAINT "files_versions_fileId_fkey";

-- AddForeignKey
ALTER TABLE "files_versions" ADD CONSTRAINT "files_versions_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
