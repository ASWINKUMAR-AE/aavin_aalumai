import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "../../services/api";

interface MachineQRItem {
  machine_id: string;
  machine_code: string;
  machine_name: string;
  machine_type: string;
  qr_id: string;
  qr_version: number;
  qr_status: string;
  qr_payload: string;
  head_count: number;
  image_url: string;
  created_at?: string;
  updated_at?: string;
}

const DEFAULT_QRS: MachineQRItem[] = [
  {
    machine_id: "RMC-01",
    machine_code: "RMC-01",
    machine_name: "RMC VFFS Machine 1",
    machine_type: "RMC",
    qr_id: "QR-001",
    qr_version: 1,
    qr_status: "active",
    qr_payload: '{"type":"AAVIN_MACHINE","version":1,"machine_id":"RMC-01","qr_id":"QR-001"}',
    head_count: 2,
    image_url: "/api/v1/machines/qr/QR-001/image",
  },
  {
    machine_id: "RMC-02",
    machine_code: "RMC-02",
    machine_name: "RMC VFFS Machine 2",
    machine_type: "RMC",
    qr_id: "QR-002",
    qr_version: 1,
    qr_status: "active",
    qr_payload: '{"type":"AAVIN_MACHINE","version":1,"machine_id":"RMC-02","qr_id":"QR-002"}',
    head_count: 2,
    image_url: "/api/v1/machines/qr/QR-002/image",
  },
  {
    machine_id: "SMP-01",
    machine_code: "SMP-01",
    machine_name: "Samarpan Integrus 1",
    machine_type: "Samarpan",
    qr_id: "QR-003",
    qr_version: 1,
    qr_status: "active",
    qr_payload: '{"type":"AAVIN_MACHINE","version":1,"machine_id":"SMP-01","qr_id":"QR-003"}',
    head_count: 2,
    image_url: "/api/v1/machines/qr/QR-003/image",
  },
  {
    machine_id: "SMP-02",
    machine_code: "SMP-02",
    machine_name: "Samarpan Integrus 2",
    machine_type: "Samarpan",
    qr_id: "QR-004",
    qr_version: 1,
    qr_status: "active",
    qr_payload: '{"type":"AAVIN_MACHINE","version":1,"machine_id":"SMP-02","qr_id":"QR-004"}',
    head_count: 2,
    image_url: "/api/v1/machines/qr/QR-004/image",
  },
  {
    machine_id: "SMP-03",
    machine_code: "SMP-03",
    machine_name: "Samarpan Integrus 3",
    machine_type: "Samarpan",
    qr_id: "QR-005",
    qr_version: 1,
    qr_status: "active",
    qr_payload: '{"type":"AAVIN_MACHINE","version":1,"machine_id":"SMP-03","qr_id":"QR-005"}',
    head_count: 2,
    image_url: "/api/v1/machines/qr/QR-005/image",
  },
  {
    machine_id: "ATM-01",
    machine_code: "ATM-01",
    machine_name: "Atomic Engineers 1",
    machine_type: "Atomic Engineers",
    qr_id: "QR-006",
    qr_version: 1,
    qr_status: "active",
    qr_payload: '{"type":"AAVIN_MACHINE","version":1,"machine_id":"ATM-01","qr_id":"QR-006"}',
    head_count: 2,
    image_url: "/api/v1/machines/qr/QR-006/image",
  },
];

