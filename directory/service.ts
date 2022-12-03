import {
  DirectoryContentsResult,
  Pagination,
  Sort,
} from "./../types/interfaces"
import { Directory, PrismaClient } from "@prisma/client"
import { deleteFile } from "../file"

export async function createDirectory(
  client: PrismaClient,
  name: Directory["name"],
  parentId: Directory["parentId"]
): Promise<Directory> {
  if (name === "root") {
    throw new Error("Directory name 'root' is reserved")
  }

  const parent = parentId
    ? await client.directory.findUnique({ where: { id: parentId } })
    : null

  const ancestors = parent?.ancestors ?? []

  const directory = await client.directory.create({
    data: {
      name,
      parentId,
      ancestors: [...ancestors, ...(parentId ? [parentId] : [])],
    },
  })
  return directory
}

export async function getDirectory(
  client: PrismaClient,
  id: Directory["id"]
): Promise<Directory | null> {
  return await client.directory.findUnique({
    where: { id },
    include: { directories: true, files: true },
  })
}

export async function getDirectoryContents(
  client: PrismaClient,
  id: Directory["id"],
  pagination?: Pagination,
  sort?: Sort
): Promise<DirectoryContentsResult[]> {
  const [files, directories] = await client.$transaction([
    client.file.findMany({
      where: {
        deletedAt: null,
        ancestors: {
          has: id,
        },
      },
      include: {
        versions: {
          distinct: ["fileId"],
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    client.directory.findMany({
      where: {
        deletedAt: null,
        ancestors: {
          has: id,
        },
      },
    }),
  ])
  const filesWithVersion = files.map((file) => {
    const { id, name, createdAt, updatedAt, versions } = file
    const { mimeType, size, key } = versions[0]
    return {
      id,
      name,
      createdAt,
      updatedAt,
      mimeType,
      size,
      key,
      type: "File" as const,
    }
  })
  const directoriesWithVersion = directories.map((dir) => {
    const { id, name, createdAt, updatedAt } = dir

    return {
      id,
      name,
      createdAt,
      updatedAt,
      mimeType: "",
      size: 0,
      key: "",
      type: "Directory" as const,
    }
  })
  const { field = "name", direction = "ASC" } = sort ?? {}
  const { page = 1, pageLength = 20 } = pagination ?? {}

  const contents =
    field === "name"
      ? [...filesWithVersion, ...directoriesWithVersion].sort((a, b) =>
          a.name > b.name ? 1 : a.name < b.name ? -1 : 0
        )
      : [
          ...directoriesWithVersion.sort((a, b) =>
            a.name > b.name
              ? direction === "ASC"
                ? 1
                : -1
              : a.name < b.name
              ? direction === "DESC"
                ? -1
                : 1
              : 0
          ),
          ...filesWithVersion.sort((a, b) =>
            a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0
          ),
        ]

  const paginatedContents = contents.slice(
    (page - 1) * pageLength,
    (page - 1) * pageLength + pageLength
  )
  return paginatedContents
}

export async function countDirectoryChildren(
  client: PrismaClient,
  id: Directory["id"]
): Promise<number> {
  const [files, directories] = await client.$transaction([
    client.file.count({
      where: {
        ancestors: {
          has: id,
        },
      },
    }),
    client.directory.count({
      where: {
        ancestors: {
          has: id,
        },
      },
    }),
  ])
  return files + directories
}

export async function getDirectorySize(
  client: PrismaClient,
  id: Directory["id"]
): Promise<number | null> {
  const {
    _sum: { size },
  } = await client.fileVersion.aggregate({
    where: { file: { ancestors: { has: id } } },
    _sum: { size: true },
  })
  return size
}

export async function renameDirectory(
  client: PrismaClient,
  id: Directory["id"],
  name: Directory["name"]
): Promise<Directory> {
  if (name.toLowerCase() === "root") {
    throw new Error("Directory name 'root' is reserved")
  }
  const directory = await client.directory.findUnique({ where: { id } })
  if (directory?.name === "root") {
    throw new Error("Renaming 'root' directory is forbidden")
  }
  return await client.directory.update({
    where: { id },
    data: {
      name,
    },
  })
}

export async function deleteDirectory(
  client: PrismaClient,
  id: Directory["id"]
): Promise<true> {
  const files = await client.file.findMany({
    where: { ancestors: { has: id }, deletedAt: null },
  })
  for (const file of files) {
    await deleteFile(client, file.id)
  }

  await client.$transaction([
    client.directory.deleteMany({
      where: { ancestors: { has: id }, deletedAt: null },
    }),
    client.directory.delete({ where: { id } }),
  ])

  return true
}

export async function findDirectories(
  client: PrismaClient,
  query: string
): Promise<Directory[]> {
  return await client.directory.findMany({
    where: {
      name: {
        contains: query,
        mode: "insensitive",
      },
    },
    orderBy: [{ name: "asc" }],
  })
}

export async function moveDirectory(
  client: PrismaClient,
  id: Directory["id"],
  targetId: Directory["id"]
): Promise<Directory> {
  const currentDirectory = await client.directory.findUnique({
    where: { id },
    include: { files: true, directories: true },
  })

  if (!currentDirectory) {
    throw new Error("Invalid directory")
  }

  const targetDirectory = await client.directory.findUnique({
    where: { id: targetId },
  })

  if (!targetDirectory || targetDirectory.ancestors.includes(id)) {
    throw new Error("Invalid target directory")
  }

  const previousAncestors = currentDirectory.ancestors
  const targetAncestors = targetDirectory.ancestors

  const childFilesOfCurrentDir = await client.file.findMany({
    where: { directoryId: id },
    select: { id: true, ancestors: true },
  })
  const descendentFilesOfCurrentDir = await client.file.findMany({
    where: { ancestors: { has: currentDirectory.id } },
    select: { id: true, ancestors: true },
  })
  const descendentDirectoriesOfCurrentDir = await client.directory.findMany({
    where: { ancestors: { has: currentDirectory.id } },
    select: { id: true, ancestors: true },
  })

  const descendentAncestorUpdates = [
    ...childFilesOfCurrentDir.map((file) => {
      const updatedAncestors = [
        ...targetAncestors,
        targetDirectory.id,
        currentDirectory.id,
      ]
      return client.file.update({
        where: { id: file.id },
        data: {
          ancestors: updatedAncestors,
        },
      })
    }),
    ...descendentFilesOfCurrentDir.map((file) => {
      const updatedAncestors = [
        ...new Set([
          ...file.ancestors.filter((a) => !previousAncestors.includes(a)),
          ...targetAncestors,
          targetDirectory.id,
          currentDirectory.id,
        ]),
      ]
      return client.file.update({
        where: { id: file.id },
        data: {
          ancestors: updatedAncestors,
        },
      })
    }),
    ...descendentDirectoriesOfCurrentDir.map((dir) => {
      const updatedAncestors = [
        ...new Set([
          ...dir.ancestors.filter((a) => !previousAncestors.includes(a)),
          ...targetAncestors,
          targetDirectory.id,
          currentDirectory.id,
        ]),
      ]
      return client.directory.update({
        where: { id: dir.id },
        data: {
          ancestors: updatedAncestors,
        },
      })
    }),
  ]

  const childDirectoryAncestorUpdates = client.directory.updateMany({
    where: { parentId: currentDirectory.id },
    data: {
      ancestors: [...targetAncestors, targetDirectory.id, currentDirectory.id],
    },
  })

  await client.$transaction([
    ...descendentAncestorUpdates,
    childDirectoryAncestorUpdates,
    client.directory.update({
      where: { id: currentDirectory.id },
      data: {
        parentId: targetDirectory.id,
        ancestors: [...targetAncestors, targetDirectory.id],
      },
    }),
  ])

  return (await client.directory.findUnique({
    where: { id },
    include: { directories: true, files: true },
  })) as Directory
}
