import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AavinHeader } from "../../components/brand/AavinHeader";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { OfflineQueueService } from "../../services/offlineQueue";

export interface MachineHead {
  id: string;
  number: number;
  lastCount: number;
  status: "pending" | "completed";
  variant: string;
}

export interface MachineUnit {
  code: string;
  qrId: string;
  name: string;
  type: string;
  heads: MachineHead[];
}

/**
 * Authoritative 6 Primary Machine Configuration with 12 independently tracked heads.
 * Initialized in fresh newly-installed state: All 12 heads pending with 0 entered readings.
 */
export const FRESH_INSTALLED_MACHINES: MachineUnit[] = [
  {
    code: "RMC-01",
    qrId: "QR-001",
    name: "RMC VFFS Machine 1",
    type: "RMC",
    heads: [
      { id: "RMC-01-H1", number: 1, lastCount: 0, status: "pending", variant: "TM-500" },
      { id: "RMC-01-H2", number: 2, lastCount: 0, status: "pending", variant: "TM-500" },
    ],
  },
  {
    code: "RMC-02",
    qrId: "QR-002",
    name: "RMC VFFS Machine 2",
    type: "RMC",
    heads: [
      { id: "RMC-02-H1", number: 1, lastCount: 0, status: "pending", variant: "SM-500" },
      { id: "RMC-02-H2", number: 2, lastCount: 0, status: "pending", variant: "SM-500" },
    ],
  },
  {
    code: "SMP-01",
    qrId: "QR-003",
    name: "Samarpan Integrus 1",
    type: "Samarpan",
    heads: [
      { id: "SMP-01-H1", number: 1, lastCount: 0, status: "pending", variant: "FCM-500" },
      { id: "SMP-01-H2", number: 2, lastCount: 0, status: "pending", variant: "FCM-500" },
    ],
  },
  {
    code: "SMP-02",
    qrId: "QR-004",
    name: "Samarpan Integrus 2",
    type: "Samarpan",
    heads: [
      { id: "SMP-02-H1", number: 1, lastCount: 0, status: "pending", variant: "TM-500" },
      { id: "SMP-02-H2", number: 2, lastCount: 0, status: "pending", variant: "TM-500" },
    ],
  },
  {
    code: "SMP-03",
    qrId: "QR-005",
    name: "Samarpan Integrus 3",
    type: "Samarpan",
    heads: [
      { id: "SMP-03-H1", number: 1, lastCount: 0, status: "pending", variant: "DTM-500" },
      { id: "SMP-03-H2", number: 2, lastCount: 0, status: "pending", variant: "DTM-500" },
    ],
  },
  {
    code: "ATM-01",
    qrId: "QR-006",
    name: "Atomic Engineers 1",
    type: "Atomic Engineers",
    heads: [
      { id: "ATM-01-H1", number: 1, lastCount: 0, status: "pending", variant: "SM-500" },
      { id: "ATM-01-H2", number: 2, lastCount: 0, status: "pending", variant: "SM-500" },
    ],
  },
];

const MACHINE_STATE_STORAGE_KEY = "@aavin_worker_machines_fresh_state";

