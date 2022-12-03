import { Pagination, Sort } from "./../types/interfaces"
import { Directory } from "@prisma/client"
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
        ancestors: [String]!
        children: Int!
        size: Int
        directories: [Directory]!
        createdAt: String!
        updatedAt: String!
      }

      type DirectoryContentsResult {
        id: ID!
        name: String!
        mimeType: String!
        size: Int!
        key: String!
        createdAt: String!
        updatedAt: String!
        type: String!
      }

      extend type Query {
        getAllDirectories: [Directory]!
        getDirectory(id: ID!): Directory
        getDirectoryContents(
          id: ID!
          pagination: PaginationInput
          sort: SortInput
        ): [DirectoryContentsResult]
      }

      type Mutation {
        createDirectory(name: String!, parentId: String!): Directory!
        renameDirectory(id: ID!, name: String!): Directory!
        deleteDirectory(id: ID!): Boolean!
        moveDirectory(id: ID!, targetId: ID!): Directory!
      }
    `,
  ],
  resolvers: {
    Directory: {
      children: async ({ id }: { id: Directory["id"] }): Promise<number> =>
        await directoryService.countDirectoryChildren(prismaClient(), id),
      size: async ({ id }: { id: Directory["id"] }): Promise<number | null> =>
        await directoryService.getDirectorySize(prismaClient(), id),
    },
    Query: {
      getAllDirectories: async () => await prismaClient().directory.findMany(),
      getDirectory: async (_: unknown, { id }: { id: Directory["id"] }) =>
        await directoryService.getDirectory(prismaClient(), id),
      getDirectoryContents: async (
        _: unknown,
        {
          id,
          pagination,
          sort,
        }: { id: Directory["id"]; pagination?: Pagination; sort?: Sort }
      ) =>
        await directoryService.getDirectoryContents(
          prismaClient(),
          id,
          pagination,
          sort
        ),
    },
    Mutation: {
      createDirectory: async (
        _: unknown,
        {
          name,
          parentId,
        }: { name: Directory["name"]; parentId: Directory["parentId"] }
      ) =>
        await directoryService.createDirectory(prismaClient(), name, parentId),
      renameDirectory: async (
        _: unknown,
        { name, id }: { name: Directory["name"]; id: Directory["id"] }
      ) => await directoryService.renameDirectory(prismaClient(), id, name),
      deleteDirectory: async (_: unknown, { id }: { id: Directory["id"] }) =>
        await directoryService.deleteDirectory(prismaClient(), id),
      moveDirectory: async (
        _: unknown,
        { id, targetId }: { id: Directory["id"]; targetId: Directory["id"] }
      ) => await directoryService.moveDirectory(prismaClient(), id, targetId),
    },
  },
})
