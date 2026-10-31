import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { db } from '../config/database.js';
import { AuthUser, JwtPayload, UserRole } from '../types/index.js';
import { sendError } from '../utils/response.js';
import { RowDataPacket } from 'mysql2';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authentication token required', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;

    // Fetch user with role details and specific profile codes
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT u.id, u.username, u.phone, u.full_name, u.status, u.preferred_language,
              fp.farmer_id_code, fp.primary_centre_id,
              vp.vet_license_number,
              vnp.vendor_code
       FROM users u
       LEFT JOIN farmer_profiles fp ON u.id = fp.user_id
       LEFT JOIN veterinary_profiles vp ON u.id = vp.user_id
       LEFT JOIN vendor_profiles vnp ON u.id = vnp.user_id
       WHERE u.id = ? AND u.status = 'active'`,
      [decoded.userId]
    );

    if (!rows || rows.length === 0) {
      return sendError(res, 'User not found or account is not active', 401);
    }

    const userRow = rows[0];

    // Fetch roles
    const [roleRows] = await db.query<RowDataPacket[]>(
      `SELECT r.name FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = ?`,
      [decoded.userId]
    );

    const roles = roleRows.map((r) => r.name as UserRole);

    req.user = {
      id: userRow.id,
      username: userRow.username,
      phone: userRow.phone,
      fullName: userRow.full_name,
      roles,
      preferredLanguage: userRow.preferred_language || 'en',
      primaryCentreId: userRow.primary_centre_id,
      farmerIdCode: userRow.farmer_id_code,
      vetLicenseNumber: userRow.vet_license_number,
      vendorCode: userRow.vendor_code,
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 'Token has expired. Please refresh your session.', 401);
    }
    return sendError(res, 'Invalid authentication token', 401);
  }
}
