import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  Pressable, 
  Switch, 
  Alert, 
  Platform, 
  useWindowDimensions,
  DimensionValue
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAavinStore } from '../../store/AavinStoreContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from '../../context/LanguageContext';
import { Typography } from '../../constants/Typography';
import { DemoHeader } from '../../components/DemoHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Ionicons } from '@expo/vector-icons';

export default function BmcProfileScreen() {
  const { bmcs, booths, discrepancyCases, bmcDeliveries, societyIncomeRecords } = useAavinStore();
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const { t, language } = useTranslation();
  const { width } = useWindowDimensions();
  const router = useRouter();

  const isWeb = Platform.OS === 'web';
  const col2Width: DimensionValue = isWeb ? '48.5%' : (width < 340 ? '100%' : Math.floor((width - 32 - 10) / 2));

  // Assigned BMC Center details
  const bmc = bmcs[0] || { 
    id: 'BMC001', 
    name: 'Madurai East Bulk Milk Cooling Centre', 
    code: 'BMC-102',
    capacityLitres: 10000 
  };

  const assignedSocieties = booths.filter(b => b.assignedBmcId === bmc.id);
  const societyCount = assignedSocieties.length > 0 ? assignedSocieties.length : 5;

  const pendingCases = (discrepancyCases || []).filter(
    d => d.status === 'under_investigation' || d.status === 'open'
  ).length;

  const totalDeliveredLitres = (bmcDeliveries || [])
    .filter(d => d.bmcId === bmc.id || !d.bmcId)
    .reduce((sum, d) => sum + (d.measuredReceivedQuantity || d.declaredDispatchQuantity || 0), 0);
  
  const dailyChilledAvg = totalDeliveredLitres > 0 
    ? Math.round(totalDeliveredLitres / 7) 
    : 1820;

  // Real-time notification & operational telemetry alert toggles
  const [transitMismatchAlert, setTransitMismatchAlert] = useState(true);
  const [chillerTempAlert, setChillerTempAlert] = useState(true);
  const [societyDelayAlert, setSocietyDelayAlert] = useState(true);
  const [unionTankerAlert, setUnionTankerAlert] = useState(false);

  const handleLogout = async () => {
    const titleText = language === 'ta' ? 'வெளியேறு (Sign Out)' : 'Sign Out';
    const messageText = language === 'ta'
      ? 'ஆவின் குளிரூட்டும் மைய போர்ட்டலில் இருந்து பாதுகாப்பாக வெளியேற விரும்புகிறீர்களா?'
      : 'Are you sure you want to securely log out from the Aavin BMC Portal?';

    if (isWeb) {
      if (typeof window !== 'undefined' && window.confirm(messageText)) {
        await logout();
        router.replace('/(auth)/login');
      }
    } else {
      Alert.alert(titleText, messageText, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <DemoHeader 
        title="BMC Manager Profile"
        subtitle="Bulk Milk Chilling Center Operations & Plant Telemetry"
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. Official BMC Staff Identity Card */}
        <Card style={styles.profileHeroCard}>
          <View style={styles.heroTopRow}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
              <Text style={styles.avatarInitials}>
                {(user?.fullName || 'R.S.')
                  .split(' ')
                  .map(n => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase() || 'BMC'}
              </Text>
            </View>

            <View style={styles.heroInfoColumn}>
              <View style={styles.staffTitleRow}>
                <Text style={[Typography.title3, { color: colors.text, fontWeight: '900', flex: 1 }]}>
                  {user?.fullName || 'Dr. S. Sundaram'}
                </Text>
                <View style={[styles.activeDutyBadge, { backgroundColor: '#DCFCE7' }]}>
                  <View style={styles.activePulseDot} />
                  <Text style={[styles.activeDutyText, { color: '#166534' }]}>ON DUTY</Text>
                </View>
              </View>

              <Text style={[Typography.caption1, { color: colors.primary, fontWeight: '800', marginTop: 2 }]}>
                ID: {user?.associatedId || 'BMC-MDU-EAST-01'}
              </Text>

              <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 4 }]}>
                Bulk Milk Chilling Center In-Charge & Cold Chain Supervisor
              </Text>

              <View style={styles.authBadgeRow}>
                <View style={[styles.verifiedPill, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                  <Ionicons name="shield-checkmark" size={13} color="#1E40AF" />
                  <Text style={[styles.verifiedPillText, { color: '#1E40AF' }]}>
                    Aavin Authorized Cold-Chain Controller
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Contact & Shift Metadata Strip */}
          <View style={[styles.metaStrip, { borderTopColor: colors.border }]}>
            <View style={styles.metaRowItem}>
              <Ionicons name="call-outline" size={14} color={colors.primary} />
              <Text style={[Typography.caption2, { color: colors.textSecondary, marginLeft: 6 }]}>
                +91 94432 78102
              </Text>
            </View>
            <View style={styles.metaRowItem}>
              <Ionicons name="mail-outline" size={14} color={colors.primary} />
              <Text style={[Typography.caption2, { color: colors.textSecondary, marginLeft: 6 }]}>
                bmc.alanganallur@aavin.tn.gov.in
              </Text>
            </View>
            <View style={styles.metaRowItem}>
              <Ionicons name="time-outline" size={14} color="#16A34A" />
              <Text style={[Typography.caption2, { color: '#16A34A', fontWeight: '700', marginLeft: 6 }]}>
                Shift: Morning Influx (05:30 AM – 01:30 PM)
              </Text>
            </View>
          </View>
        </Card>

        {/* 2. Real-Time Operational Performance Summary (2 x 2 Symmetrical Grid) */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="analytics" size={18} color={colors.primary} />
            <Text style={styles.sectionHeaderTitle}>REAL-TIME OPERATIONAL METRICS (2 × 2 GRID)</Text>
          </View>

          <View style={styles.grid2x2}>
            {/* Metric 1 */}
            <View style={[styles.metricCardWrapper, { width: col2Width }]}>
              <Card style={styles.metricCard}>
                <View style={styles.metricTopRow}>
                  <Ionicons name="business-outline" size={18} color={colors.primary} />
                  <View style={[styles.pillBadge, { backgroundColor: colors.primaryLight }]}>
                    <Text style={[styles.pillBadgeText, { color: colors.primary }]}>Active</Text>
                  </View>
                </View>
                <Text style={[styles.metricBigNumber, { color: colors.text }]}>
                  {societyCount} Societies
                </Text>
                <Text style={styles.metricTitle}>Connected Feeders</Text>
                <Text style={styles.metricSubtitle}>Assigned rural supply cooperatives</Text>
              </Card>
            </View>

            {/* Metric 2 */}
            <View style={[styles.metricCardWrapper, { width: col2Width }]}>
              <Card style={styles.metricCard}>
                <View style={styles.metricTopRow}>
                  <Ionicons name="water-outline" size={18} color="#0284C7" />
                  <View style={[styles.pillBadge, { backgroundColor: '#E0F2FE' }]}>
                    <Text style={[styles.pillBadgeText, { color: '#0369A1' }]}>Chilled</Text>
                  </View>
                </View>
                <Text style={[styles.metricBigNumber, { color: '#0284C7' }]}>
                  {dailyChilledAvg.toLocaleString()} L
                </Text>
                <Text style={styles.metricTitle}>Daily Chilled Influx</Text>
                <Text style={styles.metricSubtitle}>Flow-meter verified bulk intake</Text>
              </Card>
            </View>

            {/* Metric 3 */}
            <View style={[styles.metricCardWrapper, { width: col2Width }]}>
              <Card style={[styles.metricCard, pendingCases > 0 && { borderColor: '#FCA5A5' }]}>
                <View style={styles.metricTopRow}>
                  <Ionicons 
                    name={pendingCases > 0 ? "warning-outline" : "checkmark-circle-outline"} 
                    size={18} 
                    color={pendingCases > 0 ? "#DC2626" : "#16A34A"} 
                  />
                  <View style={[styles.pillBadge, { backgroundColor: pendingCases > 0 ? '#FEE2E2' : '#DCFCE7' }]}>
                    <Text style={[styles.pillBadgeText, { color: pendingCases > 0 ? '#991B1B' : '#166534' }]}>
                      {pendingCases > 0 ? 'Under Review' : 'Zero Mismatch'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.metricBigNumber, { color: pendingCases > 0 ? '#DC2626' : '#16A34A' }]}>
                  {pendingCases} Cases
                </Text>
                <Text style={styles.metricTitle}>Discrepancy Audits</Text>
                <Text style={styles.metricSubtitle}>Transit volume & SNF variances</Text>
              </Card>
            </View>

            {/* Metric 4 */}
            <View style={[styles.metricCardWrapper, { width: col2Width }]}>
              <Card style={styles.metricCard}>
                <View style={styles.metricTopRow}>
                  <Ionicons name="snow-outline" size={18} color="#16A34A" />
                  <View style={[styles.pillBadge, { backgroundColor: '#DCFCE7' }]}>
                    <Text style={[styles.pillBadgeText, { color: '#166534' }]}>Normal</Text>
                  </View>
                </View>
                <Text style={[styles.metricBigNumber, { color: '#16A34A' }]}>
                  3.8°C
                </Text>
                <Text style={styles.metricTitle}>Tank Chilling Temp</Text>
                <Text style={styles.metricSubtitle}>Compliant cold-chain (2°C – 4°C)</Text>
              </Card>
            </View>
          </View>
        </View>

        {/* 3. Daily Reception & Logistics Operating Schedule */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="calendar-outline" size={18} color="#D97706" />
            <Text style={styles.sectionHeaderTitle}>PLANT RECEPTION & DISPATCH SCHEDULE</Text>
          </View>

          <Card style={styles.alignedCard}>
            <View style={styles.scheduleTimeline}>
              {/* Event 1 */}
              <View style={styles.timelineItem}>
                <View style={styles.timelineIndicatorCol}>
                  <View style={[styles.timelineDot, { backgroundColor: '#D97706' }]} />
                  <View style={styles.timelineLine} />
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeaderRow}>
                    <Text style={[Typography.caption1, { color: colors.text, fontWeight: '800' }]}>
                      Morning Milk Influx Window
                    </Text>
                    <View style={[styles.timeBadge, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={[styles.timeBadgeText, { color: '#B45309' }]}>05:30 AM – 09:30 AM</Text>
                    </View>
                  </View>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                    Feeder societies arrive with milk cans. Weigh-scale and fat/SNF testing conducted at intake dock.
                  </Text>
                </View>
              </View>

              {/* Event 2 */}
              <View style={styles.timelineItem}>
                <View style={styles.timelineIndicatorCol}>
                  <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
                  <View style={styles.timelineLine} />
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeaderRow}>
                    <Text style={[Typography.caption1, { color: colors.text, fontWeight: '800' }]}>
                      Morning Road Tanker Dispatch
                    </Text>
                    <View style={[styles.timeBadge, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.timeBadgeText, { color: colors.primary }]}>10:00 AM</Text>
                    </View>
                  </View>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                    Insulated bulk road tanker collects chilled volume for transit to Madurai District Dairy Union.
                  </Text>
                </View>
              </View>

              {/* Event 3 */}
              <View style={styles.timelineItem}>
                <View style={styles.timelineIndicatorCol}>
                  <View style={[styles.timelineDot, { backgroundColor: '#7C3AED' }]} />
                  <View style={styles.timelineLine} />
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeaderRow}>
                    <Text style={[Typography.caption1, { color: colors.text, fontWeight: '800' }]}>
                      Automated CIP Sanitation Wash
                    </Text>
                    <View style={[styles.timeBadge, { backgroundColor: '#F3E8FF' }]}>
                      <Text style={[styles.timeBadgeText, { color: '#6D28D9' }]}>11:00 AM – 11:45 AM</Text>
                    </View>
                  </View>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                    Automated 4-stage chemical Clean-In-Place rinse, caustic wash, acid wash, and steam sanitization.
                  </Text>
                </View>
              </View>

              {/* Event 4 */}
              <View style={[styles.timelineItem, { marginBottom: 0 }]}>
                <View style={styles.timelineIndicatorCol}>
                  <View style={[styles.timelineDot, { backgroundColor: '#059669' }]} />
                </View>
                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeaderRow}>
                    <Text style={[Typography.caption1, { color: colors.text, fontWeight: '800' }]}>
                      Evening Milk Influx & Final Chill
                    </Text>
                    <View style={[styles.timeBadge, { backgroundColor: '#DCFCE7' }]}>
                      <Text style={[styles.timeBadgeText, { color: '#166534' }]}>04:30 PM – 07:30 PM</Text>
                    </View>
                  </View>
                  <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                    Evening shift collections received, rapid chilled to 3.8°C, and logged in Aavin digital passport.
                  </Text>
                </View>
              </View>
            </View>
          </Card>
        </View>

        {/* 4. Cold-Chain Alert Preferences & Notifications (Interactive Toggles) */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="notifications-outline" size={18} color="#EA580C" />
            <Text style={styles.sectionHeaderTitle}>REAL-TIME ALERTS & THRESHOLD PREFERENCES</Text>
          </View>

          <Card style={styles.alignedCard}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleTextCol}>
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                  Transit Volume Mismatch Alert
                </Text>
                <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                  Instantly flag when society weigh-scale differs from BMC intake by &gt;2% or &gt;3L.
                </Text>
              </View>
              <Switch
                value={transitMismatchAlert}
                onValueChange={setTransitMismatchAlert}
                trackColor={{ false: '#CBD5E1', true: colors.primary }}
                thumbColor={transitMismatchAlert ? '#FFFFFF' : '#F1F5F9'}
              />
            </View>

            <View style={[styles.toggleRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
              <View style={styles.toggleTextCol}>
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                  Chiller Tank Temperature Threshold
                </Text>
                <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                  Broadcast emergency high-priority alert if bulk cooler temperature rises above 4.2°C.
                </Text>
              </View>
              <Switch
                value={chillerTempAlert}
                onValueChange={setChillerTempAlert}
                trackColor={{ false: '#CBD5E1', true: '#16A34A' }}
                thumbColor={chillerTempAlert ? '#FFFFFF' : '#F1F5F9'}
              />
            </View>

            <View style={[styles.toggleRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
              <View style={styles.toggleTextCol}>
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                  Society Late Dispatch Warning
                </Text>
                <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                  Prompt field coordinator if a feeder cooperative hasn't logged morning dispatch by 08:30 AM.
                </Text>
              </View>
              <Switch
                value={societyDelayAlert}
                onValueChange={setSocietyDelayAlert}
                trackColor={{ false: '#CBD5E1', true: colors.primary }}
                thumbColor={societyDelayAlert ? '#FFFFFF' : '#F1F5F9'}
              />
            </View>

            <View style={[styles.toggleRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border }]}>
              <View style={styles.toggleTextCol}>
                <Text style={[Typography.subhead, { color: colors.text, fontWeight: '700' }]}>
                  Union Road Tanker ETA Notification
                </Text>
                <Text style={[Typography.caption2, { color: colors.textSecondary, marginTop: 2 }]}>
                  Send GPS geo-fence alert 20 minutes before collection tanker arrives at reception dock.
                </Text>
              </View>
              <Switch
                value={unionTankerAlert}
                onValueChange={setUnionTankerAlert}
                trackColor={{ false: '#CBD5E1', true: colors.primary }}
                thumbColor={unionTankerAlert ? '#FFFFFF' : '#F1F5F9'}
              />
            </View>
          </Card>
        </View>

        {/* 5. Account Sign Out & Build Metadata */}
        <View style={styles.sectionBlock}>
          <Button
            title={t('common.logout', 'Sign Out from BMC Portal')}
            variant="destructive"
            onPress={handleLogout}
            style={styles.signOutButton}
          />

          <View style={styles.appVersionFooter}>
            <Text style={[Typography.caption2, { color: colors.textMuted, textAlign: 'center' }]}>
              Aavin Smart Cattle Passport • Cold Chain & Milk Safety Twin
            </Text>
            <Text style={[Typography.caption2, { color: colors.textMuted, textAlign: 'center', marginTop: 2, fontSize: 10 }]}>
              Version 2.4.1 (Build 2026.10-PROD) • Madurai District Co-operative Milk Producers' Union
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
    gap: 16,
  },

  // Hero Card
  profileHeroCard: {
    padding: 16,
    borderRadius: 16,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1,
  },
  heroInfoColumn: {
    flex: 1,
    marginLeft: 14,
  },
  staffTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  activeDutyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 5,
  },
  activePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  activeDutyText: {
    fontSize: 10,
    fontWeight: '800',
  },
  authBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    gap: 5,
  },
  verifiedPillText: {
    fontSize: 10,
    fontWeight: '700',
  },

  metaStrip: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  metaRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Section Blocks
  sectionBlock: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 2,
  },
  sectionHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },

  // Symmetrical 2x2 Grid
  grid2x2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  metricCardWrapper: {
    flexGrow: 0,
    flexShrink: 0,
  },
  metricCard: {
    padding: 12,
    borderRadius: 14,
    minHeight: 114,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pillBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pillBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  metricBigNumber: {
    fontSize: 20,
    fontWeight: '900',
    marginVertical: 4,
  },
  metricTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  metricSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },

  // Aligned Cards
  alignedCard: {
    padding: 16,
    borderRadius: 16,
  },


  // Schedule Timeline
  scheduleTimeline: {
    gap: 14,
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineIndicatorCol: {
    width: 20,
    alignItems: 'center',
    marginRight: 10,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  timeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  timeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },

  // Toggle rows
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 14,
  },
  toggleTextCol: {
    flex: 1,
  },

  // Sign out & footer
  signOutButton: {
    marginTop: 4,
  },
  appVersionFooter: {
    marginTop: 14,
    paddingTop: 8,
  },
});
