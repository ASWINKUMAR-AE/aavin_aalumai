import React, { useState } from "react";
import { AlertTriangle, ShieldAlert, CheckCircle, Clock, FileText } from "lucide-react";

const ANOMALIES_DATA = [
  {
    id: "ANOM-2026-091",
    machine: "RMC-01",
    head: "RMC-01-H2",
    type: "excessive_rate",
    severity: "High",
    description: "Calculated production rate of 3,840 pkts/hr exceeds head rated limit of 3,000 pkts/hr",
    timestamp: "2026-10-31 11:30:15 IST",
    status: "active",
    reviewer: "Unassigned",
  },
  {
    id: "ANOM-2026-090",
    machine: "SAMARPAN-01",
    head: "SAMARPAN-01-H1",
    type: "ocr_mismatch",
    severity: "Medium",
    description: "Worker confirmed value 312,480 diverges from ML Kit OCR output 312,450",
    timestamp: "2026-10-31 09:15:40 IST",
    status: "investigating",
    reviewer: "Venkatesh R. (Supervisor)",
  },
  {
    id: "ANOM-2026-088",
    machine: "ATOMIC-01",
    head: "ATOMIC-01-H1",
    type: "late_reading",
    severity: "Low",
    description: "Shift boundary reading captured 24 minutes after slot window close",
    timestamp: "2026-10-30 22:24:00 IST",
    status: "resolved",
    reviewer: "Venkatesh R. (Supervisor)",
  },
];

export const AnomaliesPage: React.FC = () => {
  const [filter, setFilter] = useState("all");

  const filtered = ANOMALIES_DATA.filter((a) => {
    if (filter === "all") return true;
    return a.status === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Plant Production Anomalies</h2>
          <p className="text-xs text-slate-500">Immutable record of negative deltas, unwitnessed resets, rate spikes, and time drift</p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          {["all", "active", "investigating", "resolved"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 rounded-lg font-bold capitalize transition-colors ${
                filter === tab
                  ? "bg-slate-900 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-4">Anomaly ID</th>
              <th className="p-4">Severity</th>
              <th className="p-4">Type</th>
              <th className="p-4">Head / Machine</th>
              <th className="p-4">Description</th>
              <th className="p-4">Timestamp</th>
              <th className="p-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50">
                <td className="p-4 font-mono font-bold text-slate-900">{item.id}</td>
                <td className="p-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                      item.severity === "Critical"
                        ? "bg-rose-100 text-rose-800"
                        : item.severity === "High"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {item.severity.toUpperCase()}
                  </span>
                </td>
                <td className="p-4 font-mono text-slate-700 font-bold">{item.type}</td>
                <td className="p-4 font-bold text-slate-900">{item.head}</td>
                <td className="p-4 text-slate-600 max-w-sm">{item.description}</td>
                <td className="p-4 text-slate-400 text-[11px]">{item.timestamp}</td>
                <td className="p-4 text-right">
                  <span
                    className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold uppercase ${
                      item.status === "active"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : item.status === "investigating"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    }`}
                  >
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
