import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { AavinHeader } from "../../components/brand/AavinHeader";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { OfflineQueueService } from "../../services/offlineQueue";

const INITIAL_MACHINES = [
  {
    code: "RMC-01",
    name: "RMC VFFS Machine 1",
    type: "RMC",
    heads: [
      { id: "RMC-01-H1", number: 1, lastCount: 845230, status: "completed", variant: "TM-500" },
      { id: "RMC-01-H2", number: 2, lastCount: 841100, status: "completed", variant: "TM-500" },
    ],
  },
  {
    code: "RMC-02",
    name: "RMC VFFS Machine 2",
    type: "RMC",
    heads: [
      { id: "RMC-02-H1", number: 1, lastCount: 520400, status: "completed", variant: "SM-500" },
      { id: "RMC-02-H2", number: 2, lastCount: 518900, status: "pending", variant: "SM-500" },
    ],
  },
  {
    code: "SAMARPAN-01",
    name: "Samarpan Integrus 1",
    type: "Samarpan",
    heads: [
      { id: "SAMARPAN-01-H1", number: 1, lastCount: 312450, status: "pending", variant: "FCM-500" },
      { id: "SAMARPAN-01-H2", number: 2, lastCount: 310890, status: "pending", variant: "FCM-500" },
    ],
  },
  {
    code: "SAMARPAN-02",
    name: "Samarpan Integrus 2",
    type: "Samarpan",
    heads: [
      { id: "SAMARPAN-02-H1", number: 1, lastCount: 654200, status: "pending", variant: "TM-500" },
      { id: "SAMARPAN-02-H2", number: 2, lastCount: 652100, status: "pending", variant: "TM-500" },
    ],
  },
  {
    code: "SAMARPAN-03",
    name: "Samarpan Integrus 3",
    type: "Samarpan",
    heads: [
      { id: "SAMARPAN-03-H1", number: 1, lastCount: 198400, status: "pending", variant: "DTM-500" },
      { id: "SAMARPAN-03-H2", number: 2, lastCount: 197250, status: "pending", variant: "DTM-500" },
    ],
  },
  {
    code: "ATOMIC-01",
    name: "Atomic Engineers Pouch Pack 1",
    type: "Atomic Engineers",
    heads: [
      { id: "ATOMIC-01-H1", number: 1, lastCount: 442100, status: "pending", variant: "SM-500" },
      { id: "ATOMIC-01-H2", number: 2, lastCount: 440950, status: "pending", variant: "SM-500" },
    ],
  },
  {
    code: "ATOMIC-02",
    name: "Atomic Engineers Pouch Pack 2",
    type: "Atomic Engineers",
    heads: [
      { id: "ATOMIC-02-H1", number: 1, lastCount: 785600, status: "pending", variant: "TM-500" },
      { id: "ATOMIC-02-H2", number: 2, lastCount: 783400, status: "pending", variant: "TM-500" },
    ],
  },
];

export default function WorkerHomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);

  useEffect(() => {
    checkQueue();
  }, []);

  const checkQueue = async () => {
    const queue = await OfflineQueueService.getQueue();
    setOfflineCount(queue.filter((q) => q.status === "pending").length);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkQueue();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <AavinHeader />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* KPI Stats Grid */}
        <View style={styles.statsCard}>
          <Text style={styles.sectionHeader}>SHIFT RECORDING STATUS</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>14</Text>
              <Text style={styles.statLabel}>Expected Heads</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: Colors.success }]}>3</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: Colors.warning }]}>11</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: Colors.primary }]}>
                {offlineCount}
              </Text>
              <Text style={styles.statLabel}>Offline Queue</Text>
            </View>
          </View>
        </View>

        {/* PRIMARY ACTION: SCAN MACHINE QR */}
        <TouchableOpacity
          style={styles.primaryScanBtn}
          onPress={() => router.push("/(worker)/scan")}
          activeOpacity={0.85}
        >
          <View style={styles.scanIconWrapper}>
            <Ionicons name="qr-code" size={32} color="#FFFFFF" />
          </View>
          <View style={styles.scanTextWrapper}>
            <Text style={styles.primaryScanBtnTitle}>SCAN MACHINE QR</Text>
            <Text style={styles.primaryScanBtnSub}>
              Point camera at physical head QR sticker
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Quick Operations Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={() => router.push("/(worker)/qr-management")}
          >
            <Ionicons name="qr-code-outline" size={20} color={Colors.primary} />
            <Text style={styles.secondaryActionText}>Manage QRs</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={() => router.push("/(worker)/reset-request")}
          >
            <Ionicons name="refresh-circle-outline" size={20} color={Colors.secondary} />
            <Text style={styles.secondaryActionText}>Reset Request</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={() => router.push("/(worker)/wastage")}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
            <Text style={styles.secondaryActionText}>Wastage</Text>
          </TouchableOpacity>
        </View>

        {/* Machines List (7 machines, 14 heads) */}
        <Text style={styles.listTitle}>Assigned VFFS Machines (7 Units)</Text>

        {INITIAL_MACHINES.map((machine) => (
          <View key={machine.code} style={styles.machineCard}>
            <View style={styles.machineHeader}>
              <View>
                <Text style={styles.machineCode}>{machine.code}</Text>
                <Text style={styles.machineName}>{machine.name}</Text>
              </View>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{machine.type}</Text>
              </View>
            </View>

            <View style={styles.headsContainer}>
              {machine.heads.map((head) => (
                <View key={head.id} style={styles.headRow}>
                  <View style={styles.headInfo}>
                    <Text style={styles.headTitle}>Head {head.number}</Text>
                    <Text style={styles.headCounter}>
                      Counter: <Text style={styles.counterVal}>{head.lastCount.toLocaleString()}</Text>
                    </Text>
                  </View>

                  <View style={styles.headStatus}>
                    <View
                      style={[
                        styles.statusDot,
                        head.status === "completed"
                          ? styles.dotCompleted
                          : styles.dotPending,
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        head.status === "completed"
                          ? styles.textCompleted
                          : styles.textPending,
                      ]}
                    >
                      {head.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statBox: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "900",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: "600",
    marginTop: 2,
  },
  primaryScanBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    elevation: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  scanIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  scanTextWrapper: {
    flex: 1,
  },
  primaryScanBtnTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  primaryScanBtnSub: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 11,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  secondaryActionBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  listTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.secondary,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  machineCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  machineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingBottom: 10,
    marginBottom: 10,
  },
  machineCode: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
  },
  machineName: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  typeBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
  },
  headsContainer: {
    gap: 8,
  },
  headRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.borderLight,
    padding: 10,
    borderRadius: 8,
  },
  headInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  headCounter: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  counterVal: {
    fontWeight: "700",
    color: Colors.primary,
  },
  headStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotCompleted: {
    backgroundColor: Colors.success,
  },
  dotPending: {
    backgroundColor: Colors.warning,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  textCompleted: {
    color: Colors.success,
  },
  textPending: {
    color: Colors.warning,
  },
});

