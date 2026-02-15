/**
 * Base error for the Marklift SDK.
 */
export class MarkliftError extends Error {
  readonly code: string;

  constructor(message: string, code: string = "MARKLIFT_ERROR") {
    super(message);
    this.name = "MarkliftError";
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when fetching the URL fails (network, timeout, non-2xx).
 */
export class FetchError extends MarkliftError {
  constructor(
    message: string,
    public readonly url: string,
    public readonly statusCode?: number,
    public readonly cause?: unknown
  ) {
    super(message, "FETCH_ERROR");
    this.name = "FetchError";
  }
}

/**
 * Thrown when parsing or extracting content fails.
 */
export class ParseError extends MarkliftError {
  constructor(message: string, public readonly cause?: unknown) {
    super(message, "PARSE_ERROR");
    this.name = "ParseError";
  }
}

/**
 * Thrown when the URL is invalid or not allowed.
 */
export class InvalidUrlError extends MarkliftError {
  constructor(message: string, public readonly url: string) {
    super(message, "INVALID_URL");
    this.name = "InvalidUrlError";
  }
}
