import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "../../services/api";

export default function ResetRequestScreen() {
  const router = useRouter();
  const [selectedHead, setSelectedHead] = useState("RMC-01-H1");
  const [beforeCounter, setBeforeCounter] = useState("998500");
  const [afterCounter, setAfterCounter] = useState("1200");
  const [reason, setReason] = useState("Mechanical 1,000,000 rollover counter reset following PM overhaul");
  const [hasBeforePhoto, setHasBeforePhoto] = useState(true);
  const [hasAfterPhoto, setHasAfterPhoto] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const prevNum = parseInt(beforeCounter, 10) || 0;
  const newNum = parseInt(afterCounter, 10) || 0;
  // Rollover formula: (1,000,000 - prev) + new
  const rolloverProd = (1_000_000 - prevNum) + newNum;

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert("Reason Required", "Please enter an official reason for this counter reset.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post("/resets", {
        head_id: selectedHead,
        before_counter: prevNum,
        after_counter: newNum,
        before_photo_base64: "U2FtcGxlQmVmb3JlUGhvdG8=",
        after_photo_base64: "U2FtcGxlQWZ0ZXJQaG90bw==",
        reason: reason,
      });
      Alert.alert(
        "Reset Request Submitted",
        "Your reset request has been queued. A Plant Supervisor must witness and approve this request.",
        [{ text: "OK", onPress: () => router.replace("/(worker)") }]
      );
    } catch (e: any) {
      Alert.alert("Submission Error", e.response?.data?.detail || "Could not submit reset request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Counter Reset Procedure</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Notice Card */}
        <View style={styles.noticeCard}>
          <Ionicons name="shield-alert" size={20} color={Colors.warning} />
          <Text style={styles.noticeText}>
            Critical Rule: Manual reset requires both Before and After HMI photographs and personal Supervisor witness authentication.
          </Text>
        </View>

        {/* Form Inputs */}
        <View style={styles.card}>
          <Text style={styles.label}>Select Machine Head</Text>
          <TextInput
            style={styles.input}
            value={selectedHead}
            onChangeText={setSelectedHead}
          />

          <View style={styles.counterRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Before-Reset Counter</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={beforeCounter}
                onChangeText={setBeforeCounter}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>After-Reset Counter</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={afterCounter}
                onChangeText={setAfterCounter}
              />
            </View>
          </View>

          {/* Photo Evidences */}
          <Text style={styles.label}>Mandatory Evidence Capture</Text>
          <View style={styles.photoRow}>
            <View style={[styles.photoBox, hasBeforePhoto && styles.photoBoxReady]}>
              <Ionicons
                name={hasBeforePhoto ? "checkmark-circle" : "camera"}
                size={24}
                color={hasBeforePhoto ? Colors.success : Colors.textMuted}
              />
              <Text style={styles.photoText}>Before-Reset Photo</Text>
            </View>

            <View style={[styles.photoBox, hasAfterPhoto && styles.photoBoxReady]}>
              <Ionicons
                name={hasAfterPhoto ? "checkmark-circle" : "camera"}
                size={24}
                color={hasAfterPhoto ? Colors.success : Colors.textMuted}
              />
              <Text style={styles.photoText}>After-Reset Photo</Text>
            </View>
          </View>

          {/* Formula calculation preview */}
          <View style={styles.formulaCard}>
            <Text style={styles.formulaTitle}>Calculated Reset Production:</Text>
            <Text style={styles.formulaText}>
              (1,000,000 - {prevNum.toLocaleString()}) + {newNum.toLocaleString()}
            </Text>
            <Text style={styles.formulaResult}>
              = {rolloverProd.toLocaleString()} packets
            </Text>
          </View>

          <Text style={styles.label}>Reason for Counter Reset</Text>
          <TextInput
            style={[styles.input, { height: 70, textAlignVertical: "top" }]}
            multiline
            value={reason}
            onChangeText={setReason}
          />

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>SUBMIT FOR SUPERVISOR WITNESS</Text>
            )}
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 14,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    padding: 6,
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
  noticeCard: {
    flexDirection: "row",
    backgroundColor: Colors.warningLight,
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
    alignItems: "flex-start",
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: "#92400E",
    lineHeight: 18,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: Colors.text,
    marginBottom: 14,
  },
  counterRow: {
    flexDirection: "row",
  },
  photoRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  photoBox: {
    flex: 1,
    height: 90,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.borderLight,
    gap: 6,
  },
  photoBoxReady: {
    borderColor: Colors.success,
    backgroundColor: Colors.successLight,
    borderStyle: "solid",
  },
  photoText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  formulaCard: {
    backgroundColor: Colors.primaryLight,
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
  },
  formulaTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.secondary,
    marginBottom: 4,
  },
  formulaText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  formulaResult: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.primary,
    marginTop: 4,
  },
  submitBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
