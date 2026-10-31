import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database.js';
import { env } from '../../config/env.js';
import { UserRole } from '../../types/index.js';
import { AuditService } from '../../services/audit.service.js';
import { RowDataPacket } from 'mysql2';

export class AuthService {
  static async login(usernameOrPhone: string, passwordPlain: string, ipAddress?: string) {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT u.id, u.username, u.email, u.phone, u.password_hash, u.full_name, u.status, u.preferred_language,
              fp.farmer_id_code, fp.primary_centre_id,
              vp.vet_license_number,
              vnp.vendor_code
       FROM users u
       LEFT JOIN farmer_profiles fp ON u.id = fp.user_id
       LEFT JOIN veterinary_profiles vp ON u.id = vp.user_id
       LEFT JOIN vendor_profiles vnp ON u.id = vnp.user_id
       WHERE u.username = ? OR u.phone = ? OR u.email = ?`,
      [usernameOrPhone, usernameOrPhone, usernameOrPhone]
    );

    if (!rows || rows.length === 0) {
      throw new Error('Invalid credentials or user does not exist');
    }

    const user = rows[0];

    if (user.status === 'pending_approval') {
      throw new Error('Your account registration is pending admin approval. Please contact Aavin administration.');
    }
    if (user.status === 'suspended') {
      throw new Error('Your account has been suspended. Please contact Aavin support.');
    }

    const passwordMatch = await bcrypt.compare(passwordPlain, user.password_hash);
    if (!passwordMatch) {
      throw new Error('Invalid username/phone or password');
    }

    // Get user roles
    const [roleRows] = await db.query<RowDataPacket[]>(
      `SELECT r.name, r.display_name FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = ?`,
      [user.id]
    );
    const roles = roleRows.map((r) => r.name as UserRole);

    // Update last login
    await db.query(`UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?`, [user.id]);

    // Generate JWT access & refresh tokens
    const accessToken = jwt.sign(
      { userId: user.id, username: user.username, roles },
      env.JWT_ACCESS_SECRET,
      { expiresIn: '1d' }
    );

    const refreshTokenId = uuidv4();
    const refreshToken = jwt.sign(
      { userId: user.id, tokenId: refreshTokenId },
      env.JWT_REFRESH_SECRET,
      { expiresIn: '30d' }
    );

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await db.query(
      `INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`,
      [refreshTokenId, user.id, hashedRefreshToken, expiresAt]
    );

    await AuditService.log({
      actorUserId: user.id,
      action: 'USER_LOGIN',
      entityType: 'users',
      entityId: user.id,
      ipAddress,
      details: { username: user.username, roles },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        email: user.email,
        fullName: user.full_name,
        status: user.status,
        roles,
        preferredLanguage: user.preferred_language,
        farmerIdCode: user.farmer_id_code,
        primaryCentreId: user.primary_centre_id,
        vetLicenseNumber: user.vet_license_number,
        vendorCode: user.vendor_code,
      },
    };
  }

  static async register(data: any, ipAddress?: string) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // Check unique username or phone
      const [existing] = await connection.query<RowDataPacket[]>(
        `SELECT id FROM users WHERE username = ? OR phone = ?`,
        [data.username, data.phone]
      );
      if (existing.length > 0) {
        throw new Error('A user with this username or mobile number already exists');
      }

      const userId = uuidv4();
      const passwordHash = await bcrypt.hash(data.password, 10);

      // Status: active for demo ease, or pending_approval
      const status = 'active';

      await connection.query(
        `INSERT INTO users (id, username, phone, password_hash, full_name, status, preferred_language)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, data.username, data.phone, passwordHash, data.fullName, status, data.preferredLanguage || 'en']
      );

      // Lookup role id
      const [roleMatch] = await connection.query<RowDataPacket[]>(
        `SELECT id FROM roles WHERE name = ?`,
        [data.role]
      );

      if (roleMatch.length > 0) {
        await connection.query(
          `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`,
          [userId, roleMatch[0].id]
        );
      }

      // Role specific profile setup
      if (data.role === 'farmer') {
        const farmerCode = `FARM-MDU-${Math.floor(1000 + Math.random() * 9000)}`;
        await connection.query(
          `INSERT INTO farmer_profiles (user_id, farmer_id_code, village, taluk, primary_centre_id)
           VALUES (?, ?, ?, ?, ?)`,
          [
            userId,
            farmerCode,
            data.village || 'Melur Rural',
            data.taluk || 'Melur',
            data.primaryCentreId || 'cc-melur-01',
          ]
        );
      } else if (data.role === 'veterinary') {
        const vetLicense = data.vetLicenseNumber || `TN-VET-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        await connection.query(
          `INSERT INTO veterinary_profiles (user_id, vet_license_number, specialization, assigned_zone)
           VALUES (?, ?, ?, ?)`,
          [userId, vetLicense, 'Bovine Medicine & Clinical Health', 'Madurai District']
        );
      } else if (data.role === 'transport_vendor') {
        const vendorCode = `VEND-MDU-${Math.floor(100 + Math.random() * 900)}`;
        await connection.query(
          `INSERT INTO vendor_profiles (user_id, vendor_code, vehicle_registration_number, route_name)
           VALUES (?, ?, ?, ?)`,
          [
            userId,
            vendorCode,
            data.vehicleRegistrationNumber || 'TN-59-AZ-9988',
            'Melur -> Madurai Dairy Route',
          ]
        );
      }

      await connection.commit();

      await AuditService.log({
        actorUserId: userId,
        action: 'USER_REGISTER',
        entityType: 'users',
        entityId: userId,
        ipAddress,
        details: { username: data.username, role: data.role },
      });

      return { userId, username: data.username, status };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  }

  static async refreshToken(refreshToken: string) {
    try {
      const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: string; tokenId: string };
      const [tokenRows] = await db.query<RowDataPacket[]>(
        `SELECT id, is_revoked, expires_at FROM refresh_tokens WHERE id = ? AND user_id = ?`,
        [decoded.tokenId, decoded.userId]
      );

      if (!tokenRows || tokenRows.length === 0 || tokenRows[0].is_revoked) {
        throw new Error('Refresh token is invalid or revoked');
      }

      const [userRows] = await db.query<RowDataPacket[]>(
        `SELECT id, username, status FROM users WHERE id = ?`,
        [decoded.userId]
      );

      if (!userRows || userRows.length === 0 || userRows[0].status !== 'active') {
        throw new Error('User inactive or not found');
      }

      const [roleRows] = await db.query<RowDataPacket[]>(
        `SELECT r.name FROM user_roles ur JOIN roles r ON ur.role_id = r.id WHERE ur.user_id = ?`,
        [decoded.userId]
      );
      const roles = roleRows.map((r) => r.name as UserRole);

      const newAccessToken = jwt.sign(
        { userId: decoded.userId, username: userRows[0].username, roles },
        env.JWT_ACCESS_SECRET,
        { expiresIn: '1d' }
      );

      return { accessToken: newAccessToken };
    } catch (err: any) {
      throw new Error('Invalid or expired refresh token');
    }
  }

  static async forgotPassword(phone: string, newPasswordPlain: string, ipAddress?: string) {
    const [userRows] = await db.query<RowDataPacket[]>(`SELECT id, username FROM users WHERE phone = ?`, [phone]);
    if (!userRows || userRows.length === 0) {
      throw new Error('No user account registered with this phone number');
    }

    const newHash = await bcrypt.hash(newPasswordPlain, 10);
    await db.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [newHash, userRows[0].id]);

    await AuditService.log({
      actorUserId: userRows[0].id,
      action: 'PASSWORD_RESET',
      entityType: 'users',
      entityId: userRows[0].id,
      ipAddress,
      details: { phone },
    });

    return { message: 'Password updated successfully' };
  }
}
