import React from "react";
import {
  LayoutDashboard,
  Cpu,
  Eye,
  ShieldCheck,
  AlertTriangle,
  Scale,
  FileSpreadsheet,
  Settings,
  Lock,
} from "lucide-react";

interface Props {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Sidebar: React.FC<Props> = ({ currentTab, setCurrentTab }) => {
  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "machines", label: "Machines & 14 Heads", icon: Cpu },
    { id: "evidence", label: "Reading Evidence", icon: Eye },
    { id: "integrity", label: "Hash Chain Integrity", icon: ShieldCheck },
    { id: "anomalies", label: "Anomalies", icon: AlertTriangle },
    { id: "operations", label: "Operations & Balance", icon: Scale },
    { id: "calibration", label: "Calibration Audits", icon: Lock },
    { id: "reports", label: "Reports & Export", icon: FileSpreadsheet },
    { id: "admin", label: "System Administration", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-white min-h-screen flex flex-col border-r border-slate-800">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center space-x-3">
        <img
          src="/brand/aavin-logo.png"
          alt="Aavin Aalumai"
          className="w-11 h-11 rounded-full border border-sky-400"
        />
        <div>
          <h1 className="text-base font-black tracking-wide text-white">AAVIN AALUMAI</h1>
          <p className="text-[10px] font-bold text-sky-400 tracking-wider">SHIFT COUNTER LEDGER</p>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 p-3 space-y-1">
        <p className="px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          Official Monitoring
        </p>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-colors ${
                isActive
                  ? "bg-sky-600 text-white shadow-md shadow-sky-900/50"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Plant Info Footer */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400">
        <p className="font-semibold text-slate-300">Madurai Dairy Plant #1</p>
        <p className="text-[10px] text-slate-400">7 VFFS Units • 14 Production Heads</p>
      </div>
    </aside>
  );
};

