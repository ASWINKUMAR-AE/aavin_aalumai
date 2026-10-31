import React from 'react';
import { RoleProfileScreen } from '../../components/RoleProfileScreen';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';

export default function AdminProfileScreen() {
  const { user } = useAuth();
  const { farmers, cows, booths, bmcs } = useAavinStore();

  return (
    <RoleProfileScreen
      roleTitle="System Administrator"
      roleSubtitle="Platform Architecture & Digital Twin Engine"
      staffName={user?.fullName || "K. Aswin Kumar"}
      staffId={user?.associatedId || "SYS_ADMIN_ROOT"}
      facilityTitle="Platform Authority"
      facilityValue="Aavin Smart Dairy Cloud & Milk Safety Twin"
      jurisdictionTitle="System Version"
      jurisdictionValue="v1.0.0 Production Architecture"
      roleIcon="⚙️"
      stats={[
        { label: "Registered Herd", value: `${cows.length} Cows` },
        { label: "Active Producers", value: `${farmers.length} Farmers` },
        { label: "Connected Nodes", value: `${booths.length + bmcs.length} Nodes` },
      ]}
    />
  );
}