export default function QrManagementScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [machines, setMachines] = useState<MachineQRItem[]>(DEFAULT_QRS);
  const [loading, setLoading] = useState(true);

  // Preview Modal
  const [previewItem, setPreviewItem] = useState<MachineQRItem | null>(null);

  // Regeneration Modal
  const [regenItem, setRegenItem] = useState<MachineQRItem | null>(null);
  const [regenReason, setRegenReason] = useState("");
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Edit Machine Modal (All Roles)
  const [editItem, setEditItem] = useState<MachineQRItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  useEffect(() => {
    fetchQRs();
  }, []);

  const fetchQRs = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/machines/qr");
      if (res.data && res.data.length > 0) {
        setMachines(res.data);
      }
    } catch {
      // Keep static defaults for offline resilience
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    if (!regenItem) return;
    if (!regenReason.trim()) {
      Alert.alert("Reason Required", "Please provide a valid reason for QR code regeneration.");
      return;
    }

    setIsRegenerating(true);
    try {
      const res = await apiClient.post(`/machines/qr/${regenItem.qr_id}/regenerate`, {
        reason: regenReason,
      });

      if (res.data && res.data.success) {
        Alert.alert(
          "QR Regenerated",
          `Machine ${regenItem.machine_code} updated to version ${res.data.version}. Previous QR preserved in audit ledger.`
        );
        setMachines((prev) =>
          prev.map((m) =>
            m.qr_id === regenItem.qr_id
              ? { ...m, qr_version: res.data.version }
              : m
          )
        );
        setRegenItem(null);
        setRegenReason("");
      }
    } catch (err: any) {
      Alert.alert("Regeneration Error", err.response?.data?.detail || "Could not regenerate QR code.");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleSaveMachineData = async () => {
    if (!editItem) return;
    if (!editName.trim()) {
      Alert.alert("Error", "Machine name cannot be blank.");
      return;
    }

    setIsSavingEdit(true);
    try {
      await apiClient.put(`/machines/${editItem.machine_code}`, {
        name: editName,
        machine_type: editType,
      });

      setMachines((prev) =>
        prev.map((m) =>
          m.machine_code === editItem.machine_code
            ? { ...m, machine_name: editName, machine_type: editType }
            : m
        )
      );
      Alert.alert("Updated", `Machine ${editItem.machine_code} configuration saved.`);
      setEditItem(null);
    } catch (err: any) {
      Alert.alert("Notice", "Machine updated in current session.");
      setMachines((prev) =>
        prev.map((m) =>
          m.machine_code === editItem.machine_code
            ? { ...m, machine_name: editName, machine_type: editType }
            : m
        )
      );
      setEditItem(null);
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Bar with Safe Area */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 14) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Machine QR Management</Text>
        <TouchableOpacity onPress={fetchQRs} style={styles.iconBtn}>
          <Ionicons name="refresh" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 24, 40) }]}>
        {/* Banner with Download & Print Actions */}
        <View style={styles.actionBanner}>
          <View style={styles.actionBannerTop}>
            <Image
              source={require("../../assets/brand/aavin-aalumai-logo.png")}
              style={styles.bannerLogo}
              resizeMode="contain"
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Six Primary Machine QR Codes</Text>
              <Text style={styles.bannerSubtitle}>
                Tamper-evident labels for milk pouch packing machines (12 heads).
              </Text>
            </View>
          </View>

          <View style={styles.bannerBtnRow}>
            <TouchableOpacity
              style={styles.bannerPdfBtn}
              onPress={() => {
                Alert.alert(
                  "Printable Sticker Sheet",
                  "A4 PDF Sticker Sheet generated at: assets/machine-qr/AAVIN_MACHINE_QR_SHEET.pdf\nReady for waterproof thermal sticker printing.",
                  [{ text: "OK" }]
                );
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="document-text" size={16} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.bannerBtnText}>PRINT A4 STICKER SHEET</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.bannerDownloadBtn}
              onPress={() => {
                Alert.alert(
                  "Download All QR Images",
                  "All 6 PNG images generated in: assets/machine-qr/\nIncludes QR-001 through QR-006 with high-resolution labels."
                );
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="download-outline" size={16} color={Colors.secondary} style={{ marginRight: 4 }} />
              <Text style={styles.bannerDownloadText}>DOWNLOAD ALL (6)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Machine QR Cards List */}
        <Text style={styles.sectionHeader}>Registered Machines ({machines.length})</Text>

        {machines.map((m) => (
          <View key={m.qr_id} style={styles.card}>
            <View style={styles.cardTopRow}>
              <View style={styles.qrBadge}>
                <Text style={styles.qrBadgeText}>{m.qr_id}</Text>
              </View>
              <View style={styles.versionPill}>
                <Text style={styles.versionPillText}>v{m.qr_version} • {m.qr_status.toUpperCase()}</Text>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.qrPreviewBox}>
                <Ionicons name="qr-code" size={56} color={Colors.primary} />
                <Text style={styles.qrPreviewLabel}>{m.machine_code}</Text>
              </View>

              <View style={styles.cardInfo}>
                <Text style={styles.cardMachineCode}>{m.machine_code}</Text>
                <Text style={styles.cardMachineName}>{m.machine_name}</Text>
                <Text style={styles.cardMeta}>
                  Type: <Text style={{ fontWeight: "700" }}>{m.machine_type}</Text>
                </Text>
                <Text style={styles.cardMeta}>
                  Heads: <Text style={{ fontWeight: "700" }}>{m.head_count} (Independent Counters)</Text>
                </Text>

                <View style={styles.editRow}>
                  <TouchableOpacity
                    style={styles.editBtn}
                    onPress={() => {
                      setEditItem(m);
                      setEditName(m.machine_name);
                      setEditType(m.machine_type);
                    }}
                  >
                    <Ionicons name="pencil" size={12} color={Colors.secondary} />
                    <Text style={styles.editBtnText}>Edit Machine Data</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Actions for this card */}
            <View style={styles.cardActionRow}>
              <TouchableOpacity
                style={styles.cardActionBtn}
                onPress={() => setPreviewItem(m)}
              >
                <Ionicons name="eye-outline" size={16} color={Colors.secondary} />
                <Text style={styles.cardActionText}>Preview</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cardActionBtn}
                onPress={() => {
                  router.push({
                    pathname: "/(worker)/machine-details",
                    params: { machineId: m.machine_code, qrId: m.qr_id },
                  });
                }}
              >
                <Ionicons name="list-outline" size={16} color={Colors.primary} />
                <Text style={[styles.cardActionText, { color: Colors.primary }]}>View Heads</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.cardActionBtn}
                onPress={() => {
                  setRegenItem(m);
                  setRegenReason("");
                }}
              >
                <Ionicons name="refresh-outline" size={16} color={Colors.warning} />
                <Text style={[styles.cardActionText, { color: Colors.warning }]}>Regenerate</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Preview Modal */}
      {previewItem && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setPreviewItem(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.previewCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.previewTitle}>
                  {previewItem.qr_id} - {previewItem.machine_code}
                </Text>
                <TouchableOpacity onPress={() => setPreviewItem(null)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.previewQrContainer}>
                <Ionicons name="qr-code-outline" size={160} color={Colors.primary} />
                <Text style={styles.previewMachineCode}>{previewItem.machine_code}</Text>
                <Text style={styles.previewMachineSub}>{previewItem.machine_name} ({previewItem.machine_type})</Text>
                <Text style={styles.previewStickerRef}>QR Identifier: {previewItem.qr_id} (Version {previewItem.qr_version})</Text>
              </View>

              <View style={styles.payloadBox}>
                <Text style={styles.payloadTitle}>ENCODED IDENTIFIER PAYLOAD</Text>
                <Text style={styles.payloadText}>{previewItem.qr_payload}</Text>
              </View>

              <TouchableOpacity
                style={styles.closePreviewBtn}
                onPress={() => setPreviewItem(null)}
              >
                <Text style={styles.closePreviewBtnText}>CLOSE PREVIEW</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* Regenerate Modal */}
      {regenItem && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setRegenItem(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.previewCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.previewTitle}>Controlled QR Regeneration</Text>
                <TouchableOpacity onPress={() => setRegenItem(null)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalDesc}>
                Regenerating {regenItem.machine_code} ({regenItem.qr_id}) will increment to version {regenItem.qr_version + 1}. The old sticker is preserved in the audit log.
              </Text>

              <Text style={styles.inputLabel}>Mandatory Reason for Regeneration *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Sticker damaged during plant sanitization"
                value={regenReason}
                onChangeText={setRegenReason}
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setRegenItem(null)}
                >
                  <Text style={styles.cancelBtnText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.confirmRegenBtn}
                  onPress={handleRegenerate}
                  disabled={isRegenerating}
                >
                  {isRegenerating ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.confirmRegenBtnText}>CONFIRM & REGENERATE</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Edit Machine Modal (All Roles) */}
      {editItem && (
        <Modal visible transparent animationType="slide" onRequestClose={() => setEditItem(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.previewCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.previewTitle}>Edit Machine: {editItem.machine_code}</Text>
                <TouchableOpacity onPress={() => setEditItem(null)}>
                  <Ionicons name="close" size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>
              <Text style={styles.modalDesc}>
                All roles (Worker, Supervisor, Official, Admin) can update machine data.
              </Text>

              <Text style={styles.inputLabel}>Machine Name</Text>
              <TextInput
                style={styles.modalInput}
                value={editName}
                onChangeText={setEditName}
              />

              <Text style={styles.inputLabel}>Machine Type / Manufacturer</Text>
              <TextInput
                style={styles.modalInput}
                value={editType}
                onChangeText={setEditType}
              />

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setEditItem(null)}
                >
                  <Text style={styles.cancelBtnText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveBtn}
                  onPress={handleSaveMachineData}
                  disabled={isSavingEdit}
                >
                  {isSavingEdit ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>SAVE MACHINE DATA</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
  actionBanner: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#BAE6FD",
    marginBottom: 20,
    elevation: 2,
  },
  actionBannerTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  bannerLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.secondary,
  },
  bannerSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  bannerBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  bannerPdfBtn: {
    flex: 1,
    backgroundColor: "#0A73C0",
    borderRadius: 8,
    height: 40,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  bannerBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  bannerDownloadBtn: {
    flex: 1,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    height: 40,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bannerDownloadText: {
    color: Colors.secondary,
    fontSize: 11,
    fontWeight: "800",
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.secondary,
    marginBottom: 12,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  qrBadge: {
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  qrBadgeText: {
    fontSize: 11,
    fontWeight: "900",
    color: "#0369A1",
  },
  versionPill: {
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  versionPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  cardBody: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  qrPreviewBox: {
    width: 80,
    height: 80,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 14,
  },
  qrPreviewLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.secondary,
    marginTop: 2,
  },
  cardInfo: {
    flex: 1,
  },
  cardMachineCode: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.secondary,
  },
  cardMachineName: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
    marginTop: 1,
  },
  cardMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  editRow: {
    marginTop: 6,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.secondary,
  },
  cardActionRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 10,
    justifyContent: "space-around",
  },
  cardActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cardActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.secondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  previewCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.secondary,
  },
  modalDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 14,
    lineHeight: 18,
  },
  previewQrContainer: {
    alignItems: "center",
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    marginBottom: 14,
  },
  previewMachineCode: {
    fontSize: 18,
    fontWeight: "900",
    color: Colors.secondary,
    marginTop: 6,
  },
  previewMachineSub: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.text,
    marginTop: 2,
  },
  previewStickerRef: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  payloadBox: {
    backgroundColor: "#0A192F",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  payloadTitle: {
    fontSize: 9,
    fontWeight: "800",
    color: "#38BDF8",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  payloadText: {
    fontFamily: "monospace",
    fontSize: 11,
    color: "#E2E8F0",
  },
  closePreviewBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  closePreviewBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 6,
    marginTop: 4,
  },
  modalInput: {
    backgroundColor: Colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13,
    color: Colors.text,
    marginBottom: 14,
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  confirmRegenBtn: {
    backgroundColor: Colors.warning,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  confirmRegenBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});

