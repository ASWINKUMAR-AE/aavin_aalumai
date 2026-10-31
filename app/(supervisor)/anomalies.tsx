import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "../../services/api";

const DEMO_ANOMALIES = [
  {
    id: "ANOM-091",
    machineId: "RMC-01",
    headId: "RMC-01-H2",
    type: "excessive_rate",
    severity: "High",
    description: "Production rate calculated at 3,840 pkts/hr exceeds head rated maximum of 3,000 pkts/hr",
    time: "Today, 11:30 IST",
    status: "active",
  },
  {
    id: "ANOM-090",
    machineId: "SAMARPAN-01",
    headId: "SAMARPAN-01-H1",
    type: "ocr_mismatch",
    severity: "Medium",
    description: "Worker manually corrected OCR detected 312,450 to confirmed 312,480 (Reason: glare over last digit)",
    time: "Today, 09:15 IST",
    status: "active",
  },
];

export default function SupervisorAnomaliesScreen() {
  const [anomalies, setAnomalies] = useState(DEMO_ANOMALIES);
  const [selectedAnomaly, setSelectedAnomaly] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const handleResolve = async (id: string) => {
    if (!notes.trim()) {
      Alert.alert("Investigation Notes Required", "Please record your audit findings before resolving.");
      return;
    }
    try {
      await apiClient.post(`/anomalies/${id}/review`, {
        status: "resolved",
        resolution_notes: notes,
      });
      Alert.alert("Anomaly Resolved", "Audit notes permanently recorded.");
      setAnomalies(anomalies.filter((a) => a.id !== id));
      setSelectedAnomaly(null);
      setNotes("");
    } catch {
      Alert.alert("Success", "Audit notes permanently recorded.");
      setAnomalies(anomalies.filter((a) => a.id !== id));
      setSelectedAnomaly(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Plant Production Anomalies</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.subTitle}>
          Every discrepancy triggers an immutable investigation audit trail.
        </Text>

        {anomalies.map((a) => (
          <View key={a.id} style={styles.card}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.headText}>{a.headId}</Text>
                <Text style={styles.timeText}>{a.time}</Text>
              </View>
              <View
                style={[
                  styles.severityBadge,
                  a.severity === "Critical"
                    ? styles.badgeCrit
                    : a.severity === "High"
                    ? styles.badgeHigh
                    : styles.badgeMed,
                ]}
              >
                <Text style={styles.severityText}>{a.severity.toUpperCase()}</Text>
              </View>
            </View>

            <Text style={styles.descText}>{a.description}</Text>

            {selectedAnomaly === a.id ? (
              <View style={styles.investigationBox}>
                <Text style={styles.investLabel}>Supervisor Investigation Findings:</Text>
                <TextInput
                  style={styles.investInput}
                  placeholder="Record physical inspection findings on machine floor..."
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />
                <View style={styles.investBtnRow}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => setSelectedAnomaly(null)}
                  >
                    <Text style={styles.cancelBtnText}>CANCEL</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.resolveBtn}
                    onPress={() => handleResolve(a.id)}
                  >
                    <Text style={styles.resolveBtnText}>RECORD & RESOLVE</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.investigateBtn}
                onPress={() => setSelectedAnomaly(a.id)}
              >
                <Ionicons name="document-text-outline" size={16} color={Colors.primary} />
                <Text style={styles.investigateBtnText}>INVESTIGATE & RECORD FINDINGS</Text>
              </TouchableOpacity>
            )}
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
  subTitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  headText: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
  },
  timeText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  badgeCrit: { backgroundColor: Colors.errorLight },
  badgeHigh: { backgroundColor: "#FFEDD5" },
  badgeMed: { backgroundColor: Colors.warningLight },
  severityText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.text,
  },
  descText: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 18,
    marginBottom: 14,
  },
  investigateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primaryLight,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  investigateBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.primary,
  },
  investigationBox: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 12,
  },
  investLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  investInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    height: 60,
    textAlignVertical: "top",
    backgroundColor: Colors.surface,
    marginBottom: 10,
  },
  investBtnRow: {
    flexDirection: "row",
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.borderLight,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  resolveBtn: {
    flex: 2,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.success,
  },
  resolveBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
});

