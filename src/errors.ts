export class RegonError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class RegonAuthError extends RegonError {}

export class RegonSessionError extends RegonError {}

export class RegonNotFoundError extends RegonError {}

export class RegonValidationError extends RegonError {
  constructor(
    message: string,
    public readonly field: "nip" | "regon" | "krs"
  ) {
    super(message);
  }
}

export class RegonRateLimitError extends RegonError {
  constructor(
    message: string,
    public readonly retryAfterMs?: number
  ) {
    super(message);
  }
}

export class RegonApiError extends RegonError {
  constructor(
    message: string,
    public readonly code?: string
  ) {
    super(message);
  }
}
