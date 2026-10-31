export type UserRole = 'farmer' | 'booth' | 'bmc' | 'union' | 'veterinary' | 'admin';

export interface DemoUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  phone: string;
  email: string;
  associatedId: string; // farmerId, boothId, bmcId, unionId, etc.
  description: string;
  preferredLanguage?: 'en' | 'ta';
}

export interface Farmer {
  id: string;
  farmerIdCode: string; // e.g. FARM-MDU-101
  name: string;
  mobileNumber: string; // 10 digits
  address: string;
  village: string;
  community: string;
  numberOfCows: number;
  assignedBoothId: string;
  verificationStatus: 'verified' | 'pending';
  bankAccountName?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  upiId?: string;
  createdAt: string;
}

export interface MedicalRecord {
  id: string;
  date: string;
  vetName: string;
  diagnosis: string;
  symptoms: string;
  bodyTemperatureC?: number;
  heartRateBpm?: number;
  rumenMotility?: string;
  recommendations: string;
  followUpDate?: string;
}

export interface VaccinationRecord {
  id: string;
  date: string;
  vaccineName: string;
  batchNumber: string;
  nextDueDate: string;
  administeredBy: string;
}

export interface InseminationRecord {
  id: string;
  date: string;
  bullId: string;
  breed: string;
  technicianName: string;
  pregnancyStatus: 'pending' | 'confirmed_pregnant' | 'not_pregnant';
  expectedCalvingDate?: string;
}

export interface TreatmentRecord {
  id: string;
  date: string;
  vetName: string;
  medicineName: string;
  genericName: string;
  dosage: string;
  route: string;
  treatmentStartDate: string;
  treatmentEndDate: string;
  withdrawalPeriodDays: number;
  withdrawalEndDate: string;
  reason: string;
  notes: string;
}

export interface Cow {
  id: string;
  cowId: string; // e.g. COW-MDU-001
  tagId: string; // 12-digit tag, e.g. 100100001001
  farmerId: string;
  farmerName: string;
  breed: string;
  name: string;
  dateOfBirth: string;
  approxAgeMonths: number;
  sex: 'female' | 'male';
  currentStatus: 'lactating' | 'dry' | 'pregnant' | 'quarantine_hold';
  dailyMilkYield: number; // in litres
  healthStatus: 'healthy' | 'under_treatment' | 'quarantine_hold' | 'observation';
  lactationStage: 'early' | 'peak' | 'mid' | 'late' | 'dry';
  identificationMarks: string;
  photoUrl?: string;
  verificationStatus: 'verified' | 'pending';
  activeWithdrawal?: {
    hasActiveWithdrawal: boolean;
    medicineName: string;
    reason: string;
    treatmentStartDate: string;
    withdrawalEndDate: string;
    daysRemaining: number;
  };
  medicalHistory: MedicalRecord[];
  vaccinationHistory: VaccinationRecord[];
  inseminationHistory: InseminationRecord[];
  treatmentRecords: TreatmentRecord[];
  notes?: string;
  createdAt: string;
}

export interface Booth {
  id: string;
  code: string; // e.g. AAVIN-CC-MDU-01
  name: string;
  taluk: string;
  village: string;
  district: string;
  assignedBmcId: string;
  capacityLitres: number;
  operatorName: string;
  phone: string;
}

export interface BMC {
  id: string;
  code: string; // e.g. AAVIN-BMC-MDU-01
  name: string;
  location: string;
  district: string;
  capacityLitres: number;
  managerName: string;
  phone: string;
  assignedBoothIds: string[];
}

export interface UnionConfig {
  id: string;
  name: string;
  headquarters: string;
  district: string;
  generalManager: string;
  mismatchThresholdLitres: number; // e.g. 5.0
  mismatchThresholdPercent: number; // e.g. 0.5%
}

export interface Vendor {
  id: string;
  code: string;
  name: string;
  vehicleNumber: string;
  vehicleType: string;
  phone: string;
  routeName: string;
}

export type CollectionRoute = 'direct' | 'vendor';
export type MeasurementMethod = 'farmer_wise' | 'combined';

export interface AuditEntry {
  timestamp: string;
  user: string;
  action: string;
  reason: string;
}

export interface MilkRecord {
  id: string;
  farmerId?: string; // empty if combined vendor
  farmerName?: string;
  cowId?: string; // cow ID
  cowTagId?: string; // cow 12-digit tag, e.g. 106353486450
  cowName?: string;
  fatPercentage?: number;
  snfPercentage?: number;
  boothId: string;
  collectionDate: string; // YYYY-MM-DD
  session: 'morning' | 'evening';
  quantityLitres: number;
  route: CollectionRoute;
  vendorId?: string;
  vendorName?: string;
  measurementMethod: MeasurementMethod;
  individualAllocation: 'measured' | 'not_available';
  status: 'recorded' | 'included_in_receipt' | 'corrected';
  createdBy: string;
  notes?: string;
  receiptId?: string;
  createdAt: string;
  auditHistory?: AuditEntry[];
}

