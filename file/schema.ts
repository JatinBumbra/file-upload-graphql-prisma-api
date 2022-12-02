import { prismaClient } from "../prisma"
import { createModule, gql } from "graphql-modules"
import * as fileService from "./service"
import { File } from "@prisma/client"

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
      }

      extend type Mutation {
        createFile(input: CreateFileInput!): CreateFileResult!
      }
    `,
  ],
  resolvers: {
    Query: {
      getAllFiles: () => {
        return prismaClient().file.findMany()
      },
    },
    Mutation: {
      createFile: async (
        _: unknown,
        { input }: { input: fileService.CreateFileInput }
      ): Promise<{ file: File; url: string }> => {
        return await fileService.createFileRecord(prismaClient(), input)
      },
    },
  },
})
