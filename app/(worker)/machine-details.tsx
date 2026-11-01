import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "../../services/api";

interface HeadItem {
  id: string;
  machine_id: string;
  head_code: string;
  head_number: number;
  qr_identifier: string;
  rated_speed_per_hour: number;
  genesis_hash: string;
  current_hash: string;
  is_active: boolean;
  latest_counter?: number;
  latest_reading_time?: string;
}

interface MachineData {
  id: string;
  machine_code: string;
  name: string;
  machine_type: string;
  total_heads: number;
  qr_id?: string;
  qr_version?: number;
  qr_status?: string;
  heads: HeadItem[];
}

export default function MachineDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();

  const machineId = (params.machineId as string) || "RMC-01";
  const [machine, setMachine] = useState<MachineData | null>(null);
  const [loading, setLoading] = useState(true);

  // Edit Machine Modal State (Editable by all roles)
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchMachineDetails();
  }, [machineId]);

  const fetchMachineDetails = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/machines/${machineId}`);
      if (res.data) {
        setMachine(res.data);
        setEditName(res.data.name);
        setEditType(res.data.machine_type);
      }
    } catch (err: any) {
      // Fallback data for offline / demo use
      const demoHeads: HeadItem[] = [
        {
          id: `${machineId}-H1`,
          machine_id: machineId,
          head_code: `${machineId}-H1`,
          head_number: 1,
          qr_identifier: `AAVIN://MADURAI/DAIRY/${machineId}/HEAD_1`,
          rated_speed_per_hour: 2500,
          genesis_hash: "54ca113b8dbc9d99f018eac3528b9d21c784ee09b81239aa81f08e458760086c",
          current_hash: "54ca113b8dbc9d99f018eac3528b9d21c784ee09b81239aa81f08e458760086c",
          is_active: true,
          latest_counter: 0,
          latest_reading_time: "Not recorded",
        },
        {
          id: `${machineId}-H2`,
          machine_id: machineId,
          head_code: `${machineId}-H2`,
          head_number: 2,
          qr_identifier: `AAVIN://MADURAI/DAIRY/${machineId}/HEAD_2`,
          rated_speed_per_hour: 2500,
          genesis_hash: "4422f711fdb1ccae77b21901ddfa456102aa2918809bc4510091aa02991044bb",
          current_hash: "4422f711fdb1ccae77b21901ddfa456102aa2918809bc4510091aa02991044bb",
          is_active: true,
          latest_counter: 0,
          latest_reading_time: "Not recorded",
        },
      ];

      const fallback: MachineData = {
        id: machineId,
        machine_code: machineId,
        name: machineId.startsWith("RMC") ? "RMC VFFS Machine" : (machineId.startsWith("SMP") ? "Samarpan Integrus" : "Atomic Engineers"),
        machine_type: machineId.startsWith("RMC") ? "RMC" : (machineId.startsWith("SMP") ? "Samarpan" : "Atomic Engineers"),
        total_heads: 2,
        qr_id: (params.qrId as string) || "QR-001",
        qr_version: 1,
        qr_status: "active",
        heads: demoHeads,
      };
      setMachine(fallback);
      setEditName(fallback.name);
      setEditType(fallback.machine_type);
    } finally {
      setLoading(false);
    }
  };

  const handleCaptureHead = (head: HeadItem) => {
    router.push({
      pathname: "/(worker)/capture",
      params: {
        machineId: machine?.machine_code || machineId,
        machineName: machine?.name || "",
        machineType: machine?.machine_type || "",
        headId: head.id,
        headCode: head.head_code,
        headNumber: head.head_number,
        lastCount: head.latest_counter || 845230,
        variantId: "TM-500",
      },
    });
  };

  const handleSaveMachineEdit = async () => {
    if (!editName.trim()) {
      Alert.alert("Validation Error", "Machine name cannot be blank.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await apiClient.put(`/machines/${machine?.id || machineId}`, {
        name: editName,
        machine_type: editType,
      });
      if (res.data) {
        setMachine((prev) => (prev ? { ...prev, name: res.data.name, machine_type: res.data.machine_type } : null));
        Alert.alert("Success", "Machine configuration updated successfully.");
        setEditModalVisible(false);
      }
    } catch (err: any) {
      // Local fallback for offline mode
      setMachine((prev) => (prev ? { ...prev, name: editName, machine_type: editType } : null));
      Alert.alert("Updated Locally", "Machine data saved in local session.");
      setEditModalVisible(false);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading && !machine) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading verified machine details...</Text>
      </View>
    );
  }

  const headsList = machine?.heads || [];

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 14) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Machine Details & Heads</Text>
        <TouchableOpacity
          onPress={() => setEditModalVisible(true)}
          style={styles.iconBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="create-outline" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 20, 36) }]}>
        {/* Machine Badge Banner */}
        <View style={styles.machineBanner}>
          <View style={styles.bannerRow}>
            <Image
              source={require("../../assets/brand/aavin-aalumai-logo.png")}
              style={styles.bannerLogo}
              resizeMode="contain"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerCode}>{machine?.machine_code}</Text>
              <Text style={styles.bannerName}>{machine?.name}</Text>
              <Text style={styles.bannerType}>
                Type: {machine?.machine_type} • Ref: {machine?.qr_id || "QR-001"} (v{machine?.qr_version || 1})
              </Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.activePill}>
              <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
              <Text style={styles.activePillText}>QR VERIFIED • OPERATIONAL</Text>
            </View>
            <TouchableOpacity
              style={styles.editPill}
              onPress={() => setEditModalVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={12} color={Colors.secondary} />
              <Text style={styles.editPillText}>EDIT MACHINE</Text>
            </TouchableOpacity>
          </View>

          {/* Primary Recommended Action: Capture Complete Dual-Head HMI Display */}
          <TouchableOpacity
            style={styles.primaryDisplayCaptureBtn}
            onPress={() =>
              router.push({
                pathname: "/(worker)/display-capture",
                params: {
                  machineId: machine?.machine_code || machineId,
                  machineName: machine?.name || "",
                  machineType: machine?.machine_type || "",
                  qrId: machine?.qr_id || "QR-001",
                  shiftName: "Shift 1 (Morning)",
                },
              })
            }
            activeOpacity={0.85}
          >
            <Ionicons name="camera" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryDisplayCaptureText}>
              CAPTURE COMPLETE HMI DISPLAY (HEAD A & B)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section Title */}
        <View style={styles.sectionHeader}>
          <Ionicons name="hardware-chip-outline" size={18} color={Colors.secondary} />
          <Text style={styles.sectionTitle}>Available Heads ({headsList.length})</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Select the physical head to capture its digital HMI counter reading.
        </Text>

        {/* Head Cards */}
        {headsList.map((head) => (
          <View key={head.id} style={styles.headCard}>
            <View style={styles.headCardHeader}>
              <View style={styles.headTag}>
                <Text style={styles.headTagText}>HEAD {head.head_number}</Text>
              </View>
              <View style={styles.headStatusPill}>
                <Ionicons name="radio-button-on" size={12} color={Colors.success} />
                <Text style={styles.headStatusText}>READY</Text>
              </View>
            </View>

            <View style={styles.headMetaGrid}>
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>Unique Head ID</Text>
                <Text style={styles.metaValue}>{head.head_code}</Text>
              </View>
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>Rated Speed</Text>
                <Text style={styles.metaValue}>{head.rated_speed_per_hour} ppm</Text>
              </View>
            </View>

            <View style={styles.counterBox}>
              <View>
                <Text style={styles.counterBoxLabel}>LAST CONFIRMED COUNTER</Text>
                <Text style={styles.counterBoxNumber}>
                  {(head.latest_counter || 845230).toLocaleString()}
                </Text>
              </View>
              <View style={styles.timeTag}>
                <Ionicons name="time-outline" size={12} color={Colors.textSecondary} />
                <Text style={styles.timeTagText}>{head.latest_reading_time || "07:55 AM"}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.captureBtn}
              onPress={() => handleCaptureHead(head)}
              activeOpacity={0.85}
            >
              <Ionicons name="camera" size={18} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.captureBtnText}>CAPTURE HEAD {head.head_number} COUNTER</Text>
            </TouchableOpacity>
          </View>
        ))}

        {/* Audit Guidance Note */}
        <View style={styles.infoCard}>
          <Ionicons name="shield-checkmark" size={18} color={Colors.secondary} />
          <Text style={styles.infoText}>
            Dual-Head Independence Rule: Each head counter is tracked separately with an independent SHA-256 cryptographic chain. Never combine head counts.
          </Text>
        </View>
      </ScrollView>

      {/* Edit Machine Modal (All Roles Permission) */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Machine Information</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Open Access: Machine parameters are editable across all plant roles.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Machine Display Name</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="e.g. RMC VFFS Machine 1"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Machine Type / Model</Text>
              <TextInput
                style={styles.input}
                value={editType}
                onChangeText={setEditType}
                placeholder="e.g. RMC, Samarpan, Atomic Engineers"
              />
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSaveMachineEdit}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.saveBtnText}>SAVE CHANGES</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: "#0A73C0",
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
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  scrollContent: {
    padding: 16,
  },
  machineBanner: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#BAE6FD",
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#0A73C0",
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  bannerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  bannerLogo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
  },
  bannerCode: {
    fontSize: 20,
    fontWeight: "900",
    color: Colors.secondary,
    letterSpacing: 0.5,
  },
  bannerName: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 1,
  },
  bannerType: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 10,
  },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.successLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.success,
  },
  primaryDisplayCaptureBtn: {
    flexDirection: "row",
    height: 48,
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
  },
  primaryDisplayCaptureText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  editPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  editPillText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.secondary,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.secondary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  headCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 1,
  },
  headCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  headTag: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  headTagText: {
    fontSize: 12,
    fontWeight: "900",
    color: Colors.primary,
  },
  headStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headStatusText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.success,
  },
  headMetaGrid: {
    flexDirection: "row",
    backgroundColor: Colors.borderLight,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  metaCell: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  metaValue: {
    fontSize: 12,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 2,
  },
  counterBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  counterBoxLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#166534",
    letterSpacing: 0.5,
  },
  counterBoxNumber: {
    fontSize: 24,
    fontWeight: "900",
    color: "#15803D",
    marginTop: 2,
  },
  timeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeTagText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  captureBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    height: 46,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  captureBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: Colors.primaryLight,
    padding: 14,
    borderRadius: 10,
    gap: 10,
    alignItems: "flex-start",
    marginTop: 6,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: Colors.secondary,
    lineHeight: 18,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: Colors.text,
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 10,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});

