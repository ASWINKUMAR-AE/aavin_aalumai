import { z } from 'zod';

export const loginSchema = z.object({
  usernameOrPhone: z
    .string()
    .transform((val) => val.trim())
    .refine((val) => val.length >= 3, 'Username or phone must be at least 3 characters'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  username: z
    .string()
    .transform((val) => val.trim().toLowerCase())
    .refine((val) => val.length >= 3 && val.length <= 50, 'Username must be between 3 and 50 characters'),
  phone: z
    .string()
    .transform((val) => val.replace(/[^0-9]/g, '').slice(-10))
    .refine((val) => /^[0-9]{10}$/.test(val), 'Phone must be a valid 10-digit Indian mobile number'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters'),
  fullName: z
    .string()
    .transform((val) => val.trim())
    .refine((val) => val.length >= 2, 'Full name must be at least 2 characters'),
  role: z
    .enum(['farmer', 'veterinary', 'collection_operator', 'transport_vendor', 'admin'])
    .default('farmer'),
  preferredLanguage: z
    .enum(['en', 'ta'])
    .optional()
    .default('en'),
  // Role specific fields
  village: z.string().optional().default('Melur Rural'),
  taluk: z.string().optional().default('Melur'),
  primaryCentreId: z.string().optional().default('cc-melur-01'),
  vetLicenseNumber: z.string().optional(),
  vehicleRegistrationNumber: z.string().optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10, 'Refresh token is required'),
});

export const forgotPasswordSchema = z.object({
  phone: z.string().regex(/^[0-9]{10}$/, 'Valid 10-digit phone number is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
});
