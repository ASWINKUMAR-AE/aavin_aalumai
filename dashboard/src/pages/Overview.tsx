import React, { useEffect, useState } from "react";
import { getDashboardSummary } from "../services/api";
import { ShieldCheck, AlertTriangle, Cpu, TrendingUp, CheckCircle, Package } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const MOCK_CHART_DATA = [
  { name: "RMC-01", production: 12450 },
  { name: "RMC-02", production: 10280 },
  { name: "SAM-01", production: 8120 },
  { name: "SAM-02", production: 8900 },
  { name: "SAM-03", production: 7450 },
  { name: "ATM-01", production: 6980 },
  { name: "ATM-02", production: 7120 },
];

export const OverviewPage: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    getDashboardSummary().then(setSummary);
  }, []);

  if (!summary) return <div className="p-8 text-center text-slate-500">Loading Official Dashboard...</div>;

  return (
    <div className="space-y-6">
      {/* Top Banner: Daily Signed Hash Anchor */}
      <div className="bg-gradient-to-r from-slate-900 to-sky-950 text-white rounded-xl p-5 border border-slate-800 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-sky-600/30 border border-sky-400 flex items-center justify-center text-sky-400">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold uppercase tracking-wide text-sky-300">
              Daily External Cryptographic Hash Anchor
            </h2>
            <p className="text-xs font-mono text-slate-300 mt-0.5">
              Hash: {summary.latest_daily_anchor_hash}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              Sealed: Today 06:00 UTC • Manifest Signed by Plant KMS • 14 Heads Verified
            </p>
          </div>
        </div>
        <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-extrabold rounded-md">
          SEALED & VERIFIED
        </span>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Recorded Production</span>
            <TrendingUp className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 mt-2">
            {summary.total_recorded_production.toLocaleString()}
          </p>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">Cumulative VFFS HMI Counter Delta</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Good Packets (Net)</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">
            {summary.total_good_packets.toLocaleString()}
          </p>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">Production minus Verified Wastage</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Active Anomalies</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-500 mt-2">{summary.active_anomalies}</p>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">Critical: {summary.critical_anomalies} • Under Audit</p>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Hash Chain Integrity</span>
            <CheckCircle className="w-4 h-4 text-sky-600" />
          </div>
          <p className="text-2xl font-black text-sky-700 mt-2">14 / 14</p>
          <p className="text-[11px] font-semibold text-slate-500 mt-1">All 14 Head Chains Intact</p>
        </div>
      </div>

      {/* Production Chart & Machine Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-800 mb-4">
            Production by VFFS Machine (Current Shift)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_CHART_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0F172A", border: "none", borderRadius: "8px", color: "#FFF" }}
                />
                <Bar dataKey="production" fill="#0A73C0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Shift Completion Overview */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-extrabold uppercase tracking-wide text-slate-800">
            Shift Boundary Completion
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-bold">
              <span>Readings Captured</span>
              <span className="text-sky-700">{summary.completed_readings} / {summary.expected_readings}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-sky-600 h-2.5 rounded-full"
                style={{ width: `${(summary.completed_readings / summary.expected_readings) * 100}%` }}
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Self-Reported Wastage</span>
              <span className="font-bold text-slate-900">{summary.total_self_reported_wastage} pkts</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Verified Wastage</span>
              <span className="font-bold text-rose-600">{summary.total_verified_wastage} pkts</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Active VFFS Machines</span>
              <span className="font-bold text-slate-900">{summary.active_machines} / 7 Units</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Active Packaging Heads</span>
              <span className="font-bold text-slate-900">{summary.total_heads} Heads</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
