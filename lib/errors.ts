export class ResourceNotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ResourceNotFoundError"
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ConflictError"
  }
}
