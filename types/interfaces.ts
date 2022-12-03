export interface Pagination {
  pageLength: number
  page: number
}

export interface DirectoryContentsResult {
  id: string
  name: string
  mimeType: string
  size: number
  key: string
  createdAt: Date
  updatedAt: Date
  type: "File" | "Directory"
}

export interface Sort {
  field: keyof Pick<
    DirectoryContentsResult,
    "name" | "size" | "createdAt" | "updatedAt"
  >
  direction?: "ASC" | "DESC"
}
