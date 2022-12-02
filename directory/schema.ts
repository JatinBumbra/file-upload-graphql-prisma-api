import { prismaClient } from "../prisma"
import { createModule, gql } from "graphql-modules"
import * as directoryService from "./service"

export const directoryModule = createModule({
  id: "directory-module",
  dirname: __dirname,
  typeDefs: [
    gql`
      type Directory implements FileNode {
        id: ID!
        name: String!
        parentId: ID
        files: [File]!
        directories: [Directory]!
        createdAt: String!
        updatedAt: String!
      }

      extend type Query {
        getAllDirectories: [Directory]!
      }

      type Mutation {
        createDirectory(name: String!, parentId: String!): Directory!
      }
    `,
  ],
  resolvers: {
    Query: {
      getAllDirectories: () => {
        return prismaClient().directory.findMany()
      },
    },
    Mutation: {
      createDirectory: async (
        _: unknown,
        { name, parentId }: { name: string; parentId: string }
      ) =>
        await directoryService.createDirectory(prismaClient(), name, parentId),
    },
  },
})
