import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import { CameraView, useCameraPermissions, BarcodeScanningResult } from "expo-camera";
import * as Haptics from "expo-haptics";
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
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState<boolean>(false);
  const [scanned, setScanned] = useState<boolean>(false);
  const [selectedMachine, setSelectedMachine] = useState(PRIMARY_MACHINES[2]); // Default Samarpan SMP-01
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [scannedFeedback, setScannedFeedback] = useState<string | null>(null);
  const isCooldownRef = useRef<boolean>(false);

  // Automatically request camera permission when screen opens
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  // Handle automatic QR scan from live camera
  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scanned || isCooldownRef.current || !result.data) return;
    setScanned(true);

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Haptics fallback
    }

    setScannedFeedback(`Scanned QR: ${result.data.substring(0, 30)}...`);
    handleProcessMachineQr(result.data);
  };

  const handleProcessMachineQr = async (qrPayloadString: string) => {
    if (isCooldownRef.current) return;
    isCooldownRef.current = true;
    setIsValidating(true);

    try {
      const res = await apiClient.post("/machines/qr/validate", {
        qr_text: qrPayloadString,
      });

      if (res.data && res.data.valid) {
        // Successfully validated machine QR -> navigate immediately to Machine Display Capture
        router.push({
          pathname: "/(worker)/display-capture",
          params: {
            machineId: res.data.machine_code || res.data.machine_id,
            qrId: res.data.qr_id,
            machineName: res.data.machine_name,
            machineType: res.data.machine_type,
            shiftName: "Shift 1 (Morning)",
          },
        });
      } else {
        Alert.alert(
          "Unregistered QR Code",
          res.data?.error || "This QR code is not registered to an active packaging machine.",
          [{ text: "Try Again", onPress: () => setScanned(false) }]
        );
      }
    } catch (err: any) {
      // Offline floor fallback: determine machine from raw QR text or fallback selection
      const matchedMachine = PRIMARY_MACHINES.find(
        (m) => qrPayloadString.includes(m.machineId) || qrPayloadString.includes(m.qrId)
      ) || selectedMachine;

      router.push({
        pathname: "/(worker)/display-capture",
        params: {
          machineId: matchedMachine.machineId,
          qrId: matchedMachine.qrId,
          machineName: matchedMachine.name,
          machineType: matchedMachine.type,
          shiftName: "Shift 1 (Morning)",
        },
      });
    } finally {
      setIsValidating(false);
      setTimeout(() => {
        isCooldownRef.current = false;
        setScanned(false);
        setScannedFeedback(null);
      }, 2000);
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
          <Text style={styles.topBarSub}>Live Camera Scanner</Text>
        </View>
        <TouchableOpacity
          onPress={() => setTorch(!torch)}
          style={[styles.iconBtn, torch && styles.iconBtnActive]}
          activeOpacity={0.7}
        >
          <Ionicons name={torch ? "flash" : "flash-outline"} size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Camera Live Viewfinder Area */}
      <View style={styles.cameraBox}>
        {isFocused && permission && permission.granted ? (
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          />
        ) : (
          <View style={styles.permissionContainer}>
            <Ionicons name="camera-outline" size={54} color="rgba(255, 255, 255, 0.4)" />
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionSub}>
              Camera access is needed to scan machine QR codes on the factory floor.
            </Text>
            <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
              <Text style={styles.permissionBtnText}>GRANT CAMERA ACCESS</Text>
            </TouchableOpacity>
          </View>
        )}

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
          
          {/* Animated/High-contrast scan laser beam */}
          <View style={styles.scanBeam} />

          {isValidating ? (
            <View style={styles.validatingBadge}>
              <ActivityIndicator color="#FFF" size="small" />
              <Text style={styles.validatingText}>Validating Machine...</Text>
            </View>
          ) : (
            <Ionicons name="qr-code-outline" size={88} color="rgba(255, 255, 255, 0.35)" />
          )}
        </View>

        {/* Live Scan Status Pill */}
        <View style={styles.scanStatusPill}>
          <Ionicons
            name={scanned ? "checkmark-circle" : "scan-circle"}
            size={14}
            color={scanned ? "#4ade80" : "#38bdf8"}
          />
          <Text style={styles.scanStatusText}>
            {scannedFeedback || "Point camera at machine QR sticker (auto-navigates on scan)"}
          </Text>
        </View>
      </View>

      {/* Bottom Machine Quick-Select Card (Floor Fallback & Verification) */}
      <View style={[styles.resultCard, { paddingBottom: Math.max(insets.bottom + 8, 20) }]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.identifiedLabel}>TARGET PACKAGING MACHINE</Text>
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
              <Ionicons name="camera" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.proceedBtnText}>OPEN DISPLAY CAMERA FOR {selectedMachine.machineId}</Text>
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
  },
  topBarSub: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 11,
    marginTop: 2,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  iconBtnActive: {
    backgroundColor: "#f59e0b",
  },
  cameraBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    backgroundColor: "#000000",
  },
  permissionContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  permissionTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginTop: 14,
  },
  permissionSub: {
    color: "#94a3b8",
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 16,
  },
  permissionBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  permissionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  viewfinderBrand: {
    position: "absolute",
    top: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(10, 25, 47, 0.85)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    zIndex: 10,
  },
  aavinLogo: {
    width: 22,
    height: 22,
    marginRight: 6,
  },
  brandTitleText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  reticle: {
    width: 240,
    height: 240,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: "#22c55e",
  },
  tl: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 8 },
  tr: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 8 },
  bl: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 8 },
  br: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 8 },
  scanBeam: {
    position: "absolute",
    left: 8,
    right: 8,
    height: 2,
    backgroundColor: "#22c55e",
    shadowColor: "#22c55e",
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  validatingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(14, 116, 144, 0.9)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  validatingText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "800",
  },
  scanStatusPill: {
    position: "absolute",
    bottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    maxWidth: "90%",
  },
  scanStatusText: {
    color: "#e2e8f0",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  resultCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  identifiedLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
  },
  headCodeText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    gap: 4,
  },
  verifiedText: {
    color: "#059669",
    fontWeight: "800",
    fontSize: 11,
  },
  switchLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 8,
  },
  pillScroll: {
    flexDirection: "row",
    marginBottom: 14,
  },
  machinePill: {
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    marginRight: 8,
    minWidth: 80,
    alignItems: "center",
  },
  machinePillActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#0A73C0",
  },
  machinePillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#334155",
  },
  machinePillTextActive: {
    color: "#0A73C0",
  },
  machinePillSub: {
    fontSize: 9,
    color: "#94a3b8",
    marginTop: 1,
  },
  machinePillSubActive: {
    color: "#0284c7",
    fontWeight: "700",
  },
  proceedBtn: {
    flexDirection: "row",
    height: 48,
    backgroundColor: "#054C97",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#054C97",
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 2,
  },
  proceedBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
});
