import React from "react";
import { Scale, Truck, Trash2 } from "lucide-react";

export const OperationsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-slate-900 tracking-tight">Operations, Wastage & Milk Mass Balance</h2>
        <p className="text-xs text-slate-500">Rigorous separation of self-reported observations and independent supervisor verifications</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Milk Mass Balance Monitor */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center space-x-2 text-sky-700 font-extrabold text-xs uppercase tracking-wider">
            <Scale className="w-4 h-4" />
            <span>Milk Mass Balance</span>
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Issued to Plant:</span>
              <span className="font-bold text-slate-900 font-mono">21,090 Litres</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Packed Production:</span>
              <span className="font-bold text-slate-900 font-mono">41,850 pkts (500ml)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Packed Equivalent:</span>
              <span className="font-bold text-slate-900 font-mono">20,925 Litres</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 font-bold">
              <span className="text-slate-700">Calculated Plant Loss:</span>
              <span className="text-emerald-600 font-mono">-0.78% (Normal Band)</span>
            </div>
          </div>
        </div>

        {/* Wastage Categorization */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center space-x-2 text-rose-600 font-extrabold text-xs uppercase tracking-wider">
            <Trash2 className="w-4 h-4" />
            <span>Wastage Reconciliation</span>
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Self-Reported Wastage:</span>
              <span className="font-bold text-slate-900 font-mono">180 pkts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Physically Verified:</span>
              <span className="font-bold text-rose-600 font-mono">140 pkts</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Pending Verification:</span>
              <span className="font-bold text-amber-600 font-mono">40 pkts</span>
            </div>
            <div className="border-t border-slate-100 pt-2 text-[11px] text-slate-400">
              Mandatory Rule: Self-reported figures are never merged with verified production.
            </div>
          </div>
        </div>

        {/* Cold Room Dispatch */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center space-x-2 text-slate-800 font-extrabold text-xs uppercase tracking-wider">
            <Truck className="w-4 h-4" />
            <span>Finished Goods Dispatch</span>
          </div>

          <div className="space-y-3 border-t border-slate-100 pt-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Standardized Milk (Green):</span>
              <span className="font-bold text-slate-900 font-mono">14,200 pkts (710 crates)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Toned Milk (Blue):</span>
              <span className="font-bold text-slate-900 font-mono">22,500 pkts (1,125 crates)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Full Cream Milk (Orange):</span>
              <span className="font-bold text-slate-900 font-mono">5,150 pkts (257 crates)</span>
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-2 font-bold">
              <span className="text-slate-700">Total Crates Dispatched:</span>
              <span className="text-sky-700 font-mono">2,092 Crates</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

