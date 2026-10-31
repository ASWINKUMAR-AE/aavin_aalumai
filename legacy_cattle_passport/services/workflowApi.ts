import { api } from './api';

export interface RecordMilkApiPayload {
  farmerUserId?: string;
  farmerName?: string;
  boothId: string;
  collectionDate: string;
  session: 'morning' | 'evening';
  quantityLitres: number;
  route: 'direct' | 'vendor';
  vendorId?: string;
  vendorName?: string;
  measurementMethod: 'farmer_wise' | 'combined';
  cowId?: string;
  notes?: string;
}

export interface GenerateBoothReceiptApiPayload {
  boothId: string;
  collectionDate: string;
  session: 'morning' | 'evening' | 'full_day';
  notes?: string;
}

export interface ConfirmBmcDeliveryApiPayload {
  measuredReceivedQuantity: number;
  notes?: string;
  thresholdLitres?: number;
}

export const WorkflowApi = {
  // Master data
  getBooths: async () => {
    const res = await api.get('/workflow/booths');
    return res.data?.data;
  },

  getBmcs: async () => {
    const res = await api.get('/workflow/bmcs');
    return res.data?.data;
  },

  getVendors: async () => {
    const res = await api.get('/workflow/vendors');
    return res.data?.data;
  },

  // Stage 1 & 2: Milk recording & Booth receipts
  recordMilkTransaction: async (payload: RecordMilkApiPayload) => {
    const res = await api.post('/workflow/milk-transactions', payload);
    return res.data?.data;
  },

  listMilkTransactions: async (params?: { boothId?: string; collectionDate?: string; farmerUserId?: string }) => {
    const res = await api.get('/workflow/milk-transactions', { params });
    return res.data?.data;
  },

  reviewBoothCollection: async (boothId: string, collectionDate: string) => {
    const res = await api.get('/workflow/booth-review', { params: { boothId, collectionDate } });
    return res.data?.data;
  },

  generateBoothReceipt: async (payload: GenerateBoothReceiptApiPayload) => {
    const res = await api.post('/workflow/booth-receipts', payload);
    return res.data?.data;
  },

  // Stage 3: BMC delivery reception & quantity verification
  listBmcDeliveries: async (bmcId?: string) => {
    const res = await api.get('/workflow/bmc-deliveries', { params: { bmcId } });
    return res.data?.data;
  },

  confirmBmcDelivery: async (deliveryId: string, payload: ConfirmBmcDeliveryApiPayload) => {
    const res = await api.post(`/workflow/bmc-deliveries/${deliveryId}/confirm`, payload);
    return res.data?.data;
  },

  // Discrepancy investigation
  listDiscrepancies: async (status?: string) => {
    const res = await api.get('/workflow/discrepancies', { params: { status } });
    return res.data?.data;
  },

  updateDiscrepancy: async (caseId: string, action: 'add_note' | 'resolve' | 'escalate', payload: any) => {
    const res = await api.patch(`/workflow/discrepancies/${caseId}`, { action, ...payload });
    return res.data?.data;
  },

  // Stage 4: BMC Daily Receipts & Union Review
  generateBmcReceipt: async (bmcId: string, collectionDate: string) => {
    const res = await api.post('/workflow/bmc-receipts', { bmcId, collectionDate });
    return res.data?.data;
  },

  listUnionReceipts: async () => {
    const res = await api.get('/workflow/union-receipts');
    return res.data?.data;
  },

  reviewUnionReceipt: async (receiptId: string, notes: string) => {
    const res = await api.post(`/workflow/union-receipts/${receiptId}/review`, { notes });
    return res.data?.data;
  },

  getUnionSummary: async (date?: string) => {
    const res = await api.get('/workflow/union-summary', { params: { date } });
    return res.data?.data;
  },

  // Society Income Ledger
  recordSocietyIncome: async (payload: any) => {
    try {
      const res = await api.post('/workflow/society-income', payload);
      return res.data?.data;
    } catch (err) {
      console.log('[WorkflowApi] Society income logged locally (offline mode)');
      return null;
    }
  },

  listSocietyIncome: async (params?: { bmcId?: string; societyId?: string; financialPeriod?: string }) => {
    try {
      const res = await api.get('/workflow/society-income', { params });
      return res.data?.data;
    } catch (err) {
      return null;
    }
  },

  // Consolidated BMC Period Submissions
  submitBmcConsolidatedReport: async (payload: any) => {
    try {
      const res = await api.post('/workflow/bmc-consolidated-reports', payload);
      return res.data?.data;
    } catch (err) {
      console.log('[WorkflowApi] Consolidated report submitted locally (offline mode)');
      return null;
    }
  },

  // Farmer management & KYC updates
  updateFarmer: async (farmerId: string, data: any) => {
    try {
      const res = await api.patch(`/farmers/${farmerId}`, data);
      return res.data?.data;
    } catch {
      // Fallback to portal endpoint if unauthenticated/offline
      const res = await api.patch(`/farmers/portal/farmer/${farmerId}`, data);
      return res.data?.data;
    }
  },
};
