import React, { useState } from "react";
import { Sidebar } from "./components/layout/Sidebar";
import { Header } from "./components/layout/Header";
import { OverviewPage } from "./pages/Overview";
import { MachinesPage } from "./pages/Machines";
import { EvidenceViewerPage } from "./pages/EvidenceViewer";
import { HashIntegrityPage } from "./pages/HashIntegrity";
import { AnomaliesPage } from "./pages/Anomalies";
import { OperationsPage } from "./pages/Operations";
import { CalibrationAuditsPage } from "./pages/CalibrationAudits";
import { ReportsPage } from "./pages/Reports";
import { AdminManagementPage } from "./pages/AdminManagement";

export function App() {
  const [currentTab, setCurrentTab] = useState("overview");

  const renderContent = () => {
    switch (currentTab) {
      case "overview":
        return <OverviewPage />;
      case "machines":
        return <MachinesPage />;
      case "evidence":
        return <EvidenceViewerPage />;
      case "integrity":
        return <HashIntegrityPage />;
      case "anomalies":
        return <AnomaliesPage />;
      case "operations":
        return <OperationsPage />;
      case "calibration":
        return <CalibrationAuditsPage />;
      case "reports":
        return <ReportsPage />;
      case "admin":
        return <AdminManagementPage />;
      default:
        return <OverviewPage />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}

export default App;

