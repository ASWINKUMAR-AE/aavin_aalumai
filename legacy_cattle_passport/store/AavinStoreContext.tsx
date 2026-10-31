import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  Farmer, 
  Cow, 
  Booth, 
  BMC, 
  UnionConfig, 
  Vendor, 
  MilkRecord, 
  BoothReceipt, 
  BMCDelivery, 
  DiscrepancyCase, 
  BMCReceipt, 
  InAppNotification,
  MedicalRecord,
  VaccinationRecord,
  InseminationRecord,
  TreatmentRecord,
  UserRole,
  SocietyIncomeRecord,
  BMCReportStatus
} from '../types/aavin';
import { 
  SEED_FARMERS, 
  SEED_COWS, 
  SEED_BOOTHS, 
  SEED_BMCS, 
  SEED_UNION, 
  SEED_VENDORS, 
  SEED_MILK_RECORDS, 
  SEED_BOOTH_RECEIPTS, 
  SEED_BMC_DELIVERIES, 
  SEED_DISCREPANCY_CASES, 
  SEED_BMC_RECEIPTS, 
  SEED_SOCIETY_INCOME,
  SEED_NOTIFICATIONS 
} from '../data/seedData';
import { WorkflowApi } from '../services/workflowApi';

const STORAGE_KEY = '@aavin_smart_cattle_passport_state_v6';

interface AavinState {
  farmers: Farmer[];
  cows: Cow[];
  booths: Booth[];
  bmcs: BMC[];
  union: UnionConfig;
  vendors: Vendor[];
  milkRecords: MilkRecord[];
  boothReceipts: BoothReceipt[];
  bmcDeliveries: BMCDelivery[];
  discrepancyCases: DiscrepancyCase[];
  bmcReceipts: BMCReceipt[];
  societyIncomeRecords: SocietyIncomeRecord[];
  notifications: InAppNotification[];
}

interface AavinStoreContextType extends AavinState {
  isLoading: boolean;
  // Farmer actions
  addFarmer: (
    farmerData: Omit<Farmer, 'id' | 'createdAt'>,
    initialCows?: Array<{
      pashuAadhaar: string;
      breed: string;
      milkCapacity: number;
      name?: string;
    }>
  ) => Farmer;
  updateFarmer: (farmer: Farmer, updatedCows?: Cow[]) => void;
  verifyFarmer: (farmerId: string, status: 'verified' | 'pending') => void;
  
  // Cow actions
  addCow: (cowData: Omit<Cow, 'id' | 'createdAt' | 'medicalHistory' | 'vaccinationHistory' | 'inseminationHistory' | 'treatmentRecords'>) => Cow;
  updateCow: (cow: Cow) => void;
  verifyCow: (cowId: string, status: 'verified' | 'pending') => void;
  addMedicalRecord: (cowId: string, record: Omit<MedicalRecord, 'id'>) => void;
  addVaccinationRecord: (cowId: string, record: Omit<VaccinationRecord, 'id'>) => void;
  addInseminationRecord: (cowId: string, record: Omit<InseminationRecord, 'id'>) => void;
  addTreatmentRecord: (cowId: string, treatment: Omit<TreatmentRecord, 'id'>) => void;

  // Milk Recording actions
  recordMilk: (record: Omit<MilkRecord, 'id' | 'createdAt' | 'status'>) => MilkRecord;
  updateMilkRecord: (recordId: string, newQty: number, reason: string, user: string) => void;

  // Booth actions
  createBoothReceipt: (
    boothId: string, 
    bmcId: string, 
    collectionDate: string, 
    session: 'morning' | 'evening' | 'full_day',
    includedRecordIds: string[], 
    createdBy: string, 
    notes?: string
  ) => BoothReceipt;
  sendBoothReceiptToBmc: (receiptId: string) => void;

