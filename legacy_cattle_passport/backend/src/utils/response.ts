import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, message: string = 'Success', statusCode: number = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString(),
  });
}

export function sendError(res: Response, message: string, statusCode: number = 400, errors: unknown = null) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString(),
  });
}
