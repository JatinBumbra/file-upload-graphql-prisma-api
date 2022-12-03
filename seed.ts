import { PrismaClient } from "@prisma/client"
import fs from "fs/promises"
import { join } from "path"
import { saveFile } from "./bucket/localBucket"
import { createDirectory } from "./directory"
import { createFileRecord } from "./file"
import { generateId, generateFileNameWithMimeType } from "./util/generators"

export async function seed(): Promise<void> {
  const seedFilePath = join(__dirname, "..", "seed-files")
  const client = new PrismaClient()
  try {
    const existingRootDir = await client.directory.findFirst({
      where: { name: "root" },
    })
    const rootDir =
      existingRootDir ??
      (await client.directory.create({ data: { name: "root" } }))
    const subDir1 = await createDirectory(client, "Sub-Directory 1", rootDir.id)
    const subDir2 = await createDirectory(client, "Sub-Directory 2", rootDir.id)
    const subSubDir1 = await createDirectory(
      client,
      "Sub-Sub-Directory 1",
      subDir1.id
    )
    const subSubDir2 = await createDirectory(
      client,
      "Sub-Sub-Directory 2",
      subDir2.id
    )

    const filesDir = await fs.readdir(seedFilePath)
    const files = filesDir.filter(
      (file) => file !== ".DS_Store" && file !== ".git"
    )

    for (const [index, file] of files.entries()) {
      const { name, mimeType } = generateFileNameWithMimeType()
      const key = await generateId()
      const buffer = await fs.readFile(join(seedFilePath, file))
      const size = buffer.byteLength

      await saveFile(key, {
        ContentLength: size,
        LastModified: new Date(),
        ContentType: mimeType,
        Body: buffer,
      })

      const directoryId =
        index < 21
          ? subSubDir2.id
          : index < 42
          ? subSubDir1.id
          : index < 63
          ? subDir2.id
          : index < 84
          ? subDir1.id
          : rootDir.id

      await createFileRecord(client, {
        name,
        mimeType,
        key,
        directoryId,
        size,
      })
    }
  } catch (error) {
    console.error(error)
  }
  await client.$disconnect()
}

void seed()
