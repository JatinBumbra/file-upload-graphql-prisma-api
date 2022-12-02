import { prismaClient } from "../prisma"
import { createModule, gql } from "graphql-modules"

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
        fileId: ID!
        createdAt: String!
        updatedAt: String!
      }

      extend type Query {
        getAllFileVersions: [FileVersion]!
      }
    `,
  ],
  resolvers: {
    Query: {
      getAllFileVersions: () => {
        return prismaClient().fileVersion.findMany()
      },
    },
  },
})
