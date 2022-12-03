import { prismaClient } from "../prisma"
import { createModule, gql } from "graphql-modules"
import * as fileVersionService from "./serivce"
import { FileVersion } from "@prisma/client"

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
        requestFileDownload(key: String!): String!
      }

      extend type Mutation {
        createFileVersion(
          input: CreateFileVersionInput!
        ): CreateFileVersionResult!
      }
    `,
  ],
  resolvers: {
    Query: {
      getAllFileVersions: () => {
        return prismaClient().fileVersion.findMany()
      },
      requestFileDownload: async (_: unknown, { key }: { key: string }) =>
        await fileVersionService.requestFileDownload(key),
    },
    Mutation: {
      createFileVersion: async (
        _: unknown,
        { input }: { input: fileVersionService.CreateFileVersionInput }
      ): Promise<FileVersion & { url: string }> =>
        await fileVersionService.createFileVersionRecord(prismaClient(), input),
    },
  },
})
