import { customAlphabet } from "nanoid/async"
import { faker } from "@faker-js/faker"

const alphabet =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
const size = 11
export const generateId = customAlphabet(alphabet, size)

export function generateFileNameWithMimeType(): {
  name: string
  mimeType: string
} {
  const mimeType = faker.system.mimeType()
  const ext = faker.system.fileExt(mimeType)
  const filename = faker.system.fileName()
  return { name: filename + "." + ext, mimeType }
}
