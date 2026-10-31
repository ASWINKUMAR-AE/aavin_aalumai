import React from "react";
import { Download, FileSpreadsheet, FileText, Calendar, Filter } from "lucide-react";

export const ReportsPage: React.FC = () => {
  const handleDownloadCsv = (type: string) => {
    window.open(`http://localhost:8000/api/v1/reports/${type}.csv`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-slate-900 tracking-tight">Official Reports & Verified Exports</h2>
        <p className="text-xs text-slate-500">Download production logs, anomaly registers, and tamper-evident audit manifests</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">Shift Production Ledger (CSV)</h3>
            <p className="text-xs text-slate-500 mt-1">
              Includes reading IDs, confirmed values, OCR confidence, production deltas, timestamps, and SHA-256 evidence hashes.
            </p>
          </div>
          <button
            onClick={() => handleDownloadCsv("production")}
            className="w-full flex items-center justify-center space-x-2 bg-sky-600 hover:bg-sky-700 text-white py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>DOWNLOAD PRODUCTION CSV</span>
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">Production Anomalies Register (CSV)</h3>
            <p className="text-xs text-slate-500 mt-1">
              Complete registry of rate anomalies, unwitnessed reset alerts, time integrity drifts, and supervisor resolution notes.
            </p>
          </div>
          <button
            onClick={() => handleDownloadCsv("anomalies")}
            className="w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-lg text-xs font-bold transition-colors shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>DOWNLOAD ANOMALIES CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
};

