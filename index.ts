import express from "express"
import { config } from "dotenv"

config()

const app = express()
app.get("/", (_, res) => res.send("Hello World"))

app.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT!}.`)
})
