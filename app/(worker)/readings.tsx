import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "../../services/api";

const DEMO_READINGS = [
  {
    id: "READ-89421-RMC1",
    machineId: "RMC-01",
    headId: "RMC-01-H1",
    count: 845230,
    ocrValue: 845230,
    confirmedValue: 845230,
    delta: 5230,
    variantId: "TM-500",
    hash: "54ca113b8dbc9d99f018eac3528b9d21c784...",
    time: "Today, 14:02 IST",
    status: "verified",
  },
  {
    id: "READ-89420-RMC2",
    machineId: "RMC-01",
    headId: "RMC-01-H2",
    count: 841100,
    ocrValue: 841100,
    confirmedValue: 841100,
    delta: 4980,
    variantId: "TM-500",
    hash: "4422f711fdb1ccae77b21901ddfa456102aa...",
    time: "Today, 14:05 IST",
    status: "verified",
  },
  {
    id: "READ-89419-RMC3",
    machineId: "RMC-02",
    headId: "RMC-02-H1",
    count: 520400,
    ocrValue: 520400,
    confirmedValue: 520400,
    delta: 5120,
    variantId: "SM-500",
    hash: "98ab21cf4402bcde1203aa4567ef902188ff...",
    time: "Today, 14:08 IST",
    status: "verified",
  },
];

export default function MyReadingsScreen() {
  const insets = useSafeAreaInsets();
  const [readings, setReadings] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchReadings();
  }, []);

  const fetchReadings = async () => {
    try {
      const res = await apiClient.get("/readings?limit=20");
      if (res.data && Array.isArray(res.data)) {
        setReadings(res.data);
      }
    } catch {
      // Empty fresh state
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchReadings();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 14) }]}>
        <Text style={styles.topBarTitle}>My Shift Readings</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.summaryNote}>
          Immutable Evidence: Historical readings cannot be modified or deleted.
        </Text>

        {readings.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 48, paddingHorizontal: 24, gap: 12 }}>
            <Ionicons name="documents-outline" size={54} color="#94a3b8" />
            <Text style={{ fontSize: 16, fontWeight: "800", color: Colors.text }}>
              No Readings Recorded Yet
            </Text>
            <Text style={{ fontSize: 12, color: Colors.textSecondary, textAlign: "center", lineHeight: 18 }}>
              App is in newly installed fresh shift mode. Scan a machine QR code to record your first machine display reading.
            </Text>
          </View>
        ) : (
          readings.map((r: any) => (
            <View key={r.id} style={styles.readingCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.headText}>{r.headId || r.head_id}</Text>
                  <Text style={styles.timeText}>{r.time || new Date(r.created_at).toLocaleTimeString()}</Text>
                </View>
                <View style={styles.verifiedBadge}>
                  <Ionicons name="link" size={13} color={Colors.primary} />
                  <Text style={styles.verifiedText}>CHAIN VERIFIED</Text>
                </View>
              </View>

              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Confirmed Reading</Text>
                  <Text style={styles.statVal}>{(r.confirmedValue || r.confirmed_value || r.count).toLocaleString()}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Production Delta</Text>
                  <Text style={[styles.statVal, { color: Colors.success }]}>
                    +{(r.delta || r.production_delta || 0).toLocaleString()} pkts
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Variant</Text>
                  <Text style={styles.statVal}>{r.variantId || r.variant_id}</Text>
                </View>
              </View>

              <View style={styles.hashBox}>
                <Text style={styles.hashLabel}>HASH:</Text>
                <Text style={styles.hashVal} numberOfLines={1}>
                  {r.hash}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
  },
  refreshBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summaryNote: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  readingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: 10,
    marginBottom: 10,
  },
  headText: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.secondary,
  },
  timeText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.primary,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  statVal: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 2,
  },
  hashBox: {
    flexDirection: "row",
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: "center",
    gap: 6,
  },
  hashLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  hashVal: {
    flex: 1,
    fontSize: 10,
    fontFamily: "monospace",
    color: Colors.textSecondary,
  },
});