export interface BoothReceipt {
  id: string; // e.g. BR-2026-MDU-001
  boothId: string;
  boothName: string;
  bmcId: string;
  bmcName: string;
  collectionDate: string;
  session: 'morning' | 'evening' | 'full_day';
  dispatchQuantity: number; // total litres
  measurementBasis: 'farmer_wise' | 'combined' | 'mixed';
  includedRecordIds: string[];
  totalRecordsCount: number;
  totalFarmersCount: number;
  createdAt: string;
  createdBy: string;
  status: 'draft' | 'confirmed' | 'sent_to_bmc';
  verificationCode: string;
  notes?: string;
}

export type BMCDeliveryStatus = 
  | 'pending_arrival' 
  | 'matched' 
  | 'mismatch_investigation' 
  | 'resolved' 
  | 'escalated_to_union';

export interface BMCDelivery {
  id: string; // e.g. DEL-2026-001
  boothReceiptId: string;
  boothId: string;
  boothName: string;
  bmcId: string;
  collectionDate: string;
  dispatchTime: string;
  declaredDispatchQuantity: number; // from Booth receipt
  measuredReceivedQuantity?: number; // entered by BMC
  difference?: number; // declared - measured
  receivedAt?: string;
  receivedBy?: string;
  status: BMCDeliveryStatus;
  discrepancyCaseId?: string;
}

export interface InvestigationNote {
  id: string;
  timestamp: string;
  author: string;
  note: string;
  evidenceReference?: string;
}

export interface DiscrepancyCase {
  id: string; // e.g. DISC-101
  bmcDeliveryId: string;
  boothId: string;
  boothName: string;
  bmcId: string;
  bmcName: string;
  collectionDate: string;
  declaredQuantity: number;
  measuredQuantity: number;
  differenceLitres: number; // declared - measured
  differencePercent: number;
  status: 'open' | 'under_investigation' | 'resolved' | 'escalated_to_union';
  createdAt: string;
  createdBy: string;
  investigationNotes: InvestigationNote[];
  resolutionReason?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  unionReviewNotes?: string;
  unionReviewedAt?: string;
}

export type SocietyIncomeCategory = 
  | 'procurement_payment'
  | 'quality_incentive'
  | 'transport_subsidy'
  | 'chilling_incentive'
  | 'feed_deduction'
  | 'admin_recovery'
  | 'other';

export interface SocietyIncomeRecord {
  id: string; // e.g. INC-2026-001
  societyId: string; // e.g. BOOTH001
  societyName: string;
  bmcId: string;
  transactionDate: string; // YYYY-MM-DD
  financialPeriod: string; // e.g. '2026-10' or '2026-W42'
  category: SocietyIncomeCategory;
  description: string;
  referenceNumber?: string;
  amountInr: number;
  relatedMilkLitres?: number;
  notes?: string;
  enteredBy: string;
  enteredByUserId?: string;
  status: 'recorded' | 'verified' | 'submitted_to_union';
  createdAt: string;
  auditTrail?: Array<{
    timestamp: string;
    user: string;
    action: string;
    reason?: string;
  }>;
}

export type BMCReportStatus =
  | 'draft'
  | 'sent_to_union'
  | 'under_review'
  | 'reviewed_by_union'
  | 'returned_for_correction';

export interface BMCReceipt {
  id: string; // e.g. BMCR-2026-001
  bmcId: string;
  bmcName: string;
  unionId: string;
  collectionDate: string;
  includedDeliveryIds: string[];
  totalBoothsCount: number;
  totalDeclaredQuantity: number;
  totalReceivedQuantity: number;
  netDifference: number;
  hasDiscrepancies: boolean;
  unresolvedCasesCount: number;
  createdAt: string;
  createdBy: string;
  status: BMCReportStatus;
  verificationCode: string;
  unionReviewNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  // Extended Consolidated Report Fields
  reportingPeriodType?: 'daily' | 'monthly' | 'custom';
  periodStartDate?: string;
  periodEndDate?: string;
  totalRecordedIncome?: number;
  totalAmountReceived?: number;
  totalAmountPending?: number;
  societySummaries?: Array<{
    societyId: string;
    societyName: string;
    declaredLitres: number;
    receivedLitres: number;
    varianceLitres: number;
    recordedIncome: number;
    discrepancyCount: number;
    status: string;
  }>;
  supervisorNotes?: string;
  revisionNumber?: number;
  previousSubmissionRef?: string;
}

export type NotificationType =
  | 'milk_recorded'
  | 'receipt_generated'
  | 'bmc_confirmation'
  | 'delivery_pending'
  | 'discrepancy_alert'
  | 'investigation_created'
  | 'union_escalation'
  | 'withdrawal_warning'
  | 'verification_request'
  | 'system';

export interface InAppNotification {
  id: string;
  recipientRole: UserRole;
  recipientId?: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string;
  isRead: boolean;
  linkRoute?: string;
  referenceId?: string;
}
