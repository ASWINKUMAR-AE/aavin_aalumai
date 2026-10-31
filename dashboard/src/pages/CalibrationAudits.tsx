import React from "react";
import { CheckCircle2, AlertCircle, Calendar } from "lucide-react";

export const CalibrationAuditsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-slate-900 tracking-tight">Full-Shift Calibration & Physical Audits</h2>
        <p className="text-xs text-slate-500">Measuring mechanical counter drift against manual physical pouch verification</p>
      </div>

      {/* Mandatory Display Rule Card */}
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-xs text-sky-900 space-y-1">
        <p className="font-extrabold uppercase tracking-wide text-sky-800">
          Mandatory Dashboard Display Rule (Specification Section 17):
        </p>
        <p>
          Always display <span className="font-bold">Recorded Counter Production</span> and <span className="font-bold">Adjusted Production (with Measured Offset)</span> separately. Never merge these values into a single figure or retroactively alter historical counter readings.
        </p>
      </div>

      {/* Comparison Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            1. Recorded Counter Production
          </span>
          <p className="text-3xl font-black text-slate-900 font-mono">42,180</p>
          <p className="text-xs text-slate-500">Raw delta observed across 14 VFFS HMI counters</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            2. Adjusted Production (Measured Calibration Offset)
          </span>
          <p className="text-3xl font-black text-sky-700 font-mono">42,245</p>
          <p className="text-xs text-emerald-600 font-bold">+65 pkts (+0.15% average mechanical drift offset)</p>
        </div>
      </div>

      {/* Recent Calibration Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">Recent Calibration Audit Records</h3>
          <span className="text-[11px] font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded">
            Scheduled & Unannounced Audits
          </span>
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-4">Audit Date</th>
              <th className="p-4">Machine Head</th>
              <th className="p-4">Physical Count</th>
              <th className="p-4">Counter Delta</th>
              <th className="p-4">Measured Offset</th>
              <th className="p-4">Offset %</th>
              <th className="p-4 text-right">Auditor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            <tr className="hover:bg-slate-50/50">
              <td className="p-4 text-slate-600">2026-10-30</td>
              <td className="p-4 font-black text-slate-900">RMC-01-H1</td>
              <td className="p-4 font-mono font-bold text-slate-800">5,255 pkts</td>
              <td className="p-4 font-mono font-bold text-slate-800">5,230 pkts</td>
              <td className="p-4 font-mono font-bold text-emerald-600">+25 pkts</td>
              <td className="p-4 font-bold text-emerald-600">+0.48%</td>
              <td className="p-4 text-right font-semibold text-slate-700">Dr. Meenakshi S.</td>
            </tr>
            <tr className="hover:bg-slate-50/50">
              <td className="p-4 text-slate-600">2026-10-29</td>
              <td className="p-4 font-black text-slate-900">SAMARPAN-02-H1</td>
              <td className="p-4 font-mono font-bold text-slate-800">4,612 pkts</td>
              <td className="p-4 font-mono font-bold text-slate-800">4,620 pkts</td>
              <td className="p-4 font-mono font-bold text-rose-600">-8 pkts</td>
              <td className="p-4 font-bold text-rose-600">-0.17%</td>
              <td className="p-4 text-right font-semibold text-slate-700">Venkatesh R.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};
