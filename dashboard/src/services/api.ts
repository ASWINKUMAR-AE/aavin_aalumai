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
      total_machines: 7,
      active_machines: 7,
      total_heads: 14,
      current_shift: "Shift 1 (Morning)",
      expected_readings: 42,
      completed_readings: 24,
      missing_readings: 18,
      total_recorded_production: 42180,
      total_self_reported_wastage: 180,
      total_verified_wastage: 140,
      total_good_packets: 41860,
      active_anomalies: 2,
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
