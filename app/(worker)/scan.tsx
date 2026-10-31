import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";

const REGISTERED_HEADS = [
  { id: "RMC-01-H1", machineId: "RMC-01", machineName: "RMC VFFS Machine 1", headNumber: 1, lastCount: 845230, variant: "TM-500", qr: "AAVIN://MADURAI/DAIRY/RMC-01/HEAD_1" },
  { id: "RMC-01-H2", machineId: "RMC-01", machineName: "RMC VFFS Machine 1", headNumber: 2, lastCount: 841100, variant: "TM-500", qr: "AAVIN://MADURAI/DAIRY/RMC-01/HEAD_2" },
  { id: "RMC-02-H1", machineId: "RMC-02", machineName: "RMC VFFS Machine 2", headNumber: 1, lastCount: 520400, variant: "SM-500", qr: "AAVIN://MADURAI/DAIRY/RMC-02/HEAD_1" },
  { id: "RMC-02-H2", machineId: "RMC-02", machineName: "RMC VFFS Machine 2", headNumber: 2, lastCount: 518900, variant: "SM-500", qr: "AAVIN://MADURAI/DAIRY/RMC-02/HEAD_2" },
  { id: "SAMARPAN-01-H1", machineId: "SAMARPAN-01", machineName: "Samarpan Integrus 1", headNumber: 1, lastCount: 312450, variant: "FCM-500", qr: "AAVIN://MADURAI/DAIRY/SAMARPAN-01/HEAD_1" },
  { id: "SAMARPAN-01-H2", machineId: "SAMARPAN-01", machineName: "Samarpan Integrus 1", headNumber: 2, lastCount: 310890, variant: "FCM-500", qr: "AAVIN://MADURAI/DAIRY/SAMARPAN-01/HEAD_2" },
  { id: "SAMARPAN-02-H1", machineId: "SAMARPAN-02", machineName: "Samarpan Integrus 2", headNumber: 1, lastCount: 654200, variant: "TM-500", qr: "AAVIN://MADURAI/DAIRY/SAMARPAN-02/HEAD_1" },
  { id: "SAMARPAN-02-H2", machineId: "SAMARPAN-02", machineName: "Samarpan Integrus 2", headNumber: 2, lastCount: 652100, variant: "TM-500", qr: "AAVIN://MADURAI/DAIRY/SAMARPAN-02/HEAD_2" },
  { id: "SAMARPAN-03-H1", machineId: "SAMARPAN-03", machineName: "Samarpan Integrus 3", headNumber: 1, lastCount: 198400, variant: "DTM-500", qr: "AAVIN://MADURAI/DAIRY/SAMARPAN-03/HEAD_1" },
  { id: "SAMARPAN-03-H2", machineId: "SAMARPAN-03", machineName: "Samarpan Integrus 3", headNumber: 2, lastCount: 197250, variant: "DTM-500", qr: "AAVIN://MADURAI/DAIRY/SAMARPAN-03/HEAD_2" },
  { id: "ATOMIC-01-H1", machineId: "ATOMIC-01", machineName: "Atomic Engineers 1", headNumber: 1, lastCount: 442100, variant: "SM-500", qr: "AAVIN://MADURAI/DAIRY/ATOMIC-01/HEAD_1" },
  { id: "ATOMIC-01-H2", machineId: "ATOMIC-01", machineName: "Atomic Engineers 1", headNumber: 2, lastCount: 440950, variant: "SM-500", qr: "AAVIN://MADURAI/DAIRY/ATOMIC-01/HEAD_2" },
  { id: "ATOMIC-02-H1", machineId: "ATOMIC-02", machineName: "Atomic Engineers 2", headNumber: 1, lastCount: 785600, variant: "TM-500", qr: "AAVIN://MADURAI/DAIRY/ATOMIC-02/HEAD_1" },
  { id: "ATOMIC-02-H2", machineId: "ATOMIC-02", machineName: "Atomic Engineers 2", headNumber: 2, lastCount: 783400, variant: "TM-500", qr: "AAVIN://MADURAI/DAIRY/ATOMIC-02/HEAD_2" },
];

export default function QrScannerScreen() {
  const router = useRouter();
  const [torch, setTorch] = useState(false);
  const [selectedHead, setSelectedHead] = useState(REGISTERED_HEADS[0]);

  const handleProceed = () => {
    router.push({
      pathname: "/(worker)/capture",
      params: {
        headId: selectedHead.id,
        machineId: selectedHead.machineId,
        machineName: selectedHead.machineName,
        headNumber: selectedHead.headNumber,
        lastCount: selectedHead.lastCount,
        variantId: selectedHead.variant,
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Head QR Identification</Text>
        <TouchableOpacity
          onPress={() => setTorch(!torch)}
          style={[styles.iconBtn, torch && styles.iconBtnActive]}
        >
          <Ionicons name={torch ? "flash" : "flash-outline"} size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Camera Viewfinder Overlay */}
      <View style={styles.cameraBox}>
        <View style={styles.reticle}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
          <Ionicons name="scan-outline" size={80} color="rgba(255, 255, 255, 0.4)" />
        </View>
        <Text style={styles.instructionText}>Align physical QR sticker within frame</Text>
      </View>

      {/* Head Identification Result Card */}
      <View style={styles.resultCard}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.headCodeText}>{selectedHead.id}</Text>
            <Text style={styles.machineNameText}>{selectedHead.machineName}</Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
            <Text style={styles.verifiedText}>REGISTERED HEAD</Text>
          </View>
        </View>

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Head Position</Text>
            <Text style={styles.metaVal}>Head {selectedHead.headNumber} of 2</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Last Counter</Text>
            <Text style={[styles.metaVal, { color: Colors.primary }]}>
              {selectedHead.lastCount.toLocaleString()}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Required Variant</Text>
            <Text style={styles.metaVal}>{selectedHead.variant}</Text>
          </View>
        </View>

        {/* Quick Head Switcher for Plant Operator Selection */}
        <Text style={styles.switchLabel}>Select Head QR to Scan:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.headPillScroll}>
          {REGISTERED_HEADS.map((h) => (
            <TouchableOpacity
              key={h.id}
              style={[styles.headPill, selectedHead.id === h.id && styles.headPillActive]}
              onPress={() => setSelectedHead(h)}
            >
              <Text
                style={[styles.headPillText, selectedHead.id === h.id && styles.headPillTextActive]}
              >
                {h.id}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.proceedBtn} onPress={handleProceed} activeOpacity={0.85}>
          <Ionicons name="camera" size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.proceedBtnText}>PROCEED TO CAMERA CAPTURE</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A1128",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 14,
  },
  topBarTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  iconBtnActive: {
    backgroundColor: Colors.accent,
  },
  cameraBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  reticle: {
    width: 240,
    height: 240,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: Colors.primary,
  },
  tl: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 16 },
  tr: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 16 },
  bl: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 16 },
  br: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 16 },
  instructionText: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 20,
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 32,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  headCodeText: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.text,
  },
  machineNameText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.success,
  },
  metaGrid: {
    flexDirection: "row",
    backgroundColor: Colors.borderLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  metaVal: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 2,
  },
  switchLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  headPillScroll: {
    flexDirection: "row",
    marginBottom: 16,
  },
  headPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.borderLight,
    marginRight: 8,
  },
  headPillActive: {
    backgroundColor: Colors.primary,
  },
  headPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text,
  },
  headPillTextActive: {
    color: "#FFFFFF",
  },
  proceedBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 50,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  proceedBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
