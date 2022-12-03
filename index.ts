import express from "express"
import { config } from "dotenv"
import { graphqlHTTP } from "express-graphql"
import { createApplication, createModule, gql } from "graphql-modules"
import { File, Directory, FileVersion } from "@prisma/client"
import { prismaClient } from "./prisma"
import { directoryModule } from "./directory/schema"
import { fileVersionModule } from "./fileVersion/schema"
import { fileModule } from "./file/schema"
import { downloadLocalFile } from "./bucket"

config()

const prisma = prismaClient()

const mainModule = createModule({
  id: "main-module",
  dirname: __dirname,
  typeDefs: [
    gql`
      interface FileNode {
        id: ID!
        name: String!
        createdAt: String!
        updatedAt: String!
      }

      type Query {
        searchFiles(query: String!): [FileNode]
      }
    `,
  ],
  resolvers: {
    FileNode: {
      __resolveType(obj: File | FileVersion | Directory) {
        if (Object.prototype.hasOwnProperty.call(obj, "parentId")) {
          return "Directory"
        }
        if (Object.prototype.hasOwnProperty.call(obj, "fileId")) {
          return "FileVersion"
        }
        if (Object.prototype.hasOwnProperty.call(obj, "directoryId")) {
          return "File"
        }
      },
    },
    Query: {
      searchFiles: () => [],
    },
  },
})

const api = createApplication({
  modules: [mainModule, fileModule, fileVersionModule, directoryModule],
})

const app = express()

app.get("/file", function (req, res) {
  downloadLocalFile(
    `${req.protocol}://${req.get("host") ?? ""}${req.originalUrl}`
  )
    .then((file) => {
      res.setHeader("Content-Type", file.ContentType)
      res.status(200).send(file.Body)
    })
    .catch((error: Error) => {
      res.status(500).json({ error })
    })
})

app.use(
  "/graphql",
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  graphqlHTTP({
    schema: api.schema,
    customExecuteFn: api.createExecution(),
    graphiql: process.env.NODE_ENV === "development",
  })
)

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT!}.`)
})
