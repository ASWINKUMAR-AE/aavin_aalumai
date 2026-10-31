import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { RoleProfileScreen } from '../../components/RoleProfileScreen';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { DemoHeader } from '../../components/DemoHeader';
import { UnionDesktopProfile } from '../../components/union/desktop/UnionDesktopProfile';
import { useIsDesktop } from '../../hooks/useIsDesktop';

export default function UnionExecutiveProfileScreen() {
  const { bmcs, booths, discrepancyCases } = useAavinStore();
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const isDesktop = useIsDesktop();

  const handleBackToHome = () => {
    router.replace('/(union)' as any);
  };

  if (isDesktop) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <DemoHeader
          title="Union Executive Profile"
          subtitle="District Administrative Authority & Session Controls"
          showBack
          onBack={handleBackToHome}
        />
        <UnionDesktopProfile />
      </View>
    );
  }

  return (
    <RoleProfileScreen
      roleTitle="Union Executive Profile"
      roleSubtitle="Madurai District Co-operative Milk Union"
      staffName={user?.fullName || "P. Jayaram"}
      staffId={user?.associatedId || "UNION_EXECUTIVE"}
      facilityTitle="Headquarters Jurisdiction"
      facilityValue="Madurai District Milk Producers Union"
      jurisdictionTitle="District Operational Reach"
      jurisdictionValue="14 Taluks • 6 Chilling Centers"
      roleIcon="🏛️"
      stats={[
        { label: "Active BMCs", value: `${bmcs.length} Units` },
        { label: "Active Societies", value: `${booths.length} Societies` },
        { label: "Audit Pipeline", value: `${(discrepancyCases || []).length} Alerts` },
      ]}
    />
  );
}
