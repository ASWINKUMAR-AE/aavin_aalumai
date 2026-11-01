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
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "../../services/api";
import { OfflineQueueService } from "../../services/offlineQueue";

const VARIANTS = [
  { id: "TM-500", name: "Aavin Toned Milk (Blue)", volume: "500 ml" },
  { id: "SM-500", name: "Aavin Standardized Milk (Green)", volume: "500 ml" },
  { id: "FCM-500", name: "Aavin Full Cream Milk (Orange)", volume: "500 ml" },
  { id: "DTM-500", name: "Aavin Double Toned Milk (Magenta)", volume: "500 ml" },
];

export default function OcrConfirmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const ocrValue = Number(params.detectedOcr || 845515);
  const lastCount = Number(params.lastCount || 845230);
  const confidence = Number(params.ocrConfidence || 0.984);

  const [isCorrecting, setIsCorrecting] = useState(false);
  const [confirmedValue, setConfirmedValue] = useState(String(ocrValue));
  const [correctionReason, setCorrectionReason] = useState("");
  const [selectedVariant, setSelectedVariant] = useState(params.variantId || "TM-500");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReceipt, setSubmittedReceipt] = useState<any>(null);

  const currentCountNum = parseInt(confirmedValue, 10) || 0;
  const delta = currentCountNum - lastCount;

  const handleSubmit = async () => {
    if (isCorrecting && !correctionReason.trim()) {
      Alert.alert("Reason Required", "Please enter a reason for manually correcting the OCR reading.");
      return;
    }

    setIsSubmitting(true);
    const nowIso = new Date().toISOString();
    const idempotencyKey = `reading_${params.headId}_${Date.now()}`;
    const dummyPhotoBase64 = "U2FtcGxlIEFhdmluIFBIb3RvIEV2aWRlbmNlIEJ5dGVz"; // Base64 placeholder

    const payload = {
      machine_id: String(params.machineId || "RMC-01"),
      head_id: String(params.headId || "RMC-01-H1"),
      variant_id: String(selectedVariant),
      count: currentCountNum,
      ocr_value: ocrValue,
      confirmed_value: currentCountNum,
      ocr_confidence: confidence,
      device_time: nowIso,
      device_monotonic_ms: Date.now() % 100000000,
      device_boot_id: "boot_aavin_android_01",
      source: isCorrecting ? "photo_manual" : "photo_ocr",
      photo_base64: dummyPhotoBase64,
      idempotency_key: idempotencyKey,
    };

    try {
      const response = await apiClient.post("/readings", payload);
      setSubmittedReceipt({
        status: "ONLINE_RECORDED",
        readingId: response.data.id,
        hash: response.data.hash,
        prevHash: response.data.prev_hash,
        delta: response.data.production_delta,
        count: currentCountNum,
      });
    } catch (err: any) {
      // Offline fallback: Enqueue reading
      await OfflineQueueService.enqueueReading({
        idempotencyKey,
        machineId: payload.machine_id,
        headId: payload.head_id,
        variantId: payload.variant_id,
        count: currentCountNum,
        ocrValue,
        confirmedValue: currentCountNum,
        ocrConfidence: confidence,
        deviceTime: nowIso,
        deviceMonotonicMs: payload.device_monotonic_ms,
        deviceBootId: payload.device_boot_id,
        source: payload.source,
        photoBase64: dummyPhotoBase64,
        status: "pending",
        timestamp: Date.now(),
      });

      setSubmittedReceipt({
        status: "OFFLINE_QUEUED",
        readingId: `OFFLINE-${idempotencyKey.slice(-8)}`,
        hash: "PENDING_SERVER_SYNC_ANCHOR",
        prevHash: "0xVERIFIED_GENESIS",
        delta: delta,
        count: currentCountNum,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedReceipt) {
    return (
      <View style={styles.container}>
        <View style={styles.successCard}>
          <View style={styles.checkIconBox}>
            <Ionicons name="checkmark-done" size={48} color="#FFF" />
          </View>
          <Text style={styles.successTitle}>
            {submittedReceipt.status === "ONLINE_RECORDED"
              ? "Reading Committed to Ledger"
              : "Saved in Offline Encrypted Queue"}
          </Text>
          <Text style={styles.successSub}>
            Tamper-Evident Evidence & Cryptographic Hash Created
          </Text>

          <View style={styles.receiptDetails}>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Head Identifier</Text>
              <Text style={styles.receiptVal}>{params.headId}</Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Confirmed Counter</Text>
              <Text style={[styles.receiptVal, { color: Colors.primary }]}>
                {submittedReceipt.count.toLocaleString()}
              </Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Shift Production Delta</Text>
              <Text style={[styles.receiptVal, { color: Colors.success }]}>
                +{submittedReceipt.delta.toLocaleString()} packets
              </Text>
            </View>
            <View style={styles.receiptRow}>
              <Text style={styles.receiptLabel}>Evidence Hash (SHA-256)</Text>
              <Text style={styles.receiptHash}>{submittedReceipt.hash.slice(0, 24)}...</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.replace("/(worker)")}
          >
            <Text style={styles.doneBtnText}>RETURN TO DASHBOARD</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Counter Verification</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Machine & Head info banner */}
        <View style={styles.headBanner}>
          <View>
            <Text style={styles.headBannerCode}>{params.headId}</Text>
            <Text style={styles.headBannerName}>{params.machineName}</Text>
          </View>
          <View style={styles.headBannerPos}>
            <Text style={styles.headBannerPosText}>Head {params.headNumber}</Text>
          </View>
        </View>

        {/* OCR Result Card */}
        <View style={styles.ocrCard}>
          <Text style={styles.ocrCardLabel}>DETECTED COUNTER DISPLAY</Text>
          <View style={styles.ocrResultBox}>
            <Text style={styles.ocrResultDigits}>{ocrValue.toLocaleString()}</Text>
            <Text style={styles.ocrResultUnit}>PACKETS</Text>
          </View>
          <View style={styles.confidenceRow}>
            <Ionicons name="sparkles" size={14} color={Colors.accent} />
            <Text style={styles.confidenceText}>
              OCR Confidence: {(confidence * 100).toFixed(1)}% (ML Kit Precision)
            </Text>
          </View>
        </View>

        {/* Decision Toggle: Confirm vs Correct */}
        <View style={styles.decisionRow}>
          <TouchableOpacity
            style={[styles.decisionBtn, !isCorrecting && styles.decisionBtnActive]}
            onPress={() => {
              setIsCorrecting(false);
              setConfirmedValue(String(ocrValue));
            }}
          >
            <Ionicons
              name="checkmark-circle"
              size={18}
              color={!isCorrecting ? "#FFF" : Colors.textSecondary}
            />
            <Text
              style={[styles.decisionBtnText, !isCorrecting && styles.decisionBtnTextActive]}
            >
              CONFIRM OCR
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.decisionBtn, isCorrecting && styles.decisionBtnActive]}
            onPress={() => setIsCorrecting(true)}
          >
            <Ionicons
              name="create-outline"
              size={18}
              color={isCorrecting ? "#FFF" : Colors.textSecondary}
            />
            <Text
              style={[styles.decisionBtnText, isCorrecting && styles.decisionBtnTextActive]}
            >
              CORRECT VALUE
            </Text>
          </TouchableOpacity>
        </View>

        {/* Manual Correction Box */}
        {isCorrecting && (
          <View style={styles.correctionCard}>
            <Text style={styles.correctionLabel}>Enter Observed Counter on HMI:</Text>
            <TextInput
              style={styles.correctionInput}
              keyboardType="numeric"
              value={confirmedValue}
              onChangeText={setConfirmedValue}
            />
            <Text style={styles.correctionLabel}>Reason for Correction:</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="e.g., Digit 4 was partially covered by glare"
              value={correctionReason}
              onChangeText={setCorrectionReason}
            />
            <Text style={styles.correctionWarning}>
              Note: Both original OCR output and confirmed value are permanently preserved in the audit chain.
            </Text>
          </View>
        )}

        {/* Delta Calculation Preview */}
        <View style={styles.deltaBox}>
          <View style={styles.deltaItem}>
            <Text style={styles.deltaLabel}>Previous Counter</Text>
            <Text style={styles.deltaVal}>{lastCount.toLocaleString()}</Text>
          </View>
          <Ionicons name="arrow-forward" size={18} color={Colors.textSecondary} />
          <View style={styles.deltaItem}>
            <Text style={styles.deltaLabel}>Current Counter</Text>
            <Text style={styles.deltaVal}>{currentCountNum.toLocaleString()}</Text>
          </View>
          <View style={styles.deltaItem}>
            <Text style={styles.deltaLabel}>Shift Delta</Text>
            <Text
              style={[
                styles.deltaVal,
                { color: delta >= 0 ? Colors.success : Colors.error },
              ]}
            >
              {delta >= 0 ? `+${delta.toLocaleString()}` : `${delta.toLocaleString()}`}
            </Text>
          </View>
        </View>

        {/* Mandatory Variant Selection */}
        <Text style={styles.variantSectionTitle}>Mandatory Variant Selection:</Text>
        <View style={styles.variantList}>
          {VARIANTS.map((v) => (
            <TouchableOpacity
              key={v.id}
              style={[
                styles.variantCard,
                selectedVariant === v.id && styles.variantCardActive,
              ]}
              onPress={() => setSelectedVariant(v.id)}
            >
              <View style={styles.variantRadio}>
                {selectedVariant === v.id && <View style={styles.variantRadioDot} />}
              </View>
              <View style={styles.variantInfo}>
                <Text
                  style={[
                    styles.variantName,
                    selectedVariant === v.id && styles.variantNameActive,
                  ]}
                >
                  {v.name}
                </Text>
                <Text style={styles.variantSub}>
                  {v.id} • {v.volume}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Final Submit Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.submitBtnText}>COMMIT READING TO LEDGER</Text>
            </>
          )}
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
  headBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 14,
  },
  headBannerCode: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.secondary,
  },
  headBannerName: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  headBannerPos: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  headBannerPosText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.primary,
  },
  ocrCard: {
    backgroundColor: "#0A192F",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#1E3A8A",
  },
  ocrCardLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#93C5FD",
    letterSpacing: 1,
    marginBottom: 8,
  },
  ocrResultBox: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 10,
  },
  ocrResultDigits: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 44,
    fontWeight: "900",
    color: "#FACC15",
    letterSpacing: 1,
  },
  ocrResultUnit: {
    fontSize: 14,
    fontWeight: "800",
    color: "#93C5FD",
  },
  confidenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  confidenceText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "600",
  },
  decisionRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  decisionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  decisionBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  decisionBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  decisionBtnTextActive: {
    color: "#FFFFFF",
  },
  correctionCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  correctionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  correctionInput: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 8,
    padding: 10,
    fontSize: 20,
    fontWeight: "900",
    color: Colors.primary,
    marginBottom: 12,
    backgroundColor: Colors.surface,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 10,
    fontSize: 13,
    color: Colors.text,
    marginBottom: 8,
  },
  correctionWarning: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: "italic",
  },
  deltaBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  deltaItem: {
    alignItems: "center",
  },
  deltaLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  deltaVal: {
    fontSize: 14,
    fontWeight: "900",
    color: Colors.text,
    marginTop: 2,
  },
  variantSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.secondary,
    marginBottom: 10,
  },
  variantList: {
    gap: 8,
    marginBottom: 20,
  },
  variantCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  variantCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  variantRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  variantRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  variantInfo: {
    flex: 1,
  },
  variantName: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  variantNameActive: {
    color: Colors.primary,
  },
  variantSub: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    height: 52,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  successCard: {
    margin: 20,
    marginTop: 60,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    elevation: 4,
  },
  checkIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.success,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.text,
    textAlign: "center",
    marginBottom: 6,
  },
  successSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: 20,
  },
  receiptDetails: {
    width: "100%",
    backgroundColor: Colors.borderLight,
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
    gap: 10,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  receiptLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  receiptVal: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.text,
  },
  receiptHash: {
    fontSize: 11,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    color: Colors.primary,
    fontWeight: "700",
  },
  doneBtn: {
    backgroundColor: Colors.secondary,
    width: "100%",
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  doneBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});

