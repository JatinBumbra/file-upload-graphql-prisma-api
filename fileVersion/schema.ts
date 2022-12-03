import { prismaClient } from "../prisma"
import { createModule, gql } from "graphql-modules"
import * as fileVersionService from "./serivce"

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

      extend type Query {
        getAllFileVersions: [FileVersion]!
        requestFileDownload(key: String!): String!
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
  },
})
