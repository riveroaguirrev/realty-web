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
  INVALID_CREDENTIALS: new ApiError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.'),
  USER_ALREADY_EXISTS: new ApiError(409, 'USER_ALREADY_EXISTS', 'El correo ya está registrado.'),
  USER_NOT_FOUND: new ApiError(404, 'USER_NOT_FOUND', 'No encontramos la cuenta solicitada.'),
  UNAUTHORIZED: new ApiError(401, 'UNAUTHORIZED', 'Inicia sesión para continuar.'),
  FORBIDDEN: new ApiError(403, 'FORBIDDEN', 'Tu cuenta no tiene permiso para realizar esta acción.'),
  MISSING_TOKEN: new ApiError(401, 'MISSING_TOKEN', 'Inicia sesión para continuar.'),
  INVALID_TOKEN: new ApiError(401, 'INVALID_TOKEN', 'Tu sesión venció. Inicia sesión de nuevo.'),
  VALIDATION_ERROR: new ApiError(400, 'VALIDATION_ERROR', 'Revisa los campos indicados.'),
  INTERNAL_ERROR: new ApiError(500, 'INTERNAL_ERROR', 'No pudimos completar la solicitud. Inténtalo de nuevo más tarde.'),
  INVALID_CODE: new ApiError(400, 'INVALID_CODE', 'El código es incorrecto, venció o ya fue utilizado.'),
  SESSION_REPLACED: new ApiError(401, 'SESSION_REPLACED', 'Tu cuenta se abrió en otro navegador.'),
  ACCOUNT_BLOCKED: new ApiError(403, 'ACCOUNT_BLOCKED', 'Esta cuenta no está habilitada. Contacta al administrador.'),
  EMAIL_NOT_VERIFIED: new ApiError(403, 'EMAIL_NOT_VERIFIED', 'Verifica tu correo para continuar.'),
  SEAT_LIMIT_REACHED: new ApiError(409, 'SEAT_LIMIT_REACHED', 'La sucursal no tiene cupos disponibles. Cancela una invitación o retira una cuenta.'),
}
