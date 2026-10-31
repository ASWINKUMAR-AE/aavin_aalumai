export type UserRole = 'admin' | 'farmer' | 'veterinary' | 'collection_operator' | 'transport_vendor' | 'booth' | 'bmc' | 'union';

export interface AuthUser {
  id: string;
  username: string;
  phone: string;
  fullName: string;
  roles: UserRole[];
  preferredLanguage: 'en' | 'ta';
  primaryCentreId?: string | null;
  farmerIdCode?: string | null;
  vetLicenseNumber?: string | null;
  vendorCode?: string | null;
}

export interface JwtPayload {
  userId: string;
  username: string;
  roles: UserRole[];
}

export type SafetyDecisionType = 'CLEAR' | 'REVIEW' | 'HOLD';

export interface SafetyDecisionResult {
  decision: SafetyDecisionType;
  primaryReason: string;
  checks: {
    withdrawal: {
      status: 'PASSED' | 'FAILED' | 'REVIEW';
      details: string;
      activeRestrictionUntil?: string | null;
      medicineName?: string | null;
    };
    fat: {
      status: 'PASSED' | 'REVIEW' | 'FAILED';
      value: number;
      threshold: number;
      message: string;
    };
    snf: {
      status: 'PASSED' | 'REVIEW' | 'FAILED';
      value: number;
      threshold: number;
      message: string;
    };
    temperature: {
      status: 'PASSED' | 'REVIEW' | 'FAILED';
      value: number;
      maxThreshold: number;
      message: string;
    };
    adulteration: {
      status: 'PASSED' | 'FAILED';
      detected: boolean;
      typesTested?: string;
    };
  };
  ruleVersion: string;
  evaluatedAt: string;
}

export interface PaymentCalculationResult {
  quantityLitres: number;
  fatPercent: number;
  snfPercent: number;
  baseRate: number;
  fatDiffRate: number;
  snfDiffRate: number;
  qualityIncentive: number;
  ratePerLitre: number;
  totalAmountInr: number;
  ruleCode: string;
}

export type AIProviderType = 'openrouter' | 'own_api' | 'disabled';
