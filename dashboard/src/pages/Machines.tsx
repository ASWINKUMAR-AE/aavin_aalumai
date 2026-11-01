import React from "react";
import { Cpu, ShieldCheck } from "lucide-react";

const MACHINES = [
  {
    code: "RMC-01",
    name: "RMC VFFS Machine 1",
    type: "RMC",
    heads: [
      { id: "RMC-01-H1", number: 1, qr: "AAVIN://MADURAI/DAIRY/RMC-01/HEAD_1", lastCount: 845230, delta: 5230, variant: "TM-500 (Toned)", chain: "Verified" },
      { id: "RMC-01-H2", number: 2, qr: "AAVIN://MADURAI/DAIRY/RMC-01/HEAD_2", lastCount: 841100, delta: 4980, variant: "TM-500 (Toned)", chain: "Verified" },
    ],
  },
  {
    code: "RMC-02",
    name: "RMC VFFS Machine 2",
    type: "RMC",
    heads: [
      { id: "RMC-02-H1", number: 1, qr: "AAVIN://MADURAI/DAIRY/RMC-02/HEAD_1", lastCount: 520400, delta: 5120, variant: "SM-500 (Standardized)", chain: "Verified" },
      { id: "RMC-02-H2", number: 2, qr: "AAVIN://MADURAI/DAIRY/RMC-02/HEAD_2", lastCount: 518900, delta: 4890, variant: "SM-500 (Standardized)", chain: "Verified" },
    ],
  },
  {
    code: "SAMARPAN-01",
    name: "Samarpan Integrus 1",
    type: "Samarpan",
    heads: [
      { id: "SAMARPAN-01-H1", number: 1, qr: "AAVIN://MADURAI/DAIRY/SAMARPAN-01/HEAD_1", lastCount: 312450, delta: 3820, variant: "FCM-500 (Full Cream)", chain: "Verified" },
      { id: "SAMARPAN-01-H2", number: 2, qr: "AAVIN://MADURAI/DAIRY/SAMARPAN-01/HEAD_2", lastCount: 310890, delta: 3740, variant: "FCM-500 (Full Cream)", chain: "Verified" },
    ],
  },
  {
    code: "SAMARPAN-02",
    name: "Samarpan Integrus 2",
    type: "Samarpan",
    heads: [
      { id: "SAMARPAN-02-H1", number: 1, qr: "AAVIN://MADURAI/DAIRY/SAMARPAN-02/HEAD_1", lastCount: 654200, delta: 4620, variant: "TM-500 (Toned)", chain: "Verified" },
      { id: "SAMARPAN-02-H2", number: 2, qr: "AAVIN://MADURAI/DAIRY/SAMARPAN-02/HEAD_2", lastCount: 652100, delta: 4500, variant: "TM-500 (Toned)", chain: "Verified" },
    ],
  },
  {
    code: "SAMARPAN-03",
    name: "Samarpan Integrus 3",
    type: "Samarpan",
    heads: [
      { id: "SAMARPAN-03-H1", number: 1, qr: "AAVIN://MADURAI/DAIRY/SAMARPAN-03/HEAD_1", lastCount: 198400, delta: 2950, variant: "DTM-500 (Double Toned)", chain: "Verified" },
      { id: "SAMARPAN-03-H2", number: 2, qr: "AAVIN://MADURAI/DAIRY/SAMARPAN-03/HEAD_2", lastCount: 197250, delta: 2890, variant: "DTM-500 (Double Toned)", chain: "Verified" },
    ],
  },
  {
    code: "ATOMIC-01",
    name: "Atomic Engineers Pouch Pack 1",
    type: "Atomic Engineers",
    heads: [
      { id: "ATOMIC-01-H1", number: 1, qr: "AAVIN://MADURAI/DAIRY/ATOMIC-01/HEAD_1", lastCount: 442100, delta: 3510, variant: "SM-500 (Standardized)", chain: "Verified" },
      { id: "ATOMIC-01-H2", number: 2, qr: "AAVIN://MADURAI/DAIRY/ATOMIC-01/HEAD_2", lastCount: 440950, delta: 3420, variant: "SM-500 (Standardized)", chain: "Verified" },
    ],
  },
  {
    code: "ATOMIC-02",
    name: "Atomic Engineers Pouch Pack 2",
    type: "Atomic Engineers",
    heads: [
      { id: "ATOMIC-02-H1", number: 1, qr: "AAVIN://MADURAI/DAIRY/ATOMIC-02/HEAD_1", lastCount: 785600, delta: 4120, variant: "TM-500 (Toned)", chain: "Verified" },
      { id: "ATOMIC-02-H2", number: 2, qr: "AAVIN://MADURAI/DAIRY/ATOMIC-02/HEAD_2", lastCount: 783400, delta: 4050, variant: "TM-500 (Toned)", chain: "Verified" },
    ],
  },
];

export const MachinesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Plant VFFS Machines & 14 Packaging Heads</h2>
          <p className="text-xs text-slate-500">Live monitoring of RMC, Samarpan, and Atomic Engineers dual-head units</p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-bold bg-sky-50 text-sky-700 px-3 py-1.5 rounded-lg border border-sky-200">
          <Cpu className="w-4 h-4" />
          <span>7 Machines Configured • 14 Heads Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {MACHINES.map((machine) => (
          <div key={machine.code} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">{machine.code}</h3>
                <p className="text-xs text-slate-500">{machine.name}</p>
              </div>
              <span className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-slate-100 text-slate-700">
                {machine.type}
              </span>
            </div>

            <div className="space-y-3">
              {machine.heads.map((head) => (
                <div key={head.id} className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800">{head.id}</span>
                    <span className="flex items-center space-x-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      <ShieldCheck className="w-3 h-3" />
                      <span>{head.chain}</span>
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-slate-500 font-medium">Counter:</span>
                    <span className="font-mono font-black text-slate-900 text-sm">
                      {head.lastCount.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">Shift Delta:</span>
                    <span className="font-bold text-emerald-600">+{head.delta.toLocaleString()} pkts</span>
                  </div>

                  <div className="text-[10px] text-slate-500 border-t border-slate-200 pt-1.5">
                    Variant: <span className="font-semibold text-slate-700">{head.variant}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