export default function WorkerHomeScreen() {
  const router = useRouter();
  const [machines, setMachines] = useState<MachineUnit[]>(FRESH_INSTALLED_MACHINES);
  const [refreshing, setRefreshing] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);

  useEffect(() => {
    loadMachineState();
    checkQueue();
  }, []);

  const loadMachineState = async () => {
    try {
      const saved = await AsyncStorage.getItem(MACHINE_STATE_STORAGE_KEY);
      if (saved) {
        setMachines(JSON.parse(saved));
      } else {
        setMachines(FRESH_INSTALLED_MACHINES);
      }
    } catch {
      setMachines(FRESH_INSTALLED_MACHINES);
    }
  };

  const checkQueue = async () => {
    const queue = await OfflineQueueService.getQueue();
    const displayQueue = await OfflineQueueService.getDisplayQueue();
    const totalPending =
      queue.filter((q) => q.status === "pending").length +
      displayQueue.filter((q) => q.status === "pending").length;
    setOfflineCount(totalPending);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkQueue();
    await loadMachineState();
    setRefreshing(false);
  };

  // Factory Reset / Fresh App Install State Handler
  const handleFactoryReset = () => {
    Alert.alert(
      "Reset App & Clear All Data",
      "This will clear all entered counter readings, wipe offline queues, and reset all 6 machines and 12 heads to the newly installed clean state (0 readings recorded).",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All Data",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(MACHINE_STATE_STORAGE_KEY);
              await AsyncStorage.removeItem("@aavin_offline_readings_queue");
              await AsyncStorage.removeItem("@aavin_offline_display_evidence_queue");
              setMachines(FRESH_INSTALLED_MACHINES);
              setOfflineCount(0);
              Alert.alert(
                "Fresh Start Activated",
                "App has been reset to newly installed state. All 6 machines and 12 heads are now PENDING with 0 recorded readings."
              );
            } catch (err: any) {
              Alert.alert("Reset Error", err.message || "Failed to clear data.");
            }
          },
        },
      ]
    );
  };

  // Compute live KPI metrics dynamically from active heads
  const allHeads = machines.flatMap((m) => m.heads);
  const totalHeadsCount = allHeads.length;
  const completedCount = allHeads.filter((h) => h.status === "completed").length;
  const pendingCount = totalHeadsCount - completedCount;

  const handleMachinePress = (machine: MachineUnit) => {
    router.push({
      pathname: "/(worker)/display-capture",
      params: {
        machineId: machine.code,
        qrId: machine.qrId,
        machineName: machine.name,
        machineType: machine.type,
        shiftName: "Shift 1 (Morning)",
      },
    });
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
        {/* KPI Stats Grid - Dynamically calculated */}
        <View style={styles.statsCard}>
          <View style={styles.statsHeaderRow}>
            <Text style={styles.sectionHeader}>SHIFT RECORDING STATUS</Text>
            <View style={styles.freshTag}>
              <Text style={styles.freshTagText}>FRESH SHIFT</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{totalHeadsCount}</Text>
              <Text style={styles.statLabel}>Expected Heads</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: Colors.success }]}>
                {completedCount}
              </Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statNumber, { color: Colors.warning }]}>
                {pendingCount}
              </Text>
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
            onPress={() => router.push("/(worker)/table-ocr")}
          >
            <Ionicons name="grid-outline" size={20} color="#0284c7" />
            <Text style={styles.secondaryActionText}>Table OCR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={() => router.push("/(worker)/readings")}
          >
            <Ionicons name="time-outline" size={20} color="#10b981" />
            <Text style={styles.secondaryActionText}>Readings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={() => router.push("/(worker)/wastage")}
          >
            <Ionicons name="trash-outline" size={20} color={Colors.error} />
            <Text style={styles.secondaryActionText}>Wastage</Text>
          </TouchableOpacity>
        </View>

        {/* Machines List (Exact 6 Primary Units, 12 Heads) */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.listTitle}>Assigned VFFS Machines (6 Units • 12 Heads)</Text>
          <TouchableOpacity onPress={handleFactoryReset} style={styles.resetPill}>
            <Ionicons name="refresh" size={13} color="#ef4444" />
            <Text style={styles.resetPillText}>Reset Data</Text>
          </TouchableOpacity>
        </View>

        {machines.map((machine) => (
          <TouchableOpacity
            key={machine.code}
            style={styles.machineCard}
            onPress={() => handleMachinePress(machine)}
            activeOpacity={0.85}
          >
            <View style={styles.machineHeader}>
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={styles.machineCode}>{machine.code}</Text>
                  <View style={styles.qrBadge}>
                    <Text style={styles.qrBadgeText}>{machine.qrId}</Text>
                  </View>
                </View>
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
                      Counter:{" "}
                      <Text style={styles.counterVal}>
                        {head.lastCount === 0 ? "0 (Unrecorded)" : head.lastCount.toLocaleString()}
                      </Text>
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

            <View style={styles.machineCardFooter}>
              <Ionicons name="camera-outline" size={14} color={Colors.primary} />
              <Text style={styles.machineCardFooterText}>
                Tap to open Machine Display Capture for {machine.code}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Clear Data & Fresh Install Button */}
        <TouchableOpacity
          style={styles.factoryResetBtn}
          onPress={handleFactoryReset}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-bin-outline" size={16} color="#ef4444" />
          <Text style={styles.factoryResetBtnText}>CLEAR DATA & RESET TO FRESH INSTALL</Text>
        </TouchableOpacity>
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
  statsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  freshTag: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  freshTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1d4ed8",
    letterSpacing: 0.5,
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
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  scanIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 12,
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
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    marginTop: 2,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  secondaryActionBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  secondaryActionText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.text,
  },
  listHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  resetPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#fee2e2",
  },
  resetPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ef4444",
  },
  machineCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  machineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: 10,
    marginBottom: 10,
  },
  machineCode: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.text,
  },
  qrBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  qrBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
  },
  machineName: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  typeBadge: {
    backgroundColor: "rgba(10, 115, 192, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 8,
  },
  headInfo: {
    flex: 1,
  },
  headTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.text,
  },
  headCounter: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  counterVal: {
    fontWeight: "800",
    color: Colors.text,
  },
  headStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
  machineCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  machineCardFooterText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: "600",
  },
  factoryResetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: "#fff1f2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecdd3",
    marginTop: 8,
  },
  factoryResetBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#e11d48",
    letterSpacing: 0.5,
  },
});
