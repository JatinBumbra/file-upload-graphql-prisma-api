import express, { Request } from "express"
import { config } from "dotenv"
import { graphqlHTTP } from "express-graphql"
import { createApplication, createModule, gql } from "graphql-modules"
import { File, Directory, FileVersion } from "@prisma/client"
import { directoryModule, findDirectories } from "./directory"
import { fileVersionModule } from "./fileVersion"
import { fileModule, findFiles } from "./file"
import { downloadLocalFile, uploadLocalFile } from "./bucket"
import { prismaClient } from "./prisma"

config()

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

      input PaginationInput {
        pageLength: Int!
        page: Int!
      }

      input SortInput {
        field: String!
        direction: String
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
      searchFiles: async (
        _: unknown,
        { query }: { query: string }
      ): Promise<Array<Directory | File>> => {
        const prisma = prismaClient()
        const directories = await findDirectories(prisma, query)
        const files = await findFiles(prisma, query)
        return [...directories, ...files]
      },
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
      console.log(error)
      res.status(500).send(error.message)
    })
})

app.use(/\/((?!graphql).)*/, express.raw({ limit: "100000kb", type: "*/*" }))
app.put("/file", function (req: Request<unknown, unknown, Buffer>, res) {
  const { headers } = req
  const data = {
    ContentType: headers["content-type"] ?? "application/octet-stream",
    Body: req.body,
  }
  uploadLocalFile(
    `${req.protocol}://${req.get("host") ?? ""}${req.originalUrl}`,
    data
  )
    .then(() => {
      res.status(201).send(true)
    })
    .catch((error: Error) => {
      console.log(error)
      res.status(500).send(error.message)
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
