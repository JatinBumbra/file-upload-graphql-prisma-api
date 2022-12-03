import { File } from "@prisma/client"
import { prismaClient } from "../prisma"
import { createModule, gql } from "graphql-modules"
import * as fileService from "./service"

export const fileModule = createModule({
  id: "file-module",
  dirname: __dirname,
  typeDefs: [
    gql`
      type File implements FileNode {
        id: ID!
        name: String!
        directoryId: ID!
        ancestors: [String]!
        history: JSON
        versions: [FileVersion]
        createdAt: String!
        updatedAt: String!
        deletedAt: String
      }

      input CreateFileInput {
        name: String!
        directoryId: ID!
        mimeType: String!
        size: Int!
      }

      type CreateFileResult {
        file: File!
        url: String!
      }

      extend type Query {
        getAllFiles: [File]!
        getFile(id: ID!): File
      }

      extend type Mutation {
        createFile(input: CreateFileInput!): CreateFileResult!
        moveFile(id: ID!, directoryId: ID!): File!
        renameFile(id: ID!, name: String!): File!
        deleteFile(id: ID!): Boolean!
      }
    `,
  ],
  resolvers: {
    Query: {
      getAllFiles: () => prismaClient().file.findMany(),
      getFile: async (_: unknown, { id }: { id: File["id"] }) =>
        await fileService.getFile(prismaClient(), id),
    },
    Mutation: {
      createFile: async (
        _: unknown,
        { input }: { input: fileService.CreateFileInput }
      ): Promise<{ file: File; url: string }> =>
        await fileService.createFileRecord(prismaClient(), input),
      moveFile: async (
        _: unknown,
        {
          id,
          directoryId,
        }: { id: File["id"]; directoryId: File["directoryId"] }
      ) => await fileService.moveFile(prismaClient(), id, directoryId),
      renameFile: async (
        _: unknown,
        { id, name }: { id: File["id"]; name: File["name"] }
      ) => await fileService.renameFile(prismaClient(), id, name),
      deleteFile: async (_: unknown, { id }: { id: File["id"] }) =>
        await fileService.deleteFile(prismaClient(), id),
    },
  },
})