  // BMC actions
  receiveBmcDelivery: (deliveryId: string, measuredQuantity: number, receivedBy: string) => { difference: number; isMismatch: boolean };
  addInvestigationNote: (caseId: string, note: string, author: string, evidenceReference?: string) => void;
  resolveDiscrepancyCase: (caseId: string, resolutionReason: string, resolvedBy: string) => void;
  escalateDiscrepancyCase: (caseId: string, reason: string) => void;
  createBmcReceipt: (
    bmcId: string, 
    unionId: string, 
    collectionDate: string, 
    includedDeliveryIds: string[], 
    createdBy: string,
    options?: {
      reportingPeriodType?: 'daily' | 'monthly' | 'custom';
      periodStartDate?: string;
      periodEndDate?: string;
      totalRecordedIncome?: number;
      supervisorNotes?: string;
      societySummaries?: any[];
    }
  ) => BMCReceipt;
  sendBmcReceiptToUnion: (receiptId: string) => void;
  addSocietyIncomeRecord: (record: Omit<SocietyIncomeRecord, 'id' | 'createdAt'>) => SocietyIncomeRecord;
  submitBmcConsolidatedReport: (reportData: {
    bmcId: string;
    reportingPeriodType: 'daily' | 'monthly' | 'custom';
    collectionDate: string;
    periodStartDate?: string;
    periodEndDate?: string;
    includedDeliveryIds: string[];
    totalDeclaredQuantity: number;
    totalReceivedQuantity: number;
    totalRecordedIncome: number;
    totalAmountReceived?: number;
    totalAmountPending?: number;
    societySummaries: Array<{
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
    createdBy: string;
  }) => BMCReceipt;
  updateBmcReportStatus: (reportId: string, status: BMCReportStatus, reviewNotes?: string, reviewer?: string) => void;

  // Union actions
  reviewBmcReceipt: (receiptId: string, reviewNotes: string, reviewedBy: string, status?: BMCReportStatus) => void;
  updateUnionThresholds: (litres: number, percent: number) => void;

  // Notification actions
  markNotificationAsRead: (notificationId: string) => void;
  markAllNotificationsAsRead: (role?: UserRole) => void;

  // Demo Control
  resetDemoData: () => Promise<void>;

  // Computed helper selectors
  getFarmerStats: (farmerId: string) => {
    todaySupply: number;
    last7DaysSupply: number;
    monthSupply: number;
    cowsCount: number;
    hasActiveWithdrawal: boolean;
  };
  getBoothStats: (boothId: string) => {
    todayTotal: number;
    farmersAttended: number;
    expectedFarmersCount: number;
    vendorCombinedTotal: number;
    farmerWiseTotal: number;
    eligibleReceiptTotal: number;
  };
  getBmcStats: (bmcId: string) => {
    registeredBoothsCount: number;
    activeBoothsCount: number;
    inactiveBoothsCount: number;
    todayCollected: number;
    todayDeclared: number;
    todayReceived: number;
    todayDispatchedToUnion: number;
    totalDifference: number;
    totalRecordedIncome: number;
    totalSubmittedToUnionIncome: number;
    pendingDeliveriesCount: number;
    reportsAwaitingUnionCount: number;
    activeDiscrepanciesCount: number;
    resolvedDiscrepanciesCount: number;
  };
  getSocietyDetailedStats: (societyId: string, period?: string) => {
    dailyMilk: number;
    monthlyTotalMilk: number;
    yearlyTotalMilk: number;
    avgDailyQuantity: number;
    highestDailyQuantity: number;
    lowestDailyQuantity: number;
    quantityReceivedByBmc: number;
    differenceLitres: number;
    missingRecordsCount: number;
    unresolvedDiscrepanciesCount: number;
    totalRecordedIncome: number;
    paymentsReceived: number;
    paymentsPending: number;
    amountReportedToUnion: number;
    latestSubmissionDate: string;
    reconciliationStatus: 'reconciled' | 'variance' | 'pending';
    isActive: boolean;
  };
  getUnionStats: () => {
    totalBoothDispatched: number;
    totalBmcReceived: number;
    totalReportedByBmcReceipts: number;
    pendingReceiptsCount: number;
    activeDiscrepanciesCount: number;
    resolvedDiscrepanciesCount: number;
  };
}

const initialSeedState: AavinState = {
  farmers: SEED_FARMERS,
  cows: SEED_COWS,
  booths: SEED_BOOTHS,
  bmcs: SEED_BMCS,
  union: SEED_UNION,
  vendors: SEED_VENDORS,
  milkRecords: SEED_MILK_RECORDS,
  boothReceipts: SEED_BOOTH_RECEIPTS,
  bmcDeliveries: SEED_BMC_DELIVERIES,
  discrepancyCases: SEED_DISCREPANCY_CASES,
  bmcReceipts: SEED_BMC_RECEIPTS,
  societyIncomeRecords: SEED_SOCIETY_INCOME,
  notifications: SEED_NOTIFICATIONS,
};

const AavinStoreContext = createContext<AavinStoreContextType | null>(null);

function sanitizeLoadedState(loadedState: AavinState): AavinState {
  if (!loadedState) return loadedState;

  const replaceText = (text?: string): string => {
    if (!text || typeof text !== 'string') return text || '';
    return text
      .replace(/Vadipatti Milk Collection Booth/gi, 'Vadipatti Milk Collection Society')
      .replace(/Vadipatti Milk Cooling Booth/gi, 'Vadipatti Milk Collection Society')
      .replace(/Melur Primary Milk Producers Co-op Booth/gi, 'Melur Primary Milk Producers Co-op Society')
      .replace(/Melur Town Primary Milk Producers Co-op Booth/gi, 'Melur Town Primary Milk Producers Co-op Society')
      .replace(/Melur Co-op Booth/gi, 'Melur Co-op Society')
      .replace(/Melur Booth/gi, 'Melur Society')
      .replace(/Alanganallur Booth/gi, 'Alanganallur Society')
      .replace(/Alanganallur Village Collection Booth/gi, 'Alanganallur Village Collection Society')
      .replace(/Navinipatti Village Milk Collection Booth/gi, 'Navinipatti Village Milk Collection Society')
      .replace(/cooling booth/gi, 'cooling center')
      .replace(/Cooling Booth/gi, 'Cooling Center')
      .replace(/booth weigh-scale/gi, 'society weigh-scale')
      .replace(/booth weigh scale/gi, 'society weigh-scale')
      .replace(/Booth weigh-scale/gi, 'Society weigh-scale')
      .replace(/Booth weigh scale/gi, 'Society weigh-scale')
      .replace(/booth staff/gi, 'society staff')
      .replace(/Booth Staff/gi, 'Society Staff')
      .replace(/booth records/gi, 'society records')
      .replace(/booth database/gi, 'society database')
      .replace(/booth dispatch receipt/gi, 'society dispatch receipt')
      .replace(/collection booth/gi, 'collection society')
      .replace(/Collection Booth/gi, 'Collection Society')
      .replace(/(\b)booth(\b)/gi, '$1society$2')
      .replace(/(\b)booths(\b)/gi, '$1societies$2')
      .replace(/(\b)Booth(\b)/g, '$1Society$2')
      .replace(/(\b)Booths(\b)/g, '$1Societies$2');
  };

  return {
    ...loadedState,
    farmers: loadedState.farmers || SEED_FARMERS,
    cows: (() => {
      const existing = loadedState.cows || SEED_COWS;
      if (!existing.some((c: any) => c.tagId === '106353486450')) {
        const flagship = SEED_COWS.find((c: any) => c.tagId === '106353486450');
        return flagship ? [flagship, ...existing.filter((c: any) => c.id !== flagship.id)] : existing;
      }
      return existing;
    })(),
    vendors: loadedState.vendors || SEED_VENDORS,
    milkRecords: (() => {
      const existing = loadedState.milkRecords || SEED_MILK_RECORDS;
      if (!existing.some((m: any) => m.cowTagId === '106353486450')) {
        const flagshipRecords = SEED_MILK_RECORDS.filter((m: any) => m.cowTagId === '106353486450');
        return [...flagshipRecords, ...existing];
      }
      return existing;
    })(),
    bmcReceipts: loadedState.bmcReceipts || SEED_BMC_RECEIPTS,
    societyIncomeRecords: (() => {
      const existing = loadedState.societyIncomeRecords || [];
      const existingIds = new Set(existing.map((i: any) => i.id));
      const merged = [...existing, ...SEED_SOCIETY_INCOME.filter(i => !existingIds.has(i.id))];
      return merged.length > 0 ? merged : SEED_SOCIETY_INCOME;
    })(),
    booths: (() => {
      const existing = loadedState.booths || [];
      const existingIds = new Set(existing.map((b: any) => b.id));
      const merged = [...existing, ...SEED_BOOTHS.filter(b => !existingIds.has(b.id))];
      return (merged.length > 0 ? merged : SEED_BOOTHS).map((b: any) => ({
        ...b,
        name: replaceText(b.name),
      }));
    })(),
    bmcs: (() => {
      const existing = loadedState.bmcs || [];
      const existingIds = new Set(existing.map((b: any) => b.id));
      const merged = [...existing, ...SEED_BMCS.filter(b => !existingIds.has(b.id))];
      return (merged.length > 0 ? merged : SEED_BMCS).map((bmc: any) => ({
        ...bmc,
        name: replaceText(bmc.name),
        assignedBoothIds: bmc.id === 'BMC001' ? ['BOOTH001', 'BOOTH002', 'BOOTH004', 'BOOTH005', 'BOOTH006'] : bmc.assignedBoothIds,
      }));
    })(),
    discrepancyCases: (() => {
      const existing = loadedState.discrepancyCases || [];
      const existingIds = new Set(existing.map((dc: any) => dc.id));
      const merged = [...existing, ...SEED_DISCREPANCY_CASES.filter(dc => !existingIds.has(dc.id))];
      return (merged.length > 0 ? merged : SEED_DISCREPANCY_CASES).map((dc: any) => ({
        ...dc,
        boothName: replaceText(dc.boothName),
        resolutionReason: dc.resolutionReason ? replaceText(dc.resolutionReason) : undefined,
        investigationNotes: (dc.investigationNotes || []).map((n: any) => ({
          ...n,
          author: replaceText(n.author),
          note: replaceText(n.note),
        })),
      }));
    })(),
    notifications: (loadedState.notifications || SEED_NOTIFICATIONS).map(n => ({
      ...n,
      title: replaceText(n.title),
      message: replaceText(n.message),
    })),
    boothReceipts: (loadedState.boothReceipts || SEED_BOOTH_RECEIPTS).map(r => ({
      ...r,
      boothName: replaceText(r.boothName),
      notes: r.notes ? replaceText(r.notes) : r.notes,
    })),
    bmcDeliveries: (() => {
      const existing = loadedState.bmcDeliveries || [];
      const existingIds = new Set(existing.map((d: any) => d.id));
      const merged = [...existing, ...SEED_BMC_DELIVERIES.filter(d => !existingIds.has(d.id))];
      return (merged.length > 0 ? merged : SEED_BMC_DELIVERIES).map((d: any) => ({
        ...d,
        boothName: replaceText(d.boothName),
      }));
    })(),
  };
}

export const AavinStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AavinState>(initialSeedState);
  const [isLoading, setIsLoading] = useState(true);

