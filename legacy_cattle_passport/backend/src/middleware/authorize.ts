import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types/index.js';
import { sendError } from '../utils/response.js';

export function authorizeRoles(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 'Unauthorized access', 401);
    }

    const hasRole = req.user.roles.some((r) => allowedRoles.includes(r));
    if (!hasRole && !req.user.roles.includes('admin')) {
      return sendError(
        res,
        `Forbidden: Access requires one of [${allowedRoles.join(', ')}] role`,
        403
      );
    }

    next();
  };
}
