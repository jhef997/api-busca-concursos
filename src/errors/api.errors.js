export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado.') {
    super(message, 404);
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message = 'Serviço temporariamente indisponível. Provedores de dados inacessíveis.') {
    super(message, 503);
  }
}
