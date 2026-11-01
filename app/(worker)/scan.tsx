import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "../../services/api";

const PRIMARY_MACHINES = [
  { qrId: "QR-001", machineId: "RMC-01", name: "RMC VFFS Machine 1", type: "RMC", heads: 2 },
  { qrId: "QR-002", machineId: "RMC-02", name: "RMC VFFS Machine 2", type: "RMC", heads: 2 },
  { qrId: "QR-003", machineId: "SMP-01", name: "Samarpan Integrus 1", type: "Samarpan", heads: 2 },
  { qrId: "QR-004", machineId: "SMP-02", name: "Samarpan Integrus 2", type: "Samarpan", heads: 2 },
  { qrId: "QR-005", machineId: "SMP-03", name: "Samarpan Integrus 3", type: "Samarpan", heads: 2 },
  { qrId: "QR-006", machineId: "ATM-01", name: "Atomic Engineers 1", type: "Atomic Engineers", heads: 2 },
];

export default function MachineQrScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [torch, setTorch] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(PRIMARY_MACHINES[0]);
  const [isValidating, setIsValidating] = useState(false);
  const isCooldownRef = useRef(false);

  const handleProcessMachineQr = async (qrPayloadString: string) => {
    if (isCooldownRef.current) return;
    isCooldownRef.current = true;
    setIsValidating(true);

    try {
      const res = await apiClient.post("/machines/qr/validate", {
        qr_text: qrPayloadString,
      });

      if (res.data && res.data.valid) {
        router.push({
          pathname: "/(worker)/display-capture",
          params: {
            machineId: res.data.machine_code || res.data.machine_id,
            qrId: res.data.qr_id,
            machineName: res.data.machine_name,
            machineType: res.data.machine_type,
          },
        });
      } else {
        Alert.alert("QR Validation Failed", res.data?.error || "Unrecognized machine QR code.");
      }
    } catch (err: any) {
      // Local fallback navigation for offline floor use
      router.push({
        pathname: "/(worker)/display-capture",
        params: {
          machineId: selectedMachine.machineId,
          qrId: selectedMachine.qrId,
          machineName: selectedMachine.name,
          machineType: selectedMachine.type,
        },
      });
    } finally {
      setIsValidating(false);
      setTimeout(() => {
        isCooldownRef.current = false;
      }, 1500);
    }
  };

  const handleSelectAndProceed = () => {
    const payload = JSON.stringify({
      type: "AAVIN_MACHINE",
      version: 1,
      machine_id: selectedMachine.machineId,
      qr_id: selectedMachine.qrId,
    });
    handleProcessMachineQr(payload);
  };

  return (
    <View style={styles.container}>
      {/* Top Bar with Safe Area */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 14) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.topBarTitle}>Scan Machine QR</Text>
          <Text style={styles.topBarSub}>Step 1: Identify Milk Pouch Machine</Text>
        </View>
        <TouchableOpacity
          onPress={() => setTorch(!torch)}
          style={[styles.iconBtn, torch && styles.iconBtnActive]}
          activeOpacity={0.7}
        >
          <Ionicons name={torch ? "flash" : "flash-outline"} size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Camera Viewfinder Area */}
      <View style={styles.cameraBox}>
        {/* Brand Crest in Viewfinder Header */}
        <View style={styles.viewfinderBrand}>
          <Image
            source={require("../../assets/brand/aavin-aalumai-logo.png")}
            style={styles.aavinLogo}
            resizeMode="contain"
          />
          <Text style={styles.brandTitleText}>AAVIN AALUMAI</Text>
        </View>

        {/* Reticle with High-Contrast Green/White Corners */}
        <View style={styles.reticle}>
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
          <Ionicons name="qr-code-outline" size={88} color="rgba(255, 255, 255, 0.45)" />
        </View>

        <Text style={styles.instructionText}>
          Scan the QR code attached to the milk pouch packing machine.
        </Text>
      </View>

      {/* Bottom Machine Selection Card */}
      <View style={[styles.resultCard, { paddingBottom: Math.max(insets.bottom + 8, 20) }]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.identifiedLabel}>MACHINE QR IDENTIFIER</Text>
            <Text style={styles.headCodeText}>
              {selectedMachine.machineId} • {selectedMachine.name}
            </Text>
          </View>
          <View style={styles.verifiedBadge}>
            <Ionicons name="shield-checkmark" size={14} color={Colors.success} />
            <Text style={styles.verifiedText}>{selectedMachine.qrId}</Text>
          </View>
        </View>

        <Text style={styles.switchLabel}>Tap Machine Sticker to Select or Test:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillScroll}
          contentContainerStyle={{ paddingRight: 10 }}
        >
          {PRIMARY_MACHINES.map((m) => (
            <TouchableOpacity
              key={m.qrId}
              style={[styles.machinePill, selectedMachine.qrId === m.qrId && styles.machinePillActive]}
              onPress={() => setSelectedMachine(m)}
            >
              <Text
                style={[
                  styles.machinePillText,
                  selectedMachine.qrId === m.qrId && styles.machinePillTextActive,
                ]}
              >
                {m.machineId}
              </Text>
              <Text
                style={[
                  styles.machinePillSub,
                  selectedMachine.qrId === m.qrId && styles.machinePillSubActive,
                ]}
              >
                {m.type}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={styles.proceedBtn}
          onPress={handleSelectAndProceed}
          disabled={isValidating}
          activeOpacity={0.85}
        >
          {isValidating ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="arrow-forward-circle" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.proceedBtnText}>VIEW MACHINE & SELECT HEAD</Text>
            </>
          )}
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
    paddingBottom: 14,
    backgroundColor: "#0A73C0",
  },
  titleContainer: {
    alignItems: "center",
  },
  topBarTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  topBarSub: {
    color: "#BAE6FD",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  iconBtnActive: {
    backgroundColor: Colors.accent,
  },
  cameraBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  viewfinderBrand: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(10, 115, 192, 0.4)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 20,
    gap: 8,
  },
  aavinLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  brandTitleText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  reticle: {
    width: 240,
    height: 240,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 32,
    height: 32,
    borderColor: "#10B981",
  },
  tl: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 18 },
  tr: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 18 },
  bl: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 18 },
  br: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 18 },
  instructionText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 20,
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  identifiedLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.accent,
    letterSpacing: 0.8,
  },
  headCodeText: {
    fontSize: 17,
    fontWeight: "900",
    color: Colors.text,
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.success,
  },
  switchLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  pillScroll: {
    marginBottom: 16,
  },
  machinePill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.borderLight,
    marginRight: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  machinePillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  machinePillText: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.text,
  },
  machinePillTextActive: {
    color: "#FFFFFF",
  },
  machinePillSub: {
    fontSize: 9,
    color: Colors.textSecondary,
    marginTop: 1,
    fontWeight: "600",
  },
  machinePillSubActive: {
    color: "#BAE6FD",
  },
  proceedBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 50,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  proceedBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
