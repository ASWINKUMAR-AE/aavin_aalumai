import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";

const EVIDENCE_RECORDS = [
  {
    id: "READ-89421",
    headId: "RMC-01-H1",
    machineCode: "RMC-01",
    machineName: "RMC VFFS Machine 1",
    workerName: "Murugan K. (Operator)",
    captureTime: "2026-10-31 14:02:18 IST",
    serverTime: "2026-10-31 14:02:19 UTC",
    ocrValue: 845230,
    confirmedValue: 845230,
    mismatch: false,
    evidenceSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    readingHash: "54ca113b8dbc9d99f018eac3528b9d21c784ee09b81239aa81f08e458760086c",
    prevHash: "0a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890",
    timeStatus: "verified",
  },
  {
    id: "READ-89415",
    headId: "SAMARPAN-01-H1",
    machineCode: "SAMARPAN-01",
    machineName: "Samarpan Integrus 1",
    workerName: "Senthil P. (Operator)",
    captureTime: "2026-10-31 09:15:40 IST",
    serverTime: "2026-10-31 09:15:41 UTC",
    ocrValue: 312450,
    confirmedValue: 312480,
    mismatch: true,
    mismatchReason: "Glare over last digit 0 partially occluded by overhead light",
    evidenceSha256: "a18b23c98fe41c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    readingHash: "98ab21cf4402bcde1203aa4567ef902188ff6541290bb345ac10298a00223311",
    prevHash: "54ca113b8dbc9d99f018eac3528b9d21c784ee09b81239aa81f08e458760086c",
    timeStatus: "verified",
  },
];

export default function OfficialEvidenceViewerScreen() {
  const [selectedRecord, setSelectedRecord] = useState(EVIDENCE_RECORDS[0]);

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Tamper-Evident Evidence Viewer</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Record Selector Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recordChips}>
          {EVIDENCE_RECORDS.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[styles.chip, selectedRecord.id === r.id && styles.chipActive]}
              onPress={() => setSelectedRecord(r)}
            >
              <Text style={[styles.chipText, selectedRecord.id === r.id && styles.chipTextActive]}>
                {r.headId} ({r.id})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Evidence Card */}
        <View style={styles.evidenceCard}>
          {/* Simulated Physical Photograph Display */}
          <View style={styles.photoBox}>
            <View style={styles.hmiScreen}>
              <Text style={styles.hmiHeader}>AUTHENTIC HMI CAPTURE</Text>
              <Text style={styles.hmiDigits}>{selectedRecord.confirmedValue.toLocaleString()}</Text>
              <Text style={styles.hmiSub}>{selectedRecord.headId} • PACKETS</Text>
            </View>
            <View style={styles.evidenceOverlay}>
              <Ionicons name="camera" size={14} color="#FFF" />
              <Text style={styles.evidenceOverlayText}>Original Camera Capture (Protected Object Key)</Text>
            </View>
          </View>

          {/* OCR vs Confirmed Comparison (Mandatory Rule) */}
          <View style={styles.compareRow}>
            <View style={styles.compareCol}>
              <Text style={styles.compareLabel}>OCR Extracted Value</Text>
              <Text style={styles.ocrNum}>{selectedRecord.ocrValue.toLocaleString()}</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={Colors.textSecondary} />
            <View style={styles.compareCol}>
              <Text style={styles.compareLabel}>Confirmed Value</Text>
              <Text style={[styles.confirmedNum, selectedRecord.mismatch && { color: Colors.warning }]}>
                {selectedRecord.confirmedValue.toLocaleString()}
              </Text>
            </View>
          </View>

          {selectedRecord.mismatch && (
            <View style={styles.mismatchNotice}>
              <Ionicons name="alert-circle" size={16} color={Colors.warning} />
              <Text style={styles.mismatchText}>
                Manual Correction Reason: {selectedRecord.mismatchReason}
              </Text>
            </View>
          )}

          {/* Cryptographic Hashes Verification */}
          <View style={styles.hashSection}>
            <Text style={styles.hashSectionTitle}>Cryptographic Evidence Hashes</Text>

            <View style={styles.hashRow}>
              <Text style={styles.hashKey}>Photo SHA-256:</Text>
              <Text style={styles.hashVal} numberOfLines={1}>{selectedRecord.evidenceSha256}</Text>
            </View>

            <View style={styles.hashRow}>
              <Text style={styles.hashKey}>Reading Hash:</Text>
              <Text style={[styles.hashVal, { color: Colors.primary }]} numberOfLines={1}>
                {selectedRecord.readingHash}
              </Text>
            </View>

            <View style={styles.hashRow}>
              <Text style={styles.hashKey}>Previous Hash:</Text>
              <Text style={styles.hashVal} numberOfLines={1}>{selectedRecord.prevHash}</Text>
            </View>
          </View>

          {/* Metadata */}
          <View style={styles.metaBox}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Operator</Text>
              <Text style={styles.metaVal}>{selectedRecord.workerName}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Capture Time (Device)</Text>
              <Text style={styles.metaVal}>{selectedRecord.captureTime}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Server Anchor Time</Text>
              <Text style={styles.metaVal}>{selectedRecord.serverTime}</Text>
            </View>
          </View>
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
  recordChips: {
    flexDirection: "row",
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text,
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  evidenceCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  photoBox: {
    height: 180,
    backgroundColor: "#0A192F",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    position: "relative",
    borderWidth: 1.5,
    borderColor: "#1E3A8A",
  },
  hmiScreen: {
    alignItems: "center",
  },
  hmiHeader: {
    fontSize: 10,
    fontWeight: "800",
    color: "#93C5FD",
    letterSpacing: 1,
  },
  hmiDigits: {
    fontSize: 36,
    fontWeight: "900",
    color: "#FACC15",
    fontFamily: "monospace",
    marginVertical: 4,
  },
  hmiSub: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.7)",
  },
  evidenceOverlay: {
    position: "absolute",
    bottom: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  evidenceOverlayText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "600",
  },
  compareRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.borderLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  compareCol: {
    alignItems: "center",
  },
  compareLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  ocrNum: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.text,
  },
  confirmedNum: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.primary,
  },
  mismatchNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.warningLight,
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
    gap: 6,
  },
  mismatchText: {
    flex: 1,
    fontSize: 11,
    color: "#92400E",
    fontWeight: "600",
  },
  hashSection: {
    backgroundColor: Colors.primaryLight,
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    gap: 6,
  },
  hashSectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.secondary,
    marginBottom: 4,
  },
  hashRow: {
    flexDirection: "row",
  },
  hashKey: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.textSecondary,
    width: 90,
  },
  hashVal: {
    flex: 1,
    fontSize: 10,
    fontFamily: "monospace",
    color: Colors.text,
  },
  metaBox: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 12,
    gap: 6,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metaLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  metaVal: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.text,
  },
});

