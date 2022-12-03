import { Pagination } from "interfaces"
import { prismaClient } from "../prisma"
import { createModule, gql } from "graphql-modules"
import * as fileVersionService from "./serivce"
import { File, FileVersion } from "@prisma/client"

export const fileVersionModule = createModule({
  id: "fileVersion-module",
  dirname: __dirname,
  typeDefs: [
    gql`
      type FileVersion implements FileNode {
        id: ID!
        name: String!
        mimeType: String!
        size: Int!
        key: String!
        fileId: ID!
        createdAt: String!
        updatedAt: String!
      }

      input CreateFileVersionInput {
        name: String!
        fileId: ID!
        mimeType: String!
        size: Int!
      }

      type CreateFileVersionResult {
        id: ID!
        name: String!
        fileId: ID!
        mimeType: String!
        size: Int!
        key: String!
        createdAt: String!
        updatedAt: String!
        deletedAt: String
        url: String!
      }

      extend type Query {
        getAllFileVersions: [FileVersion]!
        getFileVersion(id: ID!): FileVersion
        getFileVersions(
          fileId: ID!
          pagination: PaginationInput
        ): [FileVersion]!
        requestFileDownload(key: String!): String!
      }

      extend type Mutation {
        createFileVersion(
          input: CreateFileVersionInput!
        ): CreateFileVersionResult!
        renameFileVersion(id: ID!, name: String!): FileVersion!
        deleteFileVersion(id: ID!): Boolean!
      }
    `,
  ],
  resolvers: {
    Query: {
      getAllFileVersions: () => {
        return prismaClient().fileVersion.findMany()
      },
      getFileVersion: async (_: unknown, { id }: { id: FileVersion["id"] }) =>
        await fileVersionService.getFileVersion(prismaClient(), id),
      getFileVersions: async (
        _: unknown,
        { fileId, pagination }: { fileId: File["id"]; pagination?: Pagination }
      ) =>
        await fileVersionService.getFileVersions(
          prismaClient(),
          fileId,
          pagination
        ),
      requestFileDownload: async (_: unknown, { key }: { key: string }) =>
        await fileVersionService.requestFileDownload(key),
    },
    Mutation: {
      createFileVersion: async (
        _: unknown,
        { input }: { input: fileVersionService.CreateFileVersionInput }
      ): Promise<FileVersion & { url: string }> =>
        await fileVersionService.createFileVersionRecord(prismaClient(), input),
      renameFileVersion: async (
        _: unknown,
        { id, name }: { id: FileVersion["id"]; name: FileVersion["name"] }
      ) => await fileVersionService.renameFileVersion(prismaClient(), id, name),
      deleteFileVersion: async (
        _: unknown,
        { id }: { id: FileVersion["id"] }
      ) => await fileVersionService.deleteFileVersion(prismaClient(), id),
    },
  },
})
