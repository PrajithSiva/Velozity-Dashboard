export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
};

// Every intentional failure in the app (auth, RBAC, not-found, validation)
// throws this. The central error middleware turns it into the structured
// { success: false, error: { code, message } } response — nothing else
// (Prisma errors, stack traces) is ever sent to the client.
export class ApiError extends Error {
  code: ErrorCode;
  status: number;
  details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }

  static validation(message: string, details?: unknown) {
    return new ApiError("VALIDATION_ERROR", message, details);
  }
  static unauthenticated(message = "Authentication required") {
    return new ApiError("UNAUTHENTICATED", message);
  }
  static forbidden(message = "You do not have permission to perform this action.") {
    return new ApiError("FORBIDDEN", message);
  }
  static notFound(message = "Resource not found.") {
    return new ApiError("NOT_FOUND", message);
  }
  static conflict(message: string) {
    return new ApiError("CONFLICT", message);
  }
}
