export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const Errors = {
  INVALID_CREDENTIALS: new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'),
  USER_ALREADY_EXISTS: new ApiError(409, 'USER_ALREADY_EXISTS', 'Email already registered'),
  USER_NOT_FOUND: new ApiError(404, 'USER_NOT_FOUND', 'User not found'),
  UNAUTHORIZED: new ApiError(401, 'UNAUTHORIZED', 'Unauthorized access'),
  FORBIDDEN: new ApiError(403, 'FORBIDDEN', 'Permission denied'),
  MISSING_TOKEN: new ApiError(401, 'MISSING_TOKEN', 'Missing authorization token'),
  INVALID_TOKEN: new ApiError(401, 'INVALID_TOKEN', 'Invalid or expired token'),
  VALIDATION_ERROR: new ApiError(400, 'VALIDATION_ERROR', 'Validation failed'),
  INTERNAL_ERROR: new ApiError(500, 'INTERNAL_ERROR', 'Internal server error'),
}
