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
import { apiClient } from "../../services/api";

export default function SupervisorDashboardScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<any>({
    activeMachines: 7,
    totalHeads: 14,
    completedReadings: 8,
    expectedReadings: 14,
    pendingResets: 1,
    activeAnomalies: 2,
    totalProduction: 42180,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const res = await apiClient.get("/dashboard/summary");
      if (res.data) setSummary(res.data);
    } catch {
      // keep fallback
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <View style={styles.container}>
      <AavinHeader title="AAVIN SUPERVISOR" subtitle="SHIFT MONITORING & VERIFICATION" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Supervisor Action Alert: Pending Reset */}
        <TouchableOpacity
          style={styles.alertCard}
          onPress={() => router.push("/(supervisor)/resets")}
          activeOpacity={0.85}
        >
          <View style={styles.alertIcon}>
            <Ionicons name="refresh-circle" size={28} color={Colors.warning} />
          </View>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>1 Pending Counter Reset Request</Text>
            <Text style={styles.alertSub}>Head RMC-01-H1 requires witness verification</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>

        {/* Shift Completion KPI */}
        <View style={styles.kpiCard}>
          <Text style={styles.cardLabel}>CURRENT SHIFT PROGRESS</Text>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>8 / 14 Heads Captured</Text>
            <Text style={styles.percentText}>57%</Text>
          </View>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: "57%" }]} />
          </View>

          <View style={styles.gridRow}>
            <View style={styles.gridItem}>
              <Text style={styles.gridNum}>{summary.activeMachines || 7}</Text>
              <Text style={styles.gridLabel}>Active Machines</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={[styles.gridNum, { color: Colors.primary }]}>
                {(summary.totalRecordedProduction || 42180).toLocaleString()}
              </Text>
              <Text style={styles.gridLabel}>Packets Manufactured</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={[styles.gridNum, { color: Colors.error }]}>
                {summary.activeAnomalies || 2}
              </Text>
              <Text style={styles.gridLabel}>Active Anomalies</Text>
            </View>
          </View>
        </View>

        {/* Two Supervisor Modules */}
        <Text style={styles.sectionTitle}>Verification & Audit Controls</Text>
        <View style={styles.modulesRow}>
          <TouchableOpacity
            style={styles.moduleBtn}
            onPress={() => router.push("/(supervisor)/resets")}
          >
            <Ionicons name="checkmark-done-circle" size={26} color={Colors.secondary} />
            <Text style={styles.moduleBtnTitle}>Reset Approvals</Text>
            <Text style={styles.moduleBtnSub}>Two-person witness audit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.moduleBtn}
            onPress={() => router.push("/(supervisor)/anomalies")}
          >
            <Ionicons name="warning" size={26} color={Colors.warning} />
            <Text style={styles.moduleBtnTitle}>Review Anomalies</Text>
            <Text style={styles.moduleBtnSub}>Investigation notes</Text>
          </TouchableOpacity>
        </View>
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
  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.warning,
    marginBottom: 16,
  },
  alertIcon: {
    marginRight: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.text,
  },
  alertSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  kpiCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 20,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  percentText: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.primary,
  },
  progressBar: {
    height: 8,
    backgroundColor: Colors.borderLight,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 16,
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 12,
  },
  gridItem: {
    alignItems: "center",
  },
  gridNum: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.text,
  },
  gridLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.secondary,
    marginBottom: 10,
  },
  modulesRow: {
    flexDirection: "row",
    gap: 12,
  },
  moduleBtn: {
    flex: 1,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "flex-start",
  },
  moduleBtnTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 10,
  },
  moduleBtnSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

