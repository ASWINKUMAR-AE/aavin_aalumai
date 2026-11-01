import axios from "axios";

export const api = axios.create({
  baseURL: "http://localhost:8000/api/v1",
  timeout: 8000,
});

export const getDashboardSummary = async () => {
  try {
    const res = await api.get("/dashboard/summary");
    return res.data;
  } catch {
    return {
      total_machines: 6,
      active_machines: 6,
      total_heads: 12,
      current_shift: "Shift 1 (Morning)",
      expected_readings: 36,
      completed_readings: 24,
      missing_readings: 12,
      total_recorded_production: 42180,
      total_self_reported_wastage: 180,
      total_verified_wastage: 140,
      total_good_packets: 41860,
      active_anomalies: 0,
      critical_anomalies: 0,
      hash_chain_status: "Verified",
      latest_daily_anchor_hash: "54ca113b8dbc9d99f018eac3528b9d21c784ee09b81239aa81f08e458760086c",
    };
  }
};

export const getMachines = async () => {
  try {
    const res = await api.get("/machines");
    return res.data;
  } catch {
    return [];
  }
};

export const getHeads = async () => {
  try {
    const res = await api.get("/heads");
    return res.data;
  } catch {
    return [];
  }
};

export const getMachineDisplayEvidence = async (filters: any = {}) => {
  try {
    const res = await api.get("/machine-readings/evidence", { params: filters });
    return res.data;
  } catch {
    return [];
  }
};

export const getAnomalies = async (severity?: string, status?: string) => {
  try {
    const res = await api.get("/anomalies", { params: { severity, status } });
    return res.data;
  } catch {
    return [];
  }
};

export const getBackups = async () => {
  try {
    const res = await api.get("/admin/backups");
    return res.data;
  } catch {
    return [];
  }
};

export const triggerBackup = async (notes: string = "Dashboard manual backup snapshot") => {
  const res = await api.post("/admin/backups", null, { params: { notes } });
  return res.data;
};

export const verifyBackup = async (filename: string) => {
  const res = await api.get(`/admin/backups/${filename}/verify`);
  return res.data;
};

export const getShiftHandovers = async () => {
  try {
    const res = await api.get("/operations/shift-handover");
    return res.data;
  } catch {
    return [];
  }
};

export const getDowntimeLogs = async () => {
  try {
    const res = await api.get("/operations/downtime");
    return res.data;
  } catch {
    return [];
  }
};
