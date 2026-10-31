import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";

export default function CameraCaptureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [torch, setTorch] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [qualityCheck, setQualityCheck] = useState<"pass" | "blur" | "glare">("pass");

  const lastCount = Number(params.lastCount || 845230);
  const simulatedReading = lastCount + 285; // Simulated +285 production increment

  const handleCapture = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      router.push({
        pathname: "/(worker)/ocr-confirm",
        params: {
          headId: params.headId,
          machineId: params.machineId,
          machineName: params.machineName,
          headNumber: params.headNumber,
          lastCount: params.lastCount,
          variantId: params.variantId,
          detectedOcr: simulatedReading,
          ocrConfidence: "0.984",
        },
      });
    }, 1200);
  };

  return (
    <View style={styles.container}>
      {/* Top Controls */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="close" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>{params.headId || "RMC-01-H1"}</Text>
          <Text style={styles.headerSub}>HMI Screen Alignment</Text>
        </View>
        <TouchableOpacity
          onPress={() => setTorch(!torch)}
          style={[styles.iconBtn, torch && styles.iconBtnActive]}
        >
          <Ionicons name={torch ? "flash" : "flash-outline"} size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* Camera Live View & Framing Overlay */}
      <View style={styles.cameraFrame}>
        {/* Quality status banner */}
        <View style={styles.qualityPill}>
          <Ionicons name="shield-checkmark" size={14} color={Colors.success} />
          <Text style={styles.qualityText}>Lighting: Optimal • Framing: Locked</Text>
        </View>

        {/* HMI Screen Bounding Box */}
        <View style={styles.hmiBoundingBox}>
          <View style={styles.hmiScreenSim}>
            <Text style={styles.hmiHeader}>PLC / HMI DIGITAL COUNTER</Text>
            <View style={styles.digitContainer}>
              <Text style={styles.digitDisplay}>{simulatedReading.toLocaleString()}</Text>
              <Text style={styles.digitUnit}>PACKETS</Text>
            </View>
            <View style={styles.hmiFooter}>
              <Text style={styles.hmiRate}>RATE: 2,420 PKT/HR</Text>
              <Text style={styles.hmiStatus}>STATUS: RUNNING</Text>
            </View>
          </View>

          {/* Guide Reticles */}
          <View style={[styles.corner, styles.tl]} />
          <View style={[styles.corner, styles.tr]} />
          <View style={[styles.corner, styles.bl]} />
          <View style={[styles.corner, styles.br]} />
        </View>

        <Text style={styles.guidanceNotice}>
          Hold phone steady. Ensure counter display digits are fully visible.
        </Text>
      </View>

      {/* Bottom Shutter Action */}
      <View style={styles.bottomBar}>
        <View style={styles.noGalleryPill}>
          <Ionicons name="lock-closed" size={12} color="rgba(255,255,255,0.7)" />
          <Text style={styles.noGalleryText}>In-App Camera Evidence Only (Gallery Blocked)</Text>
        </View>

        <TouchableOpacity
          style={styles.shutterBtn}
          onPress={handleCapture}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          {isProcessing ? (
            <ActivityIndicator size="large" color={Colors.primary} />
          ) : (
            <View style={styles.shutterInner} />
          )}
        </TouchableOpacity>
        <Text style={styles.shutterLabel}>CAPTURE & RUN OCR</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 14,
  },
  headerTitleBox: {
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  headerSub: {
    color: Colors.accent,
    fontSize: 11,
    fontWeight: "700",
  },
  iconBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  iconBtnActive: {
    backgroundColor: Colors.accent,
  },
  cameraFrame: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  qualityPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(22, 131, 74, 0.25)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.success,
    marginBottom: 20,
    gap: 6,
  },
  qualityText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  hmiBoundingBox: {
    width: "100%",
    height: 240,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.4)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    backgroundColor: "rgba(10, 25, 47, 0.8)",
  },
  hmiScreenSim: {
    alignItems: "center",
    padding: 16,
    width: "90%",
    backgroundColor: "#051622",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1BA098",
  },
  hmiHeader: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1BA098",
    letterSpacing: 1,
    marginBottom: 8,
  },
  digitContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 8,
  },
  digitDisplay: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 42,
    fontWeight: "900",
    color: "#DEB992",
    letterSpacing: 2,
  },
  digitUnit: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1BA098",
  },
  hmiFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "rgba(27, 160, 152, 0.3)",
    paddingTop: 6,
  },
  hmiRate: {
    fontSize: 9,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "700",
  },
  hmiStatus: {
    fontSize: 9,
    color: Colors.success,
    fontWeight: "800",
  },
  corner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: Colors.primary,
  },
  tl: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 8 },
  tr: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 8 },
  bl: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 8 },
  br: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 8 },
  guidanceNotice: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 18,
    paddingHorizontal: 20,
  },
  bottomBar: {
    paddingBottom: 40,
    alignItems: "center",
  },
  noGalleryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 16,
  },
  noGalleryText: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.7)",
    fontWeight: "500",
  },
  shutterBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
    marginBottom: 8,
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.primary,
  },
  shutterLabel: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
});
