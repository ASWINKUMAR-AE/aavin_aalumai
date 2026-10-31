import React, { useState } from "react";
import { Eye, ShieldCheck, AlertCircle, Hash, Clock, User, Cpu } from "lucide-react";

const EVIDENCE_LIST = [
  {
    id: "READ-89421",
    headId: "RMC-01-H1",
    machineCode: "RMC-01",
    operator: "Murugan K. (EMP-W01)",
    count: 845230,
    ocrValue: 845230,
    confirmedValue: 845230,
    mismatch: false,
    deviceTime: "2026-10-31 14:02:18 IST",
    serverTime: "2026-10-31 08:32:19 UTC",
    photoSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    readingHash: "54ca113b8dbc9d99f018eac3528b9d21c784ee09b81239aa81f08e458760086c",
    prevHash: "0a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890",
  },
  {
    id: "READ-89415",
    headId: "SAMARPAN-01-H1",
    machineCode: "SAMARPAN-01",
    operator: "Senthil P. (EMP-W02)",
    count: 312480,
    ocrValue: 312450,
    confirmedValue: 312480,
    mismatch: true,
    mismatchReason: "Overhead fluorescent glare occluded digit 8",
    deviceTime: "2026-10-31 09:15:40 IST",
    serverTime: "2026-10-31 03:45:41 UTC",
    photoSha256: "a18b23c98fe41c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    readingHash: "98ab21cf4402bcde1203aa4567ef902188ff6541290bb345ac10298a00223311",
    prevHash: "54ca113b8dbc9d99f018eac3528b9d21c784ee09b81239aa81f08e458760086c",
  },
];

export const EvidenceViewerPage: React.FC = () => {
  const [selected, setSelected] = useState(EVIDENCE_LIST[0]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-slate-900 tracking-tight">Independent Evidence & Chain Inspector</h2>
        <p className="text-xs text-slate-500">Inspect original physical HMI photographs, OCR crops, and cryptographic hashes</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Records Sidebar */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Verified Readings</h3>
          {EVIDENCE_LIST.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selected.id === item.id
                  ? "bg-white border-sky-600 shadow-md ring-1 ring-sky-600"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-slate-900">{item.headId}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {item.id}
                </span>
              </div>
              <p className="text-xs font-mono font-bold text-sky-700 mt-1">
                Counter: {item.confirmedValue.toLocaleString()} pkts
              </p>
              <p className="text-[10px] text-slate-400 mt-1">{item.deviceTime}</p>
            </button>
          ))}
        </div>

        {/* Right: Split Screen Evidence Inspector */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900">Evidence Record: {selected.id}</h3>
              <p className="text-xs text-slate-500">{selected.machineCode} • {selected.headId}</p>
            </div>
            <div className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>SHA-256 HASH CHAIN INTACT</span>
            </div>
          </div>

          {/* Photo & HMI Digital Display View */}
          <div className="bg-slate-950 rounded-xl p-8 flex flex-col items-center justify-center border border-slate-800">
            <p className="text-[10px] font-mono text-sky-400 tracking-wider mb-2">HMI PHYSICAL SCREEN EVIDENCE</p>
            <div className="bg-slate-900 border border-teal-500/50 rounded-lg px-10 py-5 text-center">
              <span className="font-mono text-4xl font-black text-amber-400 tracking-widest">
                {selected.confirmedValue.toLocaleString()}
              </span>
              <p className="text-[10px] font-bold text-teal-400 tracking-wider mt-1">CUMULATIVE PACKETS</p>
            </div>
            <p className="text-[10px] text-slate-400 mt-3">Captured exclusively via In-App Camera • Gallery Upload Blocked</p>
          </div>

          {/* OCR vs Confirmed Side-by-Side (Mandatory Rule) */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="text-center">
              <span className="text-[11px] font-bold text-slate-500">Google ML Kit OCR Detected</span>
              <p className="text-xl font-mono font-black text-slate-800 mt-1">{selected.ocrValue.toLocaleString()}</p>
            </div>
            <div className="text-center border-l border-slate-200">
              <span className="text-[11px] font-bold text-slate-500">Operator Confirmed Value</span>
              <p className="text-xl font-mono font-black text-sky-700 mt-1">{selected.confirmedValue.toLocaleString()}</p>
            </div>
          </div>

          {selected.mismatch && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center space-x-2 text-xs text-amber-800 font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Correction Reason Preserved: {selected.mismatchReason}</span>
            </div>
          )}

          {/* Cryptographic Hashes */}
          <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs font-mono">
            <div className="flex items-start">
              <span className="w-32 text-slate-500 font-bold">Photo SHA-256:</span>
              <span className="flex-1 text-slate-800 break-all">{selected.photoSha256}</span>
            </div>
            <div className="flex items-start">
              <span className="w-32 text-sky-700 font-bold">Reading Hash:</span>
              <span className="flex-1 text-sky-700 font-bold break-all">{selected.readingHash}</span>
            </div>
            <div className="flex items-start">
              <span className="w-32 text-slate-500 font-bold">Previous Hash:</span>
              <span className="flex-1 text-slate-600 break-all">{selected.prevHash}</span>
            </div>
          </div>

          {/* Meta Details */}
          <div className="grid grid-cols-3 gap-4 text-xs pt-2">
            <div>
              <span className="text-slate-400 font-medium">Captured By</span>
              <p className="font-bold text-slate-800">{selected.operator}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Device Time</span>
              <p className="font-bold text-slate-800">{selected.deviceTime}</p>
            </div>
            <div>
              <span className="text-slate-400 font-medium">Server Receive Time</span>
              <p className="font-bold text-slate-800">{selected.serverTime}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
