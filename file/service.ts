import { File, FileVersion, PrismaClient, Prisma } from "@prisma/client"
import { CreateFileVersionInput } from "../fileVersion"
import { generateId } from "../util/generators"
import { getBucket } from "../bucket/bucket"

const fileInputFields = Prisma.validator<Prisma.FileArgs>()({
  select: {
    name: true,
    directoryId: true,
  },
})
export type CreateFileInput = Prisma.FileGetPayload<typeof fileInputFields> &
  Omit<CreateFileVersionInput, "fileId" | "key"> & { key?: FileVersion["key"] }

export async function createFileRecord(
  primsaClient: PrismaClient,
  file: CreateFileInput
): Promise<{ file: File; url: string }> {
  const { name, directoryId, mimeType, size, key: keyInput } = file
  const key = keyInput ?? (await generateId())

  const data = {
    name,
    directoryId,
    versions: {
      create: {
        name,
        key,
        mimeType,
        size,
      },
    },
  }
  const fileData = await primsaClient.file.create({
    data,
    include: { versions: true },
  })
  const bucket = getBucket()
  const url = await bucket.getSignedUrl("put", key)
  return { file: fileData, url }
}

export async function getFile(
  client: PrismaClient,
  id: File["id"]
): Promise<File | null> {
  return await client.file.findUnique({
    where: { id },
    include: { versions: true },
  })
}

export async function moveFile(
  client: PrismaClient,
  id: File["id"],
  directoryId: File["directoryId"]
): Promise<File> {
  return await client.file.update({
    where: { id },
    data: { directoryId },
    include: { versions: true },
  })
}

export async function renameFile(
  client: PrismaClient,
  id: File["id"],
  name: File["name"]
): Promise<File> {
  return await client.file.update({
    where: { id },
    data: { name },
    include: { versions: true },
  })
}

export async function deleteFile(
  client: PrismaClient,
  id: File["id"]
): Promise<boolean> {
  const fileVersions = await client.file
    .findUnique({ where: { id } })
    .versions()
  await client.$transaction([
    client.fileVersion.deleteMany({ where: { fileId: id } }),
    client.file.delete({ where: { id } }),
  ])
  if (fileVersions) {
    for (const version of fileVersions) {
      await getBucket().deleteObject(version.key)
    }
  }
  return true
}
