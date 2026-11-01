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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "../../services/api";

export default function WastageEntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [machineId, setMachineId] = useState("RMC-01");
  const [headId, setHeadId] = useState("RMC-01-H1");
  const [variantId, setVariantId] = useState("TM-500");
  const [packetCount, setPacketCount] = useState("18");
  const [weightKg, setWeightKg] = useState("9.2");
  const [reason, setReason] = useState("Pouch sealing leak during initial temperature ramp");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!packetCount || !reason.trim()) {
      Alert.alert("Required Fields", "Please enter wastage count and valid reason.");
      return;
    }
    setIsSubmitting(true);
    try {
      await apiClient.post("/operations/wastage", {
        machine_id: machineId,
        head_id: headId,
        shift_id: "shift-1",
        variant_id: variantId,
        packet_count: parseInt(packetCount, 10),
        weight_kg: parseFloat(weightKg) || null,
        reason: reason,
        photo_base64: "U2FtcGxlV2FzdGFnZVBob3Rv",
      });
      Alert.alert(
        "Wastage Recorded",
        "Entry recorded as SELF-REPORTED. It will remain separated until a Supervisor verifies the physical tray.",
        [{ text: "OK", onPress: () => router.replace("/(worker)") }]
      );
    } catch (e: any) {
      Alert.alert("Submission Error", e.response?.data?.detail || "Could not submit wastage record.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 14) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Record Pouch Wastage</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Verification Status Warning */}
        <View style={styles.statusBanner}>
          <Ionicons name="information-circle" size={20} color={Colors.primary} />
          <Text style={styles.statusBannerText}>
            Wastage is labeled <Text style={{ fontWeight: "900" }}>SELF-REPORTED</Text> and kept strictly separate from verified production totals.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Machine Code</Text>
          <TextInput style={styles.input} value={machineId} onChangeText={setMachineId} />

          <Text style={styles.label}>Head ID</Text>
          <TextInput style={styles.input} value={headId} onChangeText={setHeadId} />

          <Text style={styles.label}>Milk Variant</Text>
          <TextInput style={styles.input} value={variantId} onChangeText={setVariantId} />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Wastage Packets</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={packetCount}
                onChangeText={setPacketCount}
              />
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Weight in Kg (Optional)</Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                value={weightKg}
                onChangeText={setWeightKg}
              />
            </View>
          </View>

          <Text style={styles.label}>Wastage Reason</Text>
          <TextInput
            style={[styles.input, { height: 70, textAlignVertical: "top" }]}
            multiline
            value={reason}
            onChangeText={setReason}
          />

          <View style={styles.photoBox}>
            <Ionicons name="camera-outline" size={24} color={Colors.primary} />
            <Text style={styles.photoText}>Waste Tray / Scale Evidence Attached</Text>
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitBtnText}>SUBMIT SELF-REPORTED WASTAGE</Text>
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
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
  },
  statusBannerText: {
    flex: 1,
    fontSize: 12,
    color: Colors.secondary,
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
  row: {
    flexDirection: "row",
  },
  photoBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.borderLight,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  photoText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  submitBtn: {
    backgroundColor: Colors.error,
    borderRadius: 12,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});

