import type { NextFunction, Request, Response } from 'express';

export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'The requested API resource does not exist.',
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      error: err.message,
    });
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      error: 'Invalid JSON request payload.',
    });
    return;
  }

  console.error('[SmartCommute API Error]:', err);
  res.status(500).json({
    error: 'Transport data could not be retrieved. Please try again.',
  });
}
