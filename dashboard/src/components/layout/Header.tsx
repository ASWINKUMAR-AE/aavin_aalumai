import React from "react";
import { Clock, Shield, Bell } from "lucide-react";

export const Header: React.FC = () => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between">
      <div className="flex items-center space-x-4">
        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
          <Clock className="w-3.5 h-3.5" />
          <span>Shift 1 (Morning) • 06:00 - 14:00 IST</span>
        </span>
        <span className="text-xs text-slate-500 font-medium">Plant Timezone: Asia/Kolkata</span>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-lg text-xs font-bold">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>OFFICIAL READ-ONLY MODE</span>
        </div>

        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs border border-slate-300">
          AO
        </div>
      </div>
    </header>
  );
};

