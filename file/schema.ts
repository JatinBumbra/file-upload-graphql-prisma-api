import { prismaClient } from "../prisma"
import { createModule, gql } from "graphql-modules"

export const fileModule = createModule({
  id: "file-module",
  dirname: __dirname,
  typeDefs: [
    gql`
      type File implements FileNode {
        id: ID!
        name: String!
        directoryId: ID!
        versions: [FileVersion]
        createdAt: String!
        updatedAt: String!
      }

      extend type Query {
        getAllFiles: [File]!
      }
    `,
  ],
  resolvers: {
    Query: {
      getAllFiles: () => {
        return prismaClient().file.findMany()
      },
    },
  },
})
