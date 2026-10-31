import { UserRole } from '../types/aavin';

/**
 * Cattle Ear Tag scanning permissions.
 * Allowed ONLY for:
 * - 'booth' (Society / Booth Staff)
 * - 'union' (Union Admin)
 * - 'veterinary' (Veterinary Doctor)
 * - 'admin' (System Admin)
 *
 * Explicitly prohibited for:
 * - 'farmer' (Farmer)
 * - 'bmc' (BMC Staff)
 * - any other vendor or external role
 */
export const CATTLE_TAG_SCANNER_ALLOWED_ROLES: readonly UserRole[] = [
  'booth',
  'union',
  'veterinary',
  'admin',
] as const;

export const canScanCattleTag = (role?: UserRole | null): boolean => {
  if (!role) return false;
  return (CATTLE_TAG_SCANNER_ALLOWED_ROLES as readonly string[]).includes(role);
};
