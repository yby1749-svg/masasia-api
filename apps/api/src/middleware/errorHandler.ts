// ============================================================================
// Error Handler Middleware
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

// Custom error class
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error response interface
interface ErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
  stack?: string;
}

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Error:', err);

  const response: ErrorResponse = {
    error: 'Internal Server Error',
  };

  let statusCode = 500;

  // Handle custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    response.error = err.message;
  }
  // Handle Zod validation errors
  else if (err instanceof ZodError) {
    statusCode = 400;
    response.error = 'Validation Error';
    response.details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
  }
  // Handle Prisma errors
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    statusCode = 400;
    
    switch (err.code) {
      case 'P2002':
        response.error = 'Duplicate entry';
        response.message = `A record with this ${(err.meta?.target as string[])?.join(', ')} already exists`;
        break;
      case 'P2025':
        statusCode = 404;
        response.error = 'Record not found';
        break;
      case 'P2003':
        response.error = 'Foreign key constraint failed';
        break;
      default:
        response.error = 'Database error';
    }
  }
  else if (err instanceof Prisma.PrismaClientValidationError) {
    statusCode = 400;
    response.error = 'Invalid data provided';
  }
  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    response.error = 'Invalid token';
  }
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    response.error = 'Token expired';
  }
  // Generic error
  else {
    response.error = err.message || 'Internal Server Error';
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

// Not found handler
export const notFound = (req: Request, res: Response): void => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
};
