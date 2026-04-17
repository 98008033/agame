// Request Logger Middleware

import type { Request, Response, NextFunction } from 'express';
import { generateRequestId } from '../types/api.js';

// Extend Express Request type (must be at module scope)
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      playerId?: string;
    }
  }
}

export function requestLogger(req: Request, _res: Response, next: NextFunction): void {
  const requestId = generateRequestId();
  const startTime = Date.now();

  // Attach request ID to request object
  req.requestId = requestId;

  // Log request
  const logData = {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  };

  console.log(`[${new Date().toISOString()}] [REQUEST]`, JSON.stringify(logData));

  // Log response on finish
  _res.on('finish', () => {
    const duration = Date.now() - startTime;
    const responseLog = {
      requestId,
      statusCode: _res.statusCode,
      duration: `${duration}ms`,
    };
    console.log(`[${new Date().toISOString()}] [RESPONSE]`, JSON.stringify(responseLog));
  });

  next();
}