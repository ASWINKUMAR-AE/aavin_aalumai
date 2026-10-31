import React from "react";
import { Users, Settings, Bell, Lock, ShieldAlert } from "lucide-react";

export const AdminManagementPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-slate-900 tracking-tight">System & Security Administration</h2>
        <p className="text-xs text-slate-500">Configure plant operational rules, user roles, thresholds, and immutable audit logs</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start space-x-3">
        <ShieldAlert className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-extrabold text-amber-800">Critical Trust Boundary Notice (Specification Section 6.4):</p>
          <p className="mt-0.5">
            System Administrators cannot edit, recalculate, or delete any historical reading, reset evidence, or hash-chain block. Every administrative configuration change is permanently committed to the immutable audit log.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-xs uppercase tracking-wider">
            <Users className="w-4 h-4 text-sky-600" />
            <span>Active Plant Users (5 Accounts)</span>
          </div>
          <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
            <div className="flex justify-between py-1">
              <span className="font-bold">worker1</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-bold">OPERATOR</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="font-bold">supervisor1</span>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">SUPERVISOR</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="font-bold">official1</span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">OFFICIAL</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="font-bold">admin1</span>
              <span className="px-2 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-bold">ADMIN</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-xs uppercase tracking-wider">
            <Settings className="w-4 h-4 text-sky-600" />
            <span>Configured Anomaly Thresholds</span>
          </div>
          <div className="space-y-2 text-xs border-t border-slate-100 pt-3">
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Max Production Rate:</span>
              <span className="font-mono font-bold text-slate-900">3,000 pkts/hr per head</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Manual Rollover Threshold:</span>
              <span className="font-mono font-bold text-slate-900">1,000,000 packets</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Late Reading Grace Period:</span>
              <span className="font-mono font-bold text-slate-900">15 minutes</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Device Clock Drift Alert:</span>
              <span className="font-mono font-bold text-slate-900">300 seconds</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
