import { Request, Response, NextFunction } from 'express';

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('❌ [Global Error Handler]:', err);

  // Handle specific PostgreSQL Errors cleanly
  if (err.code === '22P02') {
    // Invalid UUID format (e.g., passing "123" instead of a valid UUID string)
    res.status(400).json({
      status: 'fail',
      message: 'Invalid identification format provided. Resource ID must be a valid UUID.'
    });
    return;
  }

  if (err.code === '23505') {
    // Unique constraint violation (e.g., registering an email that already exists)
    res.status(400).json({
      status: 'fail',
      message: 'A record with this unique attribute already exists.'
    });
    return;
  }

  if (err.code === '23503') {
    // Foreign key violation (e.g., inserting a student into a school_id that doesn't exist)
    res.status(400).json({
      status: 'fail',
      message: 'Relational data constraint violation. The associated resource ID does not exist.'
    });
    return;
  }

  // Fallback for unhandled internal server exceptions
  res.status(500).json({
    status: 'error',
    message: 'An unexpected internal server error occurred. Please try again later.',
    ...(process.env.NODE_ENV !== 'production' && { error: err.message }) // Only leak stack traces in dev mode
  });
};