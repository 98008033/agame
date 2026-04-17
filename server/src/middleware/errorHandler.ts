// Global Error Handler Middleware

import type { Request, Response, NextFunction } from 'express';
import type { ApiResponse, ErrorCode } from '../types/api.js';
import { createErrorResponse, generateRequestId } from '../types/api.js';

// Custom application error
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details: Record<string, unknown> | undefined;
  public readonly retryable: boolean;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number,
    details?: Record<string, unknown>,
    retryable = false
  ) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.retryable = retryable;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error code to HTTP status code mapping
const errorCodeToStatus: Record<ErrorCode, number> = {
  INVALID_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_ERROR: 500,
  RATE_LIMITED: 429,
  SERVICE_UNAVAILABLE: 503,
  INVALID_STATE: 409,
  EVENT_EXPIRED: 410,
  INSUFFICIENT_RESOURCES: 402,
};

// Convert AppError to API error response
function appErrorToResponse(err: AppError, requestId: string): ApiResponse<null> {
  return createErrorResponse(
    err.code,
    err.message,
    requestId,
    err.details,
    err.retryable
  );
}

// Global error handler middleware
export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = generateRequestId();

  // Log error for debugging
  console.error(`[Error ${requestId}]`, err);

  // Handle AppError
  if (err instanceof AppError) {
    const response = appErrorToResponse(err, requestId);
    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Prisma errors
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as Error & { code: string };
    let errorCode: ErrorCode = 'INTERNAL_ERROR';
    let message = '数据库操作失败';

    if (prismaError.code === 'P2002') {
      errorCode = 'INVALID_REQUEST';
      message = '资源已存在';
    } else if (prismaError.code === 'P2025') {
      errorCode = 'NOT_FOUND';
      message = '资源不存在';
    }

    res.status(errorCodeToStatus[errorCode]).json(
      createErrorResponse(errorCode, message, requestId, { prismaCode: prismaError.code }, false)
    );
    return;
  }

  // Handle validation errors (Zod)
  if (err.constructor.name === 'ZodError') {
    const zodError = err as Error & { errors: unknown[] };
    res.status(400).json(
      createErrorResponse(
        'INVALID_REQUEST',
        '请求参数验证失败',
        requestId,
        { validationErrors: zodError.errors },
        false
      )
    );
    return;
  }

  // Handle unexpected errors
  res.status(500).json(
    createErrorResponse(
      'INTERNAL_ERROR',
      process.env['NODE_ENV'] === 'production' ? '服务器内部错误' : err.message,
      requestId,
      process.env['NODE_ENV'] === 'development' ? { stack: err.stack } : undefined,
      true
    )
  );
}

// Common error creators
export function notFoundError(resource: string, id?: string): AppError {
  return new AppError(
    `${resource}不存在`,
    'NOT_FOUND',
    404,
    id ? { id } : undefined,
    false
  );
}

export function unauthorizedError(message = '未授权访问'): AppError {
  return new AppError(message, 'UNAUTHORIZED', 401, undefined, false);
}

export function forbiddenError(message = '禁止访问'): AppError {
  return new AppError(message, 'FORBIDDEN', 403, undefined, false);
}

export function invalidRequestError(message: string, details?: Record<string, unknown>): AppError {
  return new AppError(message, 'INVALID_REQUEST', 400, details, false);
}

export function invalidStateError(message: string, details?: Record<string, unknown>): AppError {
  return new AppError(message, 'INVALID_STATE', 409, details, false);
}

export function insufficientResourcesError(resource: string, required: number, current: number): AppError {
  return new AppError(
    `${resource}不足`,
    'INSUFFICIENT_RESOURCES',
    402,
    { required, current },
    false
  );
}

export function eventExpiredError(eventId: string, expiredAt: string): AppError {
  return new AppError(
    '事件已过期，无法处理',
    'EVENT_EXPIRED',
    410,
    { eventId, expiredAt },
    false
  );
}