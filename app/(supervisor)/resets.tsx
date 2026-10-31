import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const DEMO_RESETS = [
  {
    id: "RST-2026-001",
    headId: "RMC-01-H1",
    workerId: "worker1",
    workerName: "Murugan K. (Operator)",
    beforeCounter: 998500,
    afterCounter: 1200,
    calculatedProduction: 2700,
    reason: "Scheduled mechanical 1,000,000 rollover counter reset following preventive maintenance",
    status: "pending",
    requestedAt: "Today, 13:45 IST",
  },
];

export default function SupervisorResetsScreen() {
  const { user } = useAuth();
  const [resets, setResets] = useState(DEMO_RESETS);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchResets();
  }, []);

  const fetchResets = async () => {
    try {
      const res = await apiClient.get("/resets?status=pending");
      if (res.data && res.data.length > 0) {
        setResets(res.data);
      }
    } catch {
      // keep fallback
    }
  };

  const handleAction = async (resetId: string, workerId: string, action: "approved" | "rejected") => {
    // Critical Business Rule: A supervisor cannot approve their own reset procedure
    if (user?.username === workerId) {
      Alert.alert(
        "Self-Approval Prohibited",
        "Conflict of interest: A supervisor cannot witness or approve their own reset request."
      );
      return;
    }

    setIsProcessing(true);
    try {
      await apiClient.post(`/resets/${resetId}/approve`, {
        status: action,
        reason: action === "approved" ? "Witnessed in person on factory floor" : "Counter readings mismatch",
      });
      Alert.alert("Success", `Reset request marked as ${action.toUpperCase()}`);
      setResets(resets.filter((r) => r.id !== resetId));
    } catch (e: any) {
      Alert.alert("Action Failed", e.response?.data?.detail || "Could not complete approval.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Witnessed Reset Approvals</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.ruleCard}>
          <Ionicons name="information-circle" size={20} color={Colors.primary} />
          <Text style={styles.ruleText}>
            Dual-Person Protocol: Verify both physical HMI photos. Rollover production is calculated automatically: (1,000,000 - Before) + After.
          </Text>
        </View>

        {resets.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color={Colors.success} />
            <Text style={styles.emptyTitle}>All Reset Requests Cleared</Text>
            <Text style={styles.emptySub}>No pending reset witness verifications.</Text>
          </View>
        ) : (
          resets.map((r) => (
            <View key={r.id} style={styles.resetCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.headText}>{r.headId}</Text>
                  <Text style={styles.subText}>Requested by {r.workerName || r.workerId}</Text>
                </View>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingText}>PENDING WITNESS</Text>
                </View>
              </View>

              {/* Photos Comparison Box */}
              <View style={styles.photoCompareRow}>
                <View style={styles.photoBox}>
                  <Ionicons name="image" size={20} color={Colors.primary} />
                  <Text style={styles.photoLabel}>Before Photo</Text>
                  <Text style={styles.photoCount}>{r.beforeCounter.toLocaleString()}</Text>
                </View>

                <Ionicons name="arrow-forward" size={18} color={Colors.textSecondary} />

                <View style={styles.photoBox}>
                  <Ionicons name="image" size={20} color={Colors.primary} />
                  <Text style={styles.photoLabel}>After Photo</Text>
                  <Text style={styles.photoCount}>{r.afterCounter.toLocaleString()}</Text>
                </View>
              </View>

              {/* Rollover Calculation */}
              <View style={styles.calcBox}>
                <Text style={styles.calcLabel}>Rollover Production Credit:</Text>
                <Text style={styles.calcVal}>
                  +{((1_000_000 - r.beforeCounter) + r.afterCounter).toLocaleString()} packets
                </Text>
              </View>

              <Text style={styles.reasonText}>Reason: {r.reason}</Text>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleAction(r.id, r.workerId, "rejected")}
                  disabled={isProcessing}
                >
                  <Text style={styles.rejectBtnText}>REJECT</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => handleAction(r.id, r.workerId, "approved")}
                  disabled={isProcessing}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                  <Text style={styles.approveBtnText}>APPROVE RESET</Text>
                </TouchableOpacity>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  ruleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  ruleText: {
    flex: 1,
    fontSize: 12,
    color: Colors.secondary,
    lineHeight: 18,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    padding: 30,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  resetCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  headText: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.secondary,
  },
  subText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  pendingBadge: {
    backgroundColor: Colors.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  pendingText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#B45309",
  },
  photoCompareRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  photoBox: {
    flex: 1,
    backgroundColor: Colors.borderLight,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  photoLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginTop: 4,
  },
  photoCount: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.primary,
    marginTop: 2,
  },
  calcBox: {
    backgroundColor: Colors.primaryLight,
    padding: 10,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  calcLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.secondary,
  },
  calcVal: {
    fontSize: 13,
    fontWeight: "900",
    color: Colors.primary,
  },
  reasonText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  rejectBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.error,
    justifyContent: "center",
    alignItems: "center",
  },
  rejectBtnText: {
    color: Colors.error,
    fontSize: 13,
    fontWeight: "800",
  },
  approveBtn: {
    flex: 2,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.success,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  approveBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
});
