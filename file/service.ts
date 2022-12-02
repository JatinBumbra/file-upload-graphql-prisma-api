import { File, PrismaClient, Prisma } from "@prisma/client"
import { generateId } from "../util/generators"
import { getBucket } from "../bucket/bucket"

const fileInputFields = Prisma.validator<Prisma.FileArgs>()({
  select: {
    name: true,
    directoryId: true,
  },
})
export type CreateFileInput = Prisma.FileGetPayload<typeof fileInputFields> & {
  key?: string
  mimeType: string
  size: number
}

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
