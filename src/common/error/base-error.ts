export class BaseError extends Error {
  constructor(
    public readonly name: string,
    public readonly message: string,
    public readonly statusCode: number,
  ) {
    super(message);
  }
}