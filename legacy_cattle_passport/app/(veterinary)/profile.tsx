import React from 'react';
import { RoleProfileScreen } from '../../components/RoleProfileScreen';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';

export default function VeterinaryProfileScreen() {
  const { cows } = useAavinStore();
  const { user } = useAuth();

  const activeQuarantined = (cows || []).filter(
    c => c.healthStatus === 'quarantine_hold' || c.healthStatus === 'under_treatment' || c.activeWithdrawal?.hasActiveWithdrawal
  ).length;

  const totalTreatments = (cows || []).reduce(
    (count, c) => count + (c.treatmentRecords ? c.treatmentRecords.length : 0),
    0
  );

  return (
    <RoleProfileScreen
      roleTitle="Veterinary Officer Profile"
      roleSubtitle="Aavin District Animal Husbandry Services"
      staffName={user?.fullName || "Dr. V. Rajesh DVM"}
      staffId={user?.associatedId || "VET_OFFICER"}
      facilityTitle="Veterinary Jurisdiction"
      facilityValue="Vadipatti & Melur Dairy Veterinary Dispensaries"
      jurisdictionTitle="Clinical License ID"
      jurisdictionValue="TNV-VET-48921"
      roleIcon="🩺"
      stats={[
        { label: "Registered Herd", value: `${cows.length} Cows` },
        { label: "Treatments Logged", value: `${totalTreatments}` },
        { label: "Under Holds", value: `${activeQuarantined} Active` },
      ]}
    />
  );
}
