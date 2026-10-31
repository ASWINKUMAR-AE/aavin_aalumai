import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { sendSuccess, sendError } from '../../utils/response.js';

export class AuthController {
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { usernameOrPhone, password } = req.body;
      const result = await AuthService.login(usernameOrPhone, password, req.ip);
      return sendSuccess(res, result, 'Login successful');
    } catch (err: any) {
      return sendError(res, err.message, 401);
    }
  }

  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.register(req.body, req.ip);
      return sendSuccess(res, result, 'Registration completed successfully', 201);
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const result = await AuthService.refreshToken(refreshToken);
      return sendSuccess(res, result, 'Token refreshed');
    } catch (err: any) {
      return sendError(res, err.message, 401);
    }
  }

  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { phone, newPassword } = req.body;
      const result = await AuthService.forgotPassword(phone, newPassword, req.ip);
      return sendSuccess(res, result, 'Password reset successful');
    } catch (err: any) {
      return sendError(res, err.message, 400);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
    return sendSuccess(res, { user: req.user }, 'Current user profile');
  }

  static async logout(req: Request, res: Response, next: NextFunction) {
    return sendSuccess(res, null, 'Logged out successfully');
  }
}