  // Load from AsyncStorage on mount
  useEffect(() => {
    const loadPersistedState = async () => {
      try {
        let saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (!saved) {
          saved = await AsyncStorage.getItem('@aavin_smart_cattle_passport_state_v2');
        }
        if (saved) {
          const parsed = JSON.parse(saved);
          const sanitized = sanitizeLoadedState(parsed);
          setState(sanitized);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
        } else {
          setState(initialSeedState);
        }
      } catch (err) {
        console.warn('Failed to load demo store state:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadPersistedState();
  }, []);

  // Save to AsyncStorage on every update
  const persistState = useCallback(async (newState: AavinState) => {
    setState(newState);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (err) {
      console.warn('Failed to persist demo store state:', err);
    }
  }, []);

  // 1. Farmer Actions
  const addFarmer = useCallback((
    farmerData: Omit<Farmer, 'id' | 'createdAt'>,
    initialCows?: Array<{
      pashuAadhaar: string;
      breed: string;
      milkCapacity: number;
      name?: string;
    }>
  ): Farmer => {
    // Check duplicates
    const duplicateId = state.farmers.some(f => f.farmerIdCode.toLowerCase() === farmerData.farmerIdCode.toLowerCase());
    if (duplicateId) {
      throw new Error(`Farmer ID Code '${farmerData.farmerIdCode}' is already registered.`);
    }
    const duplicatePhone = state.farmers.some(f => f.mobileNumber === farmerData.mobileNumber);
    if (duplicatePhone) {
      throw new Error(`Mobile number '${farmerData.mobileNumber}' is already registered to another farmer.`);
    }

    // Validate initial cows if provided
    const newCows: Cow[] = [];
    if (initialCows && initialCows.length > 0) {
      const seenTags = new Set<string>();
      for (let i = 0; i < initialCows.length; i++) {
        const c = initialCows[i];
        const cleanTag = c.pashuAadhaar.trim();
        if (!/^\d{12}$/.test(cleanTag)) {
          throw new Error(`Cow #${i + 1}: Pashu Aadhaar Number '${cleanTag}' must be exactly 12 numeric digits.`);
        }
        if (seenTags.has(cleanTag)) {
          throw new Error(`Duplicate Pashu Aadhaar #${cleanTag} entered for multiple cows.`);
        }
        seenTags.add(cleanTag);
        const exists = state.cows.some(existing => existing.tagId === cleanTag);
        if (exists) {
          throw new Error(`Pashu Aadhaar #${cleanTag} already exists in the Cattle Passport registry.`);
        }
      }
    }

    const newFarmer: Farmer = {
      ...farmerData,
      id: `FARMER${String(state.farmers.length + 1).padStart(3, '0')}`,
      numberOfCows: (initialCows && initialCows.length > 0) ? initialCows.length : (farmerData.numberOfCows || 1),
      createdAt: new Date().toISOString(),
    };

    if (initialCows && initialCows.length > 0) {
      initialCows.forEach((c, idx) => {
        newCows.push({
          id: `COW${String(state.cows.length + idx + 1).padStart(3, '0')}`,
          cowId: `COW-${newFarmer.farmerIdCode}-${String(idx + 1).padStart(2, '0')}`,
          tagId: c.pashuAadhaar.trim(),
          farmerId: newFarmer.id,
          farmerName: newFarmer.name,
          breed: c.breed || 'Jersey Cross',
          name: c.name?.trim() || `Cow #${idx + 1} (${c.breed || 'Jersey Cross'})`,
          dateOfBirth: '2023-04-15',
          approxAgeMonths: 36,
          sex: 'female',
          currentStatus: 'lactating',
          dailyMilkYield: Number(c.milkCapacity) || 10,
          healthStatus: 'healthy',
          lactationStage: 'peak',
          identificationMarks: 'Govt 12-digit RFID Tag',
          verificationStatus: 'verified',
          medicalHistory: [],
          vaccinationHistory: [],
          inseminationHistory: [],
          treatmentRecords: [],
          createdAt: new Date().toISOString(),
        });
      });
    }

    const newNotification: InAppNotification = {
      id: `NOTIF-${Date.now()}`,
      recipientRole: 'admin',
      title: 'New Farmer Registered',
      message: `Farmer ${newFarmer.name} (${newFarmer.farmerIdCode}) registered with ${newCows.length} cattle passports.`,
      type: 'verification_request',
      timestamp: 'Just now',
      isRead: false,
      linkRoute: '/(admin)/verifications',
    };

    const updated = {
      ...state,
      farmers: [newFarmer, ...state.farmers],
      cows: [...newCows, ...state.cows],
      notifications: [newNotification, ...state.notifications],
    };
    persistState(updated);
    return newFarmer;
  }, [state, persistState]);

  const updateFarmer = useCallback((farmer: Farmer, updatedCows?: Cow[]) => {
    const newNotification: InAppNotification = {
      id: `NOTIF-${Date.now()}`,
      recipientRole: 'admin',
      title: 'Farmer Profile & Cattle Updated',
      message: `Farmer record for ${farmer.name} (${farmer.farmerIdCode}) and cattle details were updated.`,
      type: 'system',
      timestamp: 'Just now',
      isRead: false,
    };

    let updatedCowsList = state.cows;
    if (updatedCows && updatedCows.length > 0) {
      const cowMap = new Map(updatedCows.map(c => [c.id, c]));
      updatedCowsList = state.cows.map(c => cowMap.has(c.id) ? cowMap.get(c.id)! : c);
    }

    const updated = {
      ...state,
      farmers: state.farmers.map(f => f.id === farmer.id ? farmer : f),
      cows: updatedCowsList,
      notifications: [newNotification, ...state.notifications],
    };
    persistState(updated);

    // Sync to backend MySQL / API
    WorkflowApi.updateFarmer(farmer.id, {
      fullName: farmer.name,
      phone: farmer.mobileNumber,
      village: farmer.village,
      taluk: farmer.community,
      farmerIdCode: farmer.farmerIdCode,
      bankAccountName: farmer.bankAccountName,
      bankName: farmer.bankName,
      bankAccountNumber: farmer.bankAccountNumber,
      bankIfsc: farmer.bankIfsc,
      upiId: farmer.upiId,
      primaryCentreId: farmer.assignedBoothId,
    }).catch(err => {
      console.log('[WorkflowApi] Farmer update persisted locally. Offline/mock mode:', err?.message || err);
    });
  }, [state, persistState]);

  const verifyFarmer = useCallback((farmerId: string, status: 'verified' | 'pending') => {
    const updated = {
      ...state,
      farmers: state.farmers.map(f => f.id === farmerId ? { ...f, verificationStatus: status } : f),
    };
    persistState(updated);
  }, [state, persistState]);

  // 2. Cow Actions
  const addCow = useCallback((cowData: Omit<Cow, 'id' | 'createdAt' | 'medicalHistory' | 'vaccinationHistory' | 'inseminationHistory' | 'treatmentRecords'>): Cow => {
    // Validate tag format: 12 numeric digits
    if (!/^\d{12}$/.test(cowData.tagId)) {
      throw new Error('Cattle Ear Tag ID must be exactly 12 numeric digits.');
    }
    // Check duplicate tag
    const duplicateTag = state.cows.some(c => c.tagId === cowData.tagId);
    if (duplicateTag) {
      throw new Error(`Ear Tag ID #${cowData.tagId} already exists in the Cattle Passport registry.`);
    }

    const newCow: Cow = {
      ...cowData,
      id: `COW${String(state.cows.length + 1).padStart(3, '0')}`,
      medicalHistory: [],
      vaccinationHistory: [],
      inseminationHistory: [],
      treatmentRecords: [],
      createdAt: new Date().toISOString(),
    };

    // Update farmer cow count
    const updatedFarmers = state.farmers.map(f => 
      f.id === cowData.farmerId ? { ...f, numberOfCows: f.numberOfCows + 1 } : f
    );

    const updated = {
      ...state,
      cows: [newCow, ...state.cows],
      farmers: updatedFarmers,
    };
    persistState(updated);
    return newCow;
  }, [state, persistState]);

  const updateCow = useCallback((cow: Cow) => {
    const updated = {
      ...state,
      cows: state.cows.map(c => c.id === cow.id ? cow : c),
    };
    persistState(updated);
  }, [state, persistState]);

  const verifyCow = useCallback((cowId: string, status: 'verified' | 'pending') => {
    const updated = {
      ...state,
      cows: state.cows.map(c => c.id === cowId ? { ...c, verificationStatus: status } : c),
    };
    persistState(updated);
  }, [state, persistState]);

  const addMedicalRecord = useCallback((cowId: string, record: Omit<MedicalRecord, 'id'>) => {
    const newEntry: MedicalRecord = {
      ...record,
      id: `MED-${Date.now()}`,
    };
    const updated = {
      ...state,
      cows: state.cows.map(c => c.id === cowId ? {
        ...c,
        medicalHistory: [newEntry, ...c.medicalHistory],
      } : c),
    };
    persistState(updated);
  }, [state, persistState]);

  const addVaccinationRecord = useCallback((cowId: string, record: Omit<VaccinationRecord, 'id'>) => {
    const newEntry: VaccinationRecord = {
      ...record,
      id: `VAC-${Date.now()}`,
    };
    const updated = {
      ...state,
      cows: state.cows.map(c => c.id === cowId ? {
        ...c,
        vaccinationHistory: [newEntry, ...c.vaccinationHistory],
      } : c),
    };
    persistState(updated);
  }, [state, persistState]);

  const addInseminationRecord = useCallback((cowId: string, record: Omit<InseminationRecord, 'id'>) => {
    const newEntry: InseminationRecord = {
      ...record,
      id: `INS-${Date.now()}`,
    };
    const updated = {
      ...state,
      cows: state.cows.map(c => c.id === cowId ? {
        ...c,
        inseminationHistory: [newEntry, ...c.inseminationHistory],
      } : c),
    };
    persistState(updated);
  }, [state, persistState]);

  const addTreatmentRecord = useCallback((cowId: string, treatment: Omit<TreatmentRecord, 'id'>) => {
    const targetCow = state.cows.find(c => c.id === cowId);
    if (!targetCow) return;

    const newTreatment: TreatmentRecord = {
      ...treatment,
      id: `TRT-${Date.now()}`,
    };

    const hasWithdrawal = treatment.withdrawalPeriodDays > 0;
    const activeWithdrawal = hasWithdrawal ? {
      hasActiveWithdrawal: true,
      medicineName: treatment.medicineName,
      reason: treatment.reason,
      treatmentStartDate: treatment.treatmentStartDate,
      withdrawalEndDate: treatment.withdrawalEndDate,
      daysRemaining: treatment.withdrawalPeriodDays,
    } : undefined;

    const updatedCow: Cow = {
      ...targetCow,
      healthStatus: hasWithdrawal ? 'under_treatment' : targetCow.healthStatus,
      currentStatus: hasWithdrawal ? 'quarantine_hold' : targetCow.currentStatus,
      activeWithdrawal,
      treatmentRecords: [newTreatment, ...targetCow.treatmentRecords],
    };

    // Create notifications for farmer & society staff
    const notificationsToAdd: InAppNotification[] = [];
    if (hasWithdrawal) {
      notificationsToAdd.push({
        id: `NOTIF-WD-FARMER-${Date.now()}`,
        recipientRole: 'farmer',
        recipientId: targetCow.farmerId,
        title: '⚠️ Active Milk Withholding Notice',
        message: `Cow ${targetCow.name} (#${targetCow.tagId}) treated with ${treatment.medicineName}. Milk must be strictly withheld until ${treatment.withdrawalEndDate}.`,
        type: 'withdrawal_warning',
        timestamp: 'Just now',
        isRead: false,
        linkRoute: `/cow-details?cowId=${targetCow.id}`,
      });
      notificationsToAdd.push({
        id: `NOTIF-WD-BOOTH-${Date.now()}`,
        recipientRole: 'booth',
        title: 'Safety Warning: Cow on Withdrawal',
        message: `Farmer ${targetCow.farmerName}'s cow ${targetCow.name} (#${targetCow.tagId}) is under antibiotic withdrawal. Do not accept this cow's milk.`,
        type: 'withdrawal_warning',
        timestamp: 'Just now',
        isRead: false,
      });
    }

    const updated = {
      ...state,
      cows: state.cows.map(c => c.id === cowId ? updatedCow : c),
      notifications: [...notificationsToAdd, ...state.notifications],
    };
    persistState(updated);
  }, [state, persistState]);

  // 3. Milk Recording Actions
  const recordMilk = useCallback((recordData: Omit<MilkRecord, 'id' | 'createdAt' | 'status'>): MilkRecord => {
    if (recordData.quantityLitres <= 0 || isNaN(recordData.quantityLitres)) {
      throw new Error('Recorded milk quantity must be greater than zero.');
    }

    // Check duplicate submission
    if (recordData.measurementMethod === 'farmer_wise' && recordData.farmerId) {
      const isDuplicate = state.milkRecords.some(
        r => r.farmerId === recordData.farmerId &&
             r.collectionDate === recordData.collectionDate &&
             r.session === recordData.session
      );
      if (isDuplicate) {
        throw new Error(`A milk entry for this farmer on ${recordData.collectionDate} (${recordData.session}) already exists.`);
      }
    }

    const newRecord: MilkRecord = {
      ...recordData,
      id: `MR-${Date.now()}`,
      status: 'recorded',
      createdAt: new Date().toISOString(),
    };

    const notifs: InAppNotification[] = [];
    if (newRecord.farmerId) {
      notifs.push({
        id: `NOTIF-MILK-${Date.now()}`,
        recipientRole: 'farmer',
        recipientId: newRecord.farmerId,
        title: 'Milk Supply Recorded',
        message: `Your ${newRecord.session} supply of ${newRecord.quantityLitres.toFixed(2)} Litres was recorded at the society.`,
        type: 'milk_recorded',
        timestamp: 'Just now',
        isRead: false,
        linkRoute: '/(farmer)/milk-history',
      });
    }

    const updated = {
      ...state,
      milkRecords: [newRecord, ...state.milkRecords],
      notifications: [...notifs, ...state.notifications],
    };
    persistState(updated);

    // Background sync to backend MySQL
    WorkflowApi.recordMilkTransaction({
      farmerUserId: newRecord.farmerId,
      farmerName: newRecord.farmerName,
      boothId: newRecord.boothId,
      collectionDate: newRecord.collectionDate,
      session: newRecord.session,
      quantityLitres: newRecord.quantityLitres,
      route: newRecord.route,
      vendorId: newRecord.vendorId,
      vendorName: newRecord.vendorName,
      measurementMethod: newRecord.measurementMethod,
      notes: newRecord.notes,
    }).catch(err => {
      console.log('[WorkflowApi] Milk transaction persisted locally. Offline/mock mode:', err?.message || err);
    });

    return newRecord;
  }, [state, persistState]);

  const updateMilkRecord = useCallback((recordId: string, newQty: number, reason: string, user: string) => {
    const existing = state.milkRecords.find(r => r.id === recordId);
    if (!existing) return;

    const auditEntry = {
      timestamp: new Date().toISOString(),
      user,
      action: `Quantity changed from ${existing.quantityLitres}L to ${newQty}L`,
      reason,
    };

    const updated = {
      ...state,
      milkRecords: state.milkRecords.map(r => r.id === recordId ? {
        ...r,
        quantityLitres: newQty,
        status: 'corrected' as const,
        auditHistory: [auditEntry, ...(r.auditHistory || [])],
      } : r),
    };
    persistState(updated);
  }, [state, persistState]);

  // 4. Society Actions
  const createBoothReceipt = useCallback((
    boothId: string, 
    bmcId: string, 
    collectionDate: string, 
    session: 'morning' | 'evening' | 'full_day',
    includedRecordIds: string[], 
    createdBy: string, 
    notes?: string
  ): BoothReceipt => {
    const booth = state.booths.find(b => b.id === boothId);
    const bmc = state.bmcs.find(b => b.id === bmcId);

    const records = state.milkRecords.filter(r => includedRecordIds.includes(r.id));
    const totalQuantity = records.reduce((sum, r) => sum + r.quantityLitres, 0);

    const farmerWiseRecords = records.filter(r => r.measurementMethod === 'farmer_wise');
    const combinedRecords = records.filter(r => r.measurementMethod === 'combined');

    let basis: 'farmer_wise' | 'combined' | 'mixed' = 'farmer_wise';
    if (combinedRecords.length > 0 && farmerWiseRecords.length === 0) basis = 'combined';
    else if (combinedRecords.length > 0 && farmerWiseRecords.length > 0) basis = 'mixed';

    const uniqueFarmers = new Set(farmerWiseRecords.map(r => r.farmerId).filter(Boolean));

    const receiptId = `BR-${collectionDate.replace(/-/g, '')}-${String(state.boothReceipts.length + 1).padStart(3, '0')}`;
    const verificationCode = `VER-${Math.floor(100000 + Math.random() * 900000)}`;

    const newReceipt: BoothReceipt = {
      id: receiptId,
      boothId,
      boothName: booth?.name || 'Aavin Society',
      bmcId,
      bmcName: bmc?.name || 'Aavin BMC',
      collectionDate,
      session,
      dispatchQuantity: parseFloat(totalQuantity.toFixed(2)),
      measurementBasis: basis,
      includedRecordIds,
      totalRecordsCount: records.length,
      totalFarmersCount: uniqueFarmers.size,
      createdAt: new Date().toISOString(),
      createdBy,
      status: 'confirmed',
      verificationCode,
      notes,
    };

    // Mark milk records as included in receipt
    const updatedMilkRecords = state.milkRecords.map(r => 
      includedRecordIds.includes(r.id) ? { ...r, status: 'included_in_receipt' as const, receiptId } : r
    );

    const updated = {
      ...state,
      boothReceipts: [newReceipt, ...state.boothReceipts],
      milkRecords: updatedMilkRecords,
    };
    persistState(updated);
    return newReceipt;
  }, [state, persistState]);

  const sendBoothReceiptToBmc = useCallback((receiptId: string) => {
    const receipt = state.boothReceipts.find(r => r.id === receiptId);
    if (!receipt) return;

    // Check if already sent
    const existingDelivery = state.bmcDeliveries.find(d => d.boothReceiptId === receiptId);
    if (existingDelivery) return;

    const newDelivery: BMCDelivery = {
      id: `DEL-${Date.now()}`,
      boothReceiptId: receipt.id,
      boothId: receipt.boothId,
      boothName: receipt.boothName,
      bmcId: receipt.bmcId,
      collectionDate: receipt.collectionDate,
      dispatchTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      declaredDispatchQuantity: receipt.dispatchQuantity,
      status: 'pending_arrival',
    };

    const newNotification: InAppNotification = {
      id: `NOTIF-DEL-BMC-${Date.now()}`,
      recipientRole: 'bmc',
      recipientId: receipt.bmcId,
      title: 'New Dispatch Awaiting Receipt',
      message: `${receipt.boothName} dispatched ${receipt.dispatchQuantity.toFixed(2)} Litres (Receipt #${receipt.id}). Ready for measurement entry.`,
      type: 'delivery_pending',
      timestamp: 'Just now',
      isRead: false,
      linkRoute: '/(bmc)/receive-milk',
    };

    const updated = {
      ...state,
      boothReceipts: state.boothReceipts.map(r => r.id === receiptId ? { ...r, status: 'sent_to_bmc' as const } : r),
      bmcDeliveries: [newDelivery, ...state.bmcDeliveries],
      notifications: [newNotification, ...state.notifications],
    };
    persistState(updated);

    // Sync to backend
    WorkflowApi.generateBoothReceipt({
      boothId: receipt.boothId,
      collectionDate: receipt.collectionDate,
      session: receipt.session,
      notes: receipt.notes,
    }).catch(err => {
      console.log('[WorkflowApi] Society receipt dispatched locally. Offline/mock mode:', err?.message || err);
    });
  }, [state, persistState]);

  // 5. BMC Actions (Crucial Core Workflow!)
  const receiveBmcDelivery = useCallback((deliveryId: string, measuredQuantity: number, receivedBy: string) => {
    const delivery = state.bmcDeliveries.find(d => d.id === deliveryId);
    if (!delivery) throw new Error('Delivery record not found');

    const difference = parseFloat((delivery.declaredDispatchQuantity - measuredQuantity).toFixed(2));
    const differencePercent = delivery.declaredDispatchQuantity > 0 
      ? parseFloat(((Math.abs(difference) / delivery.declaredDispatchQuantity) * 100).toFixed(2))
      : 0;

    const thresholdLitres = state.union.mismatchThresholdLitres;
    const isMismatch = Math.abs(difference) > thresholdLitres;

    let caseId: string | undefined = undefined;
    const newDiscrepancyCases = [...state.discrepancyCases];
    const newNotifications = [...state.notifications];

    if (isMismatch) {
      caseId = `DISC-${Math.floor(100 + Math.random() * 900)}`;
      const bmc = state.bmcs.find(b => b.id === delivery.bmcId);

      const newCase: DiscrepancyCase = {
        id: caseId,
        bmcDeliveryId: delivery.id,
        boothId: delivery.boothId,
        boothName: delivery.boothName,
        bmcId: delivery.bmcId,
        bmcName: bmc?.name || 'Aavin BMC',
        collectionDate: delivery.collectionDate,
        declaredQuantity: delivery.declaredDispatchQuantity,
        measuredQuantity,
        differenceLitres: difference,
        differencePercent,
        status: 'open',
        createdAt: new Date().toISOString(),
        createdBy: receivedBy,
        investigationNotes: [
          {
            id: `NOTE-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            author: receivedBy,
            note: `Mismatch detected on arrival. Declared: ${delivery.declaredDispatchQuantity}L, Measured: ${measuredQuantity}L. Shortfall/Variance: ${difference}L (${differencePercent}%).`,
          },
        ],
      };
      newDiscrepancyCases.unshift(newCase);

      // Notification to BMC Staff
      newNotifications.unshift({
        id: `NOTIF-DISC-BMC-${Date.now()}`,
        recipientRole: 'bmc',
        recipientId: delivery.bmcId,
        title: '⚠️ Quantity Mismatch Detected',
        message: `Delivery from ${delivery.boothName} has a discrepancy of ${difference.toFixed(2)} L. Investigation Case #${caseId} opened.`,
        type: 'discrepancy_alert',
        timestamp: 'Just now',
        isRead: false,
        linkRoute: '/(bmc)/investigations',
      });

      // Notification to Union Management
      newNotifications.unshift({
        id: `NOTIF-DISC-UNION-${Date.now()}`,
        recipientRole: 'union',
        title: '⚠️ Discrepancy Escalation Alert',
        message: `BMC reported a ${difference.toFixed(2)} L variance from ${delivery.boothName} (Case #${caseId}). Union audit flag active.`,
        type: 'union_escalation',
        timestamp: 'Just now',
        isRead: false,
        linkRoute: '/(union)/discrepancies',
      });
    } else {
      // Notification to Society that delivery matched and confirmed
      newNotifications.unshift({
        id: `NOTIF-MATCH-BOOTH-${Date.now()}`,
        recipientRole: 'booth',
        recipientId: delivery.boothId,
        title: 'Delivery Received & Matched',
        message: `BMC confirmed receipt of ${measuredQuantity.toFixed(2)} Litres without discrepancy.`,
        type: 'bmc_confirmation',
        timestamp: 'Just now',
        isRead: false,
      });
    }

    const updatedDelivery: BMCDelivery = {
      ...delivery,
      measuredReceivedQuantity: measuredQuantity,
      difference,
      receivedAt: new Date().toISOString(),
      receivedBy,
      status: isMismatch ? 'mismatch_investigation' : 'matched',
      discrepancyCaseId: caseId,
    };

    const updated = {
      ...state,
      bmcDeliveries: state.bmcDeliveries.map(d => d.id === deliveryId ? updatedDelivery : d),
      discrepancyCases: newDiscrepancyCases,
      notifications: newNotifications,
    };
    persistState(updated);

    // Sync to backend
    WorkflowApi.confirmBmcDelivery(deliveryId, {
      measuredReceivedQuantity: measuredQuantity,
      thresholdLitres: state.union.mismatchThresholdLitres,
      notes: isMismatch ? `Discrepancy: ${difference.toFixed(2)}L variance detected` : 'Delivery matched perfectly',
    }).catch(err => {
      console.log('[WorkflowApi] BMC Delivery confirmed locally. Offline/mock mode:', err?.message || err);
    });

    return { difference, isMismatch };
  }, [state, persistState]);

  const addInvestigationNote = useCallback((caseId: string, note: string, author: string, evidenceReference?: string) => {
    const updated = {
      ...state,
      discrepancyCases: state.discrepancyCases.map(c => c.id === caseId ? {
        ...c,
        investigationNotes: [
          ...c.investigationNotes,
          {
            id: `NOTE-${Date.now()}`,
            timestamp: new Date().toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
            author,
            note,
            evidenceReference,
          },
        ],
      } : c),
    };
    persistState(updated);
  }, [state, persistState]);

  const resolveDiscrepancyCase = useCallback((caseId: string, resolutionReason: string, resolvedBy: string) => {
    const targetCase = state.discrepancyCases.find(c => c.id === caseId);
    if (!targetCase) return;

    const updatedCases = state.discrepancyCases.map(c => c.id === caseId ? {
      ...c,
      status: 'resolved' as const,
      resolutionReason,
      resolvedAt: new Date().toISOString(),
      resolvedBy,
    } : c);

    const updatedDeliveries = state.bmcDeliveries.map(d => d.id === targetCase.bmcDeliveryId ? {
      ...d,
      status: 'resolved' as const,
    } : d);

    const newNotif: InAppNotification = {
      id: `NOTIF-RES-${Date.now()}`,
      recipientRole: 'union',
      title: 'Discrepancy Case Resolved',
      message: `Case #${caseId} resolved by ${resolvedBy}: ${resolutionReason}`,
      type: 'system',
      timestamp: 'Just now',
      isRead: false,
    };

    const updated = {
      ...state,
      discrepancyCases: updatedCases,
      bmcDeliveries: updatedDeliveries,
      notifications: [newNotif, ...state.notifications],
    };
    persistState(updated);

    WorkflowApi.updateDiscrepancy(caseId, 'resolve', { resolutionReason, resolvedByUserId: resolvedBy }).catch(err => {
      console.log('[WorkflowApi] Discrepancy resolved locally:', err?.message || err);
    });
  }, [state, persistState]);

  const escalateDiscrepancyCase = useCallback((caseId: string, reason: string) => {
    const targetCase = state.discrepancyCases.find(c => c.id === caseId);
    if (!targetCase) return;

    const updatedCases = state.discrepancyCases.map(c => c.id === caseId ? {
      ...c,
      status: 'escalated_to_union' as const,
      unionReviewNotes: reason,
    } : c);

    const updatedDeliveries = state.bmcDeliveries.map(d => d.id === targetCase.bmcDeliveryId ? {
      ...d,
      status: 'escalated_to_union' as const,
    } : d);

    const newNotif: InAppNotification = {
      id: `NOTIF-ESC-${Date.now()}`,
      recipientRole: 'union',
      title: '⚠️ Urgent Discrepancy Escalated',
      message: `Case #${caseId} escalated to Union GM for formal inquiry: ${reason}`,
      type: 'union_escalation',
      timestamp: 'Just now',
      isRead: false,
      linkRoute: '/(union)/discrepancies',
    };

    const updated = {
      ...state,
      discrepancyCases: updatedCases,
      bmcDeliveries: updatedDeliveries,
      notifications: [newNotif, ...state.notifications],
    };
    persistState(updated);

    WorkflowApi.updateDiscrepancy(caseId, 'escalate', { reason }).catch(err => {
      console.log('[WorkflowApi] Discrepancy escalated locally:', err?.message || err);
    });
  }, [state, persistState]);

  const createBmcReceipt = useCallback((
    bmcId: string, 
    unionId: string, 
    collectionDate: string, 
    includedDeliveryIds: string[], 
    createdBy: string,
    options?: {
      reportingPeriodType?: 'daily' | 'monthly' | 'custom';
      periodStartDate?: string;
      periodEndDate?: string;
      totalRecordedIncome?: number;
      supervisorNotes?: string;
      societySummaries?: any[];
    }
  ): BMCReceipt => {
    const bmc = state.bmcs.find(b => b.id === bmcId);
    const deliveries = state.bmcDeliveries.filter(d => includedDeliveryIds.includes(d.id));

    const totalDeclared = deliveries.reduce((sum, d) => sum + d.declaredDispatchQuantity, 0);
    const totalReceived = deliveries.reduce((sum, d) => sum + (d.measuredReceivedQuantity || 0), 0);
    const netDifference = parseFloat((totalDeclared - totalReceived).toFixed(2));

    const unresolvedCount = deliveries.filter(d => d.status === 'mismatch_investigation' || d.status === 'escalated_to_union').length;

    const receiptId = `BMCR-${collectionDate.replace(/-/g, '')}-${String(state.bmcReceipts.length + 1).padStart(3, '0')}`;
    const verificationCode = `BMCR-VER-${Math.floor(100000 + Math.random() * 900000)}`;

    const newReceipt: BMCReceipt = {
      id: receiptId,
      bmcId,
      bmcName: bmc?.name || 'Aavin BMC',
      unionId,
      collectionDate,
      includedDeliveryIds,
      totalBoothsCount: options?.societySummaries?.length || deliveries.length,
      totalDeclaredQuantity: parseFloat(totalDeclared.toFixed(2)),
      totalReceivedQuantity: parseFloat(totalReceived.toFixed(2)),
      netDifference,
      hasDiscrepancies: unresolvedCount > 0,
      unresolvedCasesCount: unresolvedCount,
      createdAt: new Date().toISOString(),
      createdBy,
      status: 'draft',
      verificationCode,
      reportingPeriodType: options?.reportingPeriodType || 'daily',
      periodStartDate: options?.periodStartDate,
      periodEndDate: options?.periodEndDate,
      totalRecordedIncome: options?.totalRecordedIncome,
      supervisorNotes: options?.supervisorNotes,
      societySummaries: options?.societySummaries,
    };

    const updated = {
      ...state,
      bmcReceipts: [newReceipt, ...state.bmcReceipts],
    };
    persistState(updated);
    return newReceipt;
  }, [state, persistState]);

  const sendBmcReceiptToUnion = useCallback((receiptId: string) => {
    const receipt = state.bmcReceipts.find(r => r.id === receiptId);
    if (!receipt) return;

    const newNotification: InAppNotification = {
      id: `NOTIF-BMCR-UNION-${Date.now()}`,
      recipientRole: 'union',
      title: 'New BMC Daily Receipt Submitted',
      message: `${receipt.bmcName} submitted daily collection receipt #${receipt.id} (${receipt.totalReceivedQuantity}L). Awaiting Union review.`,
      type: 'system',
      timestamp: 'Just now',
      isRead: false,
      linkRoute: '/(union)/receipt-review',
    };

    const updated = {
      ...state,
      bmcReceipts: state.bmcReceipts.map(r => r.id === receiptId ? { ...r, status: 'sent_to_union' as const } : r),
      notifications: [newNotification, ...state.notifications],
    };
    persistState(updated);
  }, [state, persistState]);

  const addSocietyIncomeRecord = useCallback((recordData: Omit<SocietyIncomeRecord, 'id' | 'createdAt'>): SocietyIncomeRecord => {
    const id = `INC-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const createdAt = new Date().toISOString();
    const newRecord: SocietyIncomeRecord = {
      ...recordData,
      id,
      createdAt,
      auditTrail: [
        {
          timestamp: createdAt,
          user: recordData.enteredBy,
          action: 'Income record created',
        },
        ...(recordData.auditTrail || [])
      ]
    };
    const updated = {
      ...state,
      societyIncomeRecords: [newRecord, ...(state.societyIncomeRecords || [])],
    };
    persistState(updated);

    WorkflowApi.recordSocietyIncome(newRecord).catch(err => {
      console.log('[WorkflowApi] Income record synced locally:', err?.message || err);
    });

    return newRecord;
  }, [state, persistState]);

  const submitBmcConsolidatedReport = useCallback((reportData: {
    bmcId: string;
    reportingPeriodType: 'daily' | 'monthly' | 'custom';
    collectionDate: string;
    periodStartDate?: string;
    periodEndDate?: string;
    includedDeliveryIds: string[];
    totalDeclaredQuantity: number;
    totalReceivedQuantity: number;
    totalRecordedIncome: number;
    totalAmountReceived?: number;
    totalAmountPending?: number;
    societySummaries: Array<{
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
    createdBy: string;
  }): BMCReceipt => {
    const bmc = state.bmcs.find(b => b.id === reportData.bmcId);
    const receiptId = `BMCR-${reportData.collectionDate.replace(/-/g, '')}-${String(state.bmcReceipts.length + 1).padStart(3, '0')}`;
    const verificationCode = `BMCR-VER-${Math.floor(100000 + Math.random() * 900000)}`;

    const netDifference = parseFloat((reportData.totalDeclaredQuantity - reportData.totalReceivedQuantity).toFixed(2));
    const unresolvedCount = reportData.societySummaries.reduce((sum, s) => sum + (s.discrepancyCount || 0), 0);

    const newReceipt: BMCReceipt = {
      id: receiptId,
      bmcId: reportData.bmcId,
      bmcName: bmc?.name || 'Aavin BMC',
      unionId: state.union.id || 'UNION001',
      collectionDate: reportData.collectionDate,
      includedDeliveryIds: reportData.includedDeliveryIds,
      totalBoothsCount: reportData.societySummaries.length,
      totalDeclaredQuantity: parseFloat(reportData.totalDeclaredQuantity.toFixed(2)),
      totalReceivedQuantity: parseFloat(reportData.totalReceivedQuantity.toFixed(2)),
      netDifference,
      hasDiscrepancies: unresolvedCount > 0,
      unresolvedCasesCount: unresolvedCount,
      createdAt: new Date().toISOString(),
      createdBy: reportData.createdBy,
      status: 'sent_to_union',
      verificationCode,
      reportingPeriodType: reportData.reportingPeriodType,
      periodStartDate: reportData.periodStartDate,
      periodEndDate: reportData.periodEndDate,
      totalRecordedIncome: parseFloat(reportData.totalRecordedIncome.toFixed(2)),
      totalAmountReceived: reportData.totalAmountReceived ? parseFloat(reportData.totalAmountReceived.toFixed(2)) : undefined,
      totalAmountPending: reportData.totalAmountPending ? parseFloat(reportData.totalAmountPending.toFixed(2)) : undefined,
      societySummaries: reportData.societySummaries,
      supervisorNotes: reportData.supervisorNotes,
      revisionNumber: 1,
    };

    const newNotification: InAppNotification = {
      id: `NOTIF-CONSOL-UNION-${Date.now()}`,
      recipientRole: 'union',
      title: 'Consolidated BMC Report Submitted',
      message: `${bmc?.name || 'BMC'} submitted consolidated report #${receiptId} (${reportData.totalReceivedQuantity}L, ₹${reportData.totalRecordedIncome.toLocaleString('en-IN')}) for Union approval.`,
      type: 'system',
      timestamp: 'Just now',
      isRead: false,
      linkRoute: '/(union)/receipt-review',
    };

    const updated = {
      ...state,
      bmcReceipts: [newReceipt, ...state.bmcReceipts],
      notifications: [newNotification, ...state.notifications],
    };
    persistState(updated);

    WorkflowApi.submitBmcConsolidatedReport(newReceipt).catch(err => {
      console.log('[WorkflowApi] Consolidated report synced locally:', err?.message || err);
    });

    return newReceipt;
  }, [state, persistState]);

  const updateBmcReportStatus = useCallback((reportId: string, status: BMCReportStatus, reviewNotes?: string, reviewer?: string) => {
    const report = state.bmcReceipts.find(r => r.id === reportId);
    if (!report) return;

    const updatedReceipts = state.bmcReceipts.map(r => r.id === reportId ? {
      ...r,
      status,
      unionReviewNotes: reviewNotes || r.unionReviewNotes,
      reviewedBy: reviewer || r.reviewedBy,
      reviewedAt: new Date().toISOString(),
    } : r);

    const statusTitles: Record<BMCReportStatus, string> = {
      draft: 'Report Saved as Draft',
      sent_to_union: 'Report Dispatched to Union',
      under_review: 'Union Review Underway',
      reviewed_by_union: '✅ Union Approved BMC Report',
      returned_for_correction: '⚠️ Report Returned for Correction',
    };

    const notif: InAppNotification = {
      id: `NOTIF-STATUS-BMC-${Date.now()}`,
      recipientRole: 'bmc',
      recipientId: report.bmcId,
      title: statusTitles[status] || 'Report Status Updated',
      message: `Consolidated Report #${reportId} status updated to "${status.replace(/_/g, ' ').toUpperCase()}". ${reviewNotes ? `Notes: ${reviewNotes}` : ''}`,
      type: status === 'returned_for_correction' ? 'discrepancy_alert' : 'system',
      timestamp: 'Just now',
      isRead: false,
      linkRoute: '/(bmc)/submit-union-report',
    };

    const updated = {
      ...state,
      bmcReceipts: updatedReceipts,
      notifications: [notif, ...state.notifications],
    };
    persistState(updated);
  }, [state, persistState]);

  // 6. Union Actions
  const reviewBmcReceipt = useCallback((receiptId: string, reviewNotes: string, reviewedBy: string, status?: BMCReportStatus) => {
    const finalStatus: BMCReportStatus = status || 'reviewed_by_union';
    const report = state.bmcReceipts.find(r => r.id === receiptId);
    
    const updatedReceipts = state.bmcReceipts.map(r => r.id === receiptId ? {
      ...r,
      status: finalStatus,
      unionReviewNotes: reviewNotes,
      reviewedBy,
      reviewedAt: new Date().toISOString(),
    } : r);

    const newNotification: InAppNotification = {
      id: `NOTIF-REV-BMC-${Date.now()}`,
      recipientRole: 'bmc',
      recipientId: report?.bmcId,
      title: finalStatus === 'returned_for_correction' ? '⚠️ Report Returned for Correction' : '✅ Report Approved by Union',
      message: `Union GM has reviewed report #${receiptId}. Decision: ${finalStatus.toUpperCase()}. Notes: ${reviewNotes}`,
      type: finalStatus === 'returned_for_correction' ? 'discrepancy_alert' : 'system',
      timestamp: 'Just now',
      isRead: false,
      linkRoute: '/(bmc)/submit-union-report',
    };

    const updated = {
      ...state,
      bmcReceipts: updatedReceipts,
      notifications: [newNotification, ...state.notifications],
    };
    persistState(updated);

    WorkflowApi.reviewUnionReceipt(receiptId, reviewNotes).catch(err => {
      console.log('[WorkflowApi] Union review saved locally:', err?.message || err);
    });
  }, [state, persistState]);

  const updateUnionThresholds = useCallback((litres: number, percent: number) => {
    const updated = {
      ...state,
      union: {
        ...state.union,
        mismatchThresholdLitres: litres,
        mismatchThresholdPercent: percent,
      },
    };
    persistState(updated);
  }, [state, persistState]);

  // 7. Notification Actions
  const markNotificationAsRead = useCallback((notificationId: string) => {
    const updated = {
      ...state,
      notifications: state.notifications.map(n => n.id === notificationId ? { ...n, isRead: true } : n),
    };
    persistState(updated);
  }, [state, persistState]);

  const markAllNotificationsAsRead = useCallback((role?: UserRole) => {
    const updated = {
      ...state,
      notifications: state.notifications.map(n => 
        (!role || n.recipientRole === role) ? { ...n, isRead: true } : n
      ),
    };
    persistState(updated);
  }, [state, persistState]);

  // 8. Demo Data Reset
  const resetDemoData = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEY,
        '@aavin_smart_cattle_passport_state_v2',
        '@aavin_smart_cattle_passport_state_v1',
      ]);
      setState(initialSeedState);
    } catch (err) {
      console.warn('Failed to reset demo state:', err);
    }
  }, []);

  // 9. Selectors
  const getFarmerStats = useCallback((farmerId: string) => {
    const farmerRecords = state.milkRecords.filter(r => r.farmerId === farmerId);
    const today = '2026-10-12';
    
    // Today's
    const todaySupply = farmerRecords
      .filter(r => r.collectionDate === today)
      .reduce((sum, r) => sum + r.quantityLitres, 0);

    // Month (2026-10)
    const monthSupply = farmerRecords
      .filter(r => r.collectionDate.startsWith('2026-10'))
      .reduce((sum, r) => sum + r.quantityLitres, 0);

    // Last 7 days
    const last7DaysSupply = farmerRecords
      .slice(0, 14) // sample
      .reduce((sum, r) => sum + r.quantityLitres, 0);

    const farmerCows = state.cows.filter(c => c.farmerId === farmerId);
    const hasActiveWithdrawal = farmerCows.some(c => c.activeWithdrawal?.hasActiveWithdrawal);

    return {
      todaySupply: parseFloat(todaySupply.toFixed(2)),
      last7DaysSupply: parseFloat(last7DaysSupply.toFixed(2)),
      monthSupply: parseFloat(monthSupply.toFixed(2)),
      cowsCount: farmerCows.length,
      hasActiveWithdrawal,
    };
  }, [state]);

  const getBoothStats = useCallback((boothId: string) => {
    const today = '2026-10-12';
    const records = state.milkRecords.filter(r => r.boothId === boothId && r.collectionDate === today);

    const farmerWiseRecords = records.filter(r => r.measurementMethod === 'farmer_wise');
    const combinedRecords = records.filter(r => r.measurementMethod === 'combined');

    const farmerWiseTotal = farmerWiseRecords.reduce((sum, r) => sum + r.quantityLitres, 0);
    const vendorCombinedTotal = combinedRecords.reduce((sum, r) => sum + r.quantityLitres, 0);
    const eligibleReceiptTotal = farmerWiseTotal + vendorCombinedTotal;

    const uniqueFarmers = new Set(farmerWiseRecords.map(r => r.farmerId).filter(Boolean));
    const assignedFarmers = state.farmers.filter(f => f.assignedBoothId === boothId);

    return {
      todayTotal: parseFloat(eligibleReceiptTotal.toFixed(2)),
      farmersAttended: uniqueFarmers.size,
      expectedFarmersCount: assignedFarmers.length,
      vendorCombinedTotal: parseFloat(vendorCombinedTotal.toFixed(2)),
      farmerWiseTotal: parseFloat(farmerWiseTotal.toFixed(2)),
      eligibleReceiptTotal: parseFloat(eligibleReceiptTotal.toFixed(2)),
    };
  }, [state]);

  const getBmcStats = useCallback((bmcId: string) => {
    const assignedBooths = state.booths.filter(b => b.assignedBmcId === bmcId);
    const assignedBoothIds = assignedBooths.map(b => b.id);

    // Active vs Inactive societies: active if they have milk records or deliveries
    const activeBoothSet = new Set<string>();
    state.milkRecords.forEach(r => {
      if (assignedBoothIds.includes(r.boothId)) activeBoothSet.add(r.boothId);
    });
    state.bmcDeliveries.forEach(d => {
      if (d.bmcId === bmcId) activeBoothSet.add(d.boothId);
    });
    const registeredBoothsCount = assignedBooths.length;
    const activeBoothsCount = Math.max(1, activeBoothSet.size);
    const inactiveBoothsCount = Math.max(0, registeredBoothsCount - activeBoothsCount);

    const deliveries = state.bmcDeliveries.filter(d => d.bmcId === bmcId);
    const pendingDeliveries = deliveries.filter(d => d.status === 'pending_arrival');
    const confirmedDeliveries = deliveries.filter(d => d.status !== 'pending_arrival');

    // Today's milk collected at societies
    const today = '2026-10-12';
    const todayCollected = state.milkRecords
      .filter(r => assignedBoothIds.includes(r.boothId) && r.collectionDate === today)
      .reduce((sum, r) => sum + r.quantityLitres, 0);

    const todayDeclared = deliveries.reduce((sum, d) => sum + d.declaredDispatchQuantity, 0);
    const todayReceived = confirmedDeliveries.reduce((sum, d) => sum + (d.measuredReceivedQuantity || 0), 0);
    const totalDifference = confirmedDeliveries.reduce((sum, d) => sum + (d.difference || 0), 0);

    // Total milk dispatched / reported to union
    const bmcReceiptsList = state.bmcReceipts.filter(r => r.bmcId === bmcId);
    const submittedReceipts = bmcReceiptsList.filter(r => r.status === 'sent_to_union' || r.status === 'under_review' || r.status === 'reviewed_by_union');
    const todayDispatchedToUnion = submittedReceipts.reduce((sum, r) => sum + r.totalReceivedQuantity, 0);

    // Financial totals
    const bmcIncomeRecords = (state.societyIncomeRecords || []).filter(inc => inc.bmcId === bmcId || assignedBoothIds.includes(inc.societyId));
    const totalRecordedIncome = bmcIncomeRecords.reduce((sum, inc) => sum + inc.amountInr, 0);

    const totalSubmittedToUnionIncome = submittedReceipts.reduce((sum, r) => sum + (r.totalRecordedIncome || 0), 0);

    const reportsAwaitingUnionCount = bmcReceiptsList.filter(r => r.status === 'sent_to_union' || r.status === 'under_review').length;

    const activeDiscrepancies = state.discrepancyCases.filter(
      c => c.bmcId === bmcId && (c.status === 'open' || c.status === 'under_investigation' || c.status === 'escalated_to_union')
    );
    const resolvedDiscrepancies = state.discrepancyCases.filter(
      c => c.bmcId === bmcId && c.status === 'resolved'
    );

    return {
      registeredBoothsCount,
      activeBoothsCount,
      inactiveBoothsCount,
      todayCollected: parseFloat(todayCollected.toFixed(2)),
      todayDeclared: parseFloat(todayDeclared.toFixed(2)),
      todayReceived: parseFloat(todayReceived.toFixed(2)),
      todayDispatchedToUnion: parseFloat(todayDispatchedToUnion.toFixed(2)),
      totalDifference: parseFloat(totalDifference.toFixed(2)),
      totalRecordedIncome: parseFloat(totalRecordedIncome.toFixed(2)),
      totalSubmittedToUnionIncome: parseFloat(totalSubmittedToUnionIncome.toFixed(2)),
      pendingDeliveriesCount: pendingDeliveries.length,
      reportsAwaitingUnionCount,
      activeDiscrepanciesCount: activeDiscrepancies.length,
      resolvedDiscrepanciesCount: resolvedDiscrepancies.length,
    };
  }, [state]);

  const getSocietyDetailedStats = useCallback((societyId: string, period?: string) => {
    const today = '2026-10-12';
    const societyRecords = state.milkRecords.filter(r => r.boothId === societyId);
    const deliveries = state.bmcDeliveries.filter(d => d.boothId === societyId);
    const incomeRecords = (state.societyIncomeRecords || []).filter(i => i.societyId === societyId);
    const activeDiscrepancies = state.discrepancyCases.filter(
      c => c.boothId === societyId && (c.status === 'open' || c.status === 'under_investigation' || c.status === 'escalated_to_union')
    );

    // Group milk by day to compute daily metrics
    const dailyMap: Record<string, number> = {};
    societyRecords.forEach(r => {
      dailyMap[r.collectionDate] = (dailyMap[r.collectionDate] || 0) + r.quantityLitres;
    });
    const dailyTotals = Object.values(dailyMap);

    const dailyMilkRaw = dailyMap[today] || 0;
    const latestDeliveryToday = deliveries.find(d => d.collectionDate === today);
    const dailyMilk = dailyMilkRaw > 0 ? dailyMilkRaw : (latestDeliveryToday?.measuredReceivedQuantity || latestDeliveryToday?.declaredDispatchQuantity || 0);

    const monthlyFromRecords = societyRecords
      .filter(r => r.collectionDate.startsWith('2026-10'))
      .reduce((sum, r) => sum + r.quantityLitres, 0);
    const monthlyFromDeliveries = deliveries
      .filter(d => d.collectionDate.startsWith('2026-10'))
      .reduce((sum, d) => sum + (d.measuredReceivedQuantity || d.declaredDispatchQuantity || 0), 0);
    const monthlyTotalMilk = monthlyFromRecords > 0 ? monthlyFromRecords : (monthlyFromDeliveries > 0 ? monthlyFromDeliveries : dailyMilk * 26);

    const yearlyFromRecords = societyRecords
      .filter(r => r.collectionDate.startsWith('2026'))
      .reduce((sum, r) => sum + r.quantityLitres, 0);
    const yearlyFromDeliveries = deliveries
      .filter(d => d.collectionDate.startsWith('2026'))
      .reduce((sum, d) => sum + (d.measuredReceivedQuantity || d.declaredDispatchQuantity || 0), 0);
    const yearlyTotalMilk = yearlyFromRecords > 0 ? yearlyFromRecords : (yearlyFromDeliveries > 0 ? yearlyFromDeliveries : monthlyTotalMilk * 8.5);

    const avgDailyQuantity = dailyTotals.length > 0
      ? dailyTotals.reduce((a, b) => a + b, 0) / dailyTotals.length
      : (dailyMilk > 0 ? dailyMilk : (monthlyTotalMilk / 30));
    const highestDailyQuantity = dailyTotals.length > 0 ? Math.max(...dailyTotals) : (dailyMilk * 1.15);
    const lowestDailyQuantity = dailyTotals.length > 0 ? Math.min(...dailyTotals) : (dailyMilk * 0.88);

    const quantityReceivedByBmc = deliveries
      .filter(d => d.measuredReceivedQuantity !== undefined)
      .reduce((sum, d) => sum + (d.measuredReceivedQuantity || 0), 0);

    const totalDeclared = deliveries.reduce((sum, d) => sum + d.declaredDispatchQuantity, 0);
    const differenceLitres = parseFloat((totalDeclared - quantityReceivedByBmc).toFixed(2));

    // Missing records count: days in period with 0 records (e.g. out of last 7 days)
    const expectedDays = ['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12'];
    const missingRecordsCount = expectedDays.filter(d => !dailyMap[d]).length;

    // Financial totals
    const totalRecordedIncome = incomeRecords.reduce((sum, i) => sum + i.amountInr, 0);
    const paymentsReceived = incomeRecords
      .filter(i => i.status === 'verified' || i.category === 'procurement_payment')
      .reduce((sum, i) => sum + i.amountInr, 0);
    const paymentsPending = incomeRecords
      .filter(i => i.status === 'recorded')
      .reduce((sum, i) => sum + i.amountInr, 0);

    // Amount reported to Union through submitted receipts
    const relevantReceipts = state.bmcReceipts.filter(r => 
      r.status === 'sent_to_union' || r.status === 'under_review' || r.status === 'reviewed_by_union'
    );
    let amountReportedToUnion = 0;
    relevantReceipts.forEach(r => {
      const match = r.societySummaries?.find(s => s.societyId === societyId);
      if (match) amountReportedToUnion += match.recordedIncome;
    });

    const latestSubmissionDate = deliveries.length > 0
      ? deliveries[0].collectionDate
      : societyRecords.length > 0 ? societyRecords[0].collectionDate : 'None';

    const reconciliationStatus: 'reconciled' | 'variance' | 'pending' = 
      deliveries.length === 0 ? 'pending' : (activeDiscrepancies.length > 0 || Math.abs(differenceLitres) > 5 ? 'variance' : 'reconciled');

    return {
      dailyMilk: parseFloat(dailyMilk.toFixed(2)),
      monthlyTotalMilk: parseFloat(monthlyTotalMilk.toFixed(2)),
      yearlyTotalMilk: parseFloat(yearlyTotalMilk.toFixed(2)),
      avgDailyQuantity: parseFloat(avgDailyQuantity.toFixed(2)),
      highestDailyQuantity: parseFloat(highestDailyQuantity.toFixed(2)),
      lowestDailyQuantity: parseFloat(lowestDailyQuantity.toFixed(2)),
      quantityReceivedByBmc: parseFloat(quantityReceivedByBmc.toFixed(2)),
      differenceLitres,
      missingRecordsCount,
      unresolvedDiscrepanciesCount: activeDiscrepancies.length,
      totalRecordedIncome: parseFloat(totalRecordedIncome.toFixed(2)),
      paymentsReceived: parseFloat(paymentsReceived.toFixed(2)),
      paymentsPending: parseFloat(paymentsPending.toFixed(2)),
      amountReportedToUnion: parseFloat(amountReportedToUnion.toFixed(2)),
      latestSubmissionDate,
      reconciliationStatus,
      isActive: dailyTotals.length > 0 || deliveries.length > 0,
    };
  }, [state]);

  const getUnionStats = useCallback(() => {
    const totalBoothDispatched = state.boothReceipts.reduce((sum, r) => sum + r.dispatchQuantity, 0);
    const totalBmcReceived = state.bmcDeliveries
      .filter(d => d.measuredReceivedQuantity !== undefined)
      .reduce((sum, d) => sum + (d.measuredReceivedQuantity || 0), 0);

    const totalReportedByBmcReceipts = state.bmcReceipts.reduce((sum, r) => sum + r.totalReceivedQuantity, 0);
    const pendingReceiptsCount = state.bmcReceipts.filter(r => r.status === 'sent_to_union').length;

    const activeDiscrepanciesCount = state.discrepancyCases.filter(
      c => c.status === 'open' || c.status === 'under_investigation' || c.status === 'escalated_to_union'
    ).length;
    const resolvedDiscrepanciesCount = state.discrepancyCases.filter(c => c.status === 'resolved').length;

    return {
      totalBoothDispatched: parseFloat(totalBoothDispatched.toFixed(2)),
      totalBmcReceived: parseFloat(totalBmcReceived.toFixed(2)),
      totalReportedByBmcReceipts: parseFloat(totalReportedByBmcReceipts.toFixed(2)),
      pendingReceiptsCount,
      activeDiscrepanciesCount,
      resolvedDiscrepanciesCount,
    };
  }, [state]);

  return (
    <AavinStoreContext.Provider
      value={{
        ...state,
        isLoading,
        addFarmer,
        updateFarmer,
        verifyFarmer,
        addCow,
        updateCow,
        verifyCow,
        addMedicalRecord,
        addVaccinationRecord,
        addInseminationRecord,
        addTreatmentRecord,
        recordMilk,
        updateMilkRecord,
        createBoothReceipt,
        sendBoothReceiptToBmc,
        receiveBmcDelivery,
        addInvestigationNote,
        resolveDiscrepancyCase,
        escalateDiscrepancyCase,
        createBmcReceipt,
        sendBmcReceiptToUnion,
        addSocietyIncomeRecord,
        submitBmcConsolidatedReport,
        updateBmcReportStatus,
        reviewBmcReceipt,
        updateUnionThresholds,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        resetDemoData,
        getFarmerStats,
        getBoothStats,
        getBmcStats,
        getSocietyDetailedStats,
        getUnionStats,
      }}
    >
      {children}
    </AavinStoreContext.Provider>
  );
};

export const useAavinStore = () => {
  const context = useContext(AavinStoreContext);
  if (!context) {
    throw new Error('useAavinStore must be used within an AavinStoreProvider');
  }
  return context;
};
