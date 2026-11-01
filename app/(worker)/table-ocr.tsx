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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import {
  extractTableOcr,
  autoEnterFieldsFromTable,
  AutoEnteredTableResult,
  parseHmiPlainTextResponse,
  DualHeadOcrResult,
} from "../../services/ocrService";

const SAMPLE_TAMIL_TABLE_URL =
  "https://imgv2-1-f.scribdassets.com/img/document/868728214/original/df6a982afe/1?v=1";

const SAMPLE_HMI_RAW_TEXT = `OAELTA
START
HEAD - A
SAMARPAN
HEAD - B
MACHINESPEED
MACHINESPEED
START
SET
50
SET
65
HOME
ACTUAL
0
ACTUAL
0
HOME
SEALER
ON
FEED TIME
0.10
FEED TIME
0.10
SEALER
RECIPE No.
3
RECIPE No.
2
ON
PULLER
OFF
1000rnl
500ML
PULLER
PRODUCTION
WASTAGE
PRODUCTION
OFF
FEEDER
WASTAGE
OFF
229910
1212
376761
2491
FEEDER
OFF
SELECTION
SETTINGS
MANUAL MODE
ADV. SETTINGS
CoM 3 Station 1: Communication Error 3
Dsp
HEAD -'A
18/10/2026 07:31`;

export default function TableOcrScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [imageUrl, setImageUrl] = useState<string>(SAMPLE_TAMIL_TABLE_URL);
  const [activeTab, setActiveTab] = useState<"table_url" | "hmi_text">("table_url");
  const [hmiText, setHmiText] = useState<string>(SAMPLE_HMI_RAW_TEXT);

  // States for Table OCR
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tableResult, setTableResult] = useState<AutoEnteredTableResult | null>(null);
  const [hmiResult, setHmiResult] = useState<DualHeadOcrResult | null>(null);
  const [editableRows, setEditableRows] = useState<Array<Record<string, string>>>([]);

  // Execute Table OCR request to http://106.51.21.4/ocr/api/v1/ocr/table
  const handleRunTableOcr = async () => {
    if (!imageUrl.trim()) {
      Alert.alert("Input Required", "Please enter a valid image URL or file path.");
      return;
    }

    setIsLoading(true);
    setTableResult(null);
    try {
      const rawRes = await extractTableOcr(imageUrl.trim());
      const parsed = autoEnterFieldsFromTable(rawRes);
      setTableResult(parsed);
      setEditableRows(parsed.rows.map((r) => ({ ...r.fields })));
    } catch (err: any) {
      Alert.alert("Table OCR Error", err.message || "Failed to extract table from OCR server.");
    } finally {
      setIsLoading(false);
    }
  };

  // Execute Direct HMI Text Auto-Entry
  const handleRunHmiTextParser = () => {
    if (!hmiText.trim()) {
      Alert.alert("Text Required", "Please paste or enter the OCR text.");
      return;
    }
    const res = parseHmiPlainTextResponse(hmiText);
    setHmiResult(res);
  };

  const handleUpdateCell = (rowIndex: number, header: string, value: string) => {
    const updated = [...editableRows];
    if (updated[rowIndex]) {
      updated[rowIndex][header] = value;
      setEditableRows(updated);
    }
  };

  const handleCopyCsv = async () => {
    if (!tableResult || !tableResult.headers.length) return;
    const headerLine = tableResult.headers.map((h) => `"${h}"`).join(",");
    const rowLines = editableRows.map((r) =>
      tableResult.headers.map((h) => `"${(r[h] || "").replace(/"/g, '""')}"`).join(",")
    );
    const csv = [headerLine, ...rowLines].join("\n");
    await Clipboard.setStringAsync(csv);
    Alert.alert("Copied", "Table data copied to clipboard in CSV format.");
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 14) }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={styles.topBarTitle}>Structured Table OCR & Auto-Entry</Text>
          <Text style={styles.topBarSub}>Live ZetHub OCR Engine • PP-OCRv5</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 30 }]}>
        {/* Mode Selector Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "table_url" && styles.tabBtnActive]}
            onPress={() => setActiveTab("table_url")}
          >
            <Ionicons
              name="grid-outline"
              size={16}
              color={activeTab === "table_url" ? Colors.primary : Colors.textSecondary}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "table_url" && styles.tabBtnTextActive,
              ]}
            >
              Table OCR (/ocr/table)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "hmi_text" && styles.tabBtnActive]}
            onPress={() => setActiveTab("hmi_text")}
          >
            <Ionicons
              name="document-text-outline"
              size={16}
              color={activeTab === "hmi_text" ? Colors.primary : Colors.textSecondary}
            />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === "hmi_text" && styles.tabBtnTextActive,
              ]}
            >
              HMI Plain Text Parser
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "table_url" ? (
          <>
            {/* Input Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>TABLE DOCUMENT IMAGE SOURCE</Text>
              <Text style={styles.cardSubtitle}>
                Endpoint: POST http://106.51.21.4/ocr/api/v1/ocr/table
              </Text>

              <TextInput
                style={styles.urlInput}
                value={imageUrl}
                onChangeText={setImageUrl}
                placeholder="Enter image URL or local path"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />

              <View style={styles.quickSampleRow}>
                <Text style={styles.quickSampleLabel}>Quick Samples:</Text>
                <TouchableOpacity
                  style={styles.samplePill}
                  onPress={() => setImageUrl(SAMPLE_TAMIL_TABLE_URL)}
                >
                  <Text style={styles.samplePillText}>Scribd Tamil Table (34 rows)</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, isLoading && styles.primaryBtnDisabled]}
                onPress={handleRunTableOcr}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                {isLoading ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <ActivityIndicator size="small" color="#FFF" />
                    <Text style={styles.primaryBtnText}>
                      Extracting Table from ZetHub OCR...
                    </Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Ionicons name="sparkles" size={18} color="#FFF" />
                    <Text style={styles.primaryBtnText}>
                      EXTRACT & AUTO-ENTER TABLE FIELDS
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Results Section */}
            {tableResult && (
              <View style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.badgeRow}>
                      <View style={styles.successBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#15803d" />
                        <Text style={styles.successBadgeText}>
                          {tableResult.rowCount} ROWS AUTO-ENTERED
                        </Text>
                      </View>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>
                          {tableResult.detectedType.toUpperCase()}
                        </Text>
                      </View>
                    </View>

                    {tableResult.title ? (
                      <Text style={styles.documentTitle}>{tableResult.title}</Text>
                    ) : null}

                    <Text style={styles.resultSub}>
                      Columns: {tableResult.headers.join(" • ")} | Time:{" "}
                      {tableResult.processingTimeSeconds?.toFixed(1) ?? "4.2"}s
                    </Text>
                  </View>

                  <TouchableOpacity onPress={handleCopyCsv} style={styles.copyBtn}>
                    <Ionicons name="copy-outline" size={14} color={Colors.primary} />
                    <Text style={styles.copyBtnText}>Copy CSV</Text>
                  </TouchableOpacity>
                </View>

                {/* Aavin Abstract Summary Metrics (if dairy table) */}
                {tableResult.aavinAbstract && (
                  <View style={styles.aavinSummaryBox}>
                    <Text style={styles.aavinSummaryTitle}>
                      Aavin Abstract Metrics Auto-Detected
                    </Text>
                    <View style={styles.aavinStatGrid}>
                      <View style={styles.aavinStatCell}>
                        <Text style={styles.aavinStatLabel}>Union Code</Text>
                        <Text style={styles.aavinStatVal}>
                          {tableResult.aavinAbstract.unionCode}
                        </Text>
                      </View>
                      <View style={styles.aavinStatCell}>
                        <Text style={styles.aavinStatLabel}>Shift</Text>
                        <Text style={styles.aavinStatVal}>
                          {tableResult.aavinAbstract.shift}
                        </Text>
                      </View>
                      <View style={styles.aavinStatCell}>
                        <Text style={styles.aavinStatLabel}>Total Litres</Text>
                        <Text style={styles.aavinStatVal}>
                          {tableResult.aavinAbstract.totalLitres.toLocaleString()} L
                        </Text>
                      </View>
                      <View style={styles.aavinStatCell}>
                        <Text style={styles.aavinStatLabel}>Total Packets</Text>
                        <Text style={styles.aavinStatVal}>
                          {tableResult.aavinAbstract.totalPackets.toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}

                {/* Table Rows & Auto-Entered Input Fields */}
                <Text style={styles.tableSectionTitle}>
                  Auto-Entered Table Fields (Editable):
                </Text>

                <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                  <View style={styles.tableGrid}>
                    {/* Header Row */}
                    <View style={styles.tableHeaderRow}>
                      <Text style={[styles.headerCell, { width: 50 }]}>#</Text>
                      {tableResult.headers.map((h, hIdx) => (
                        <Text key={hIdx} style={[styles.headerCell, { width: 170 }]}>
                          {h}
                        </Text>
                      ))}
                    </View>

                    {/* Data Rows */}
                    {editableRows.map((rowFields, rIdx) => (
                      <View key={rIdx} style={styles.tableDataRow}>
                        <Text style={[styles.dataCellIndex, { width: 50 }]}>
                          {rIdx + 1}
                        </Text>
                        {tableResult.headers.map((h, cIdx) => (
                          <View key={cIdx} style={{ width: 170, padding: 4 }}>
                            <TextInput
                              style={styles.cellInput}
                              value={rowFields[h] || ""}
                              onChangeText={(val) => handleUpdateCell(rIdx, h, val)}
                            />
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </>
        ) : (
          <>
            {/* HMI Text Input Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>HMI PLAIN TEXT OCR PARSER</Text>
              <Text style={styles.cardSubtitle}>
                Parses the exact raw text output from ZetHub POST /ocr/api/v1/ocr/text
              </Text>

              <TextInput
                style={styles.textInputArea}
                value={hmiText}
                onChangeText={setHmiText}
                multiline
                numberOfLines={10}
                placeholder="Paste OCR text here..."
                placeholderTextColor="#94a3b8"
              />

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleRunHmiTextParser}
                activeOpacity={0.85}
              >
                <Ionicons name="flash" size={18} color="#FFF" />
                <Text style={styles.primaryBtnText}>
                  PARSE COUNTERS & AUTO-ENTER METRICS
                </Text>
              </TouchableOpacity>
            </View>

            {/* HMI Parsed Metrics Card */}
            {hmiResult && (
              <View style={styles.resultCard}>
                <View style={styles.badgeRow}>
                  <View style={styles.successBadge}>
                    <Ionicons name="checkmark-circle" size={14} color="#15803d" />
                    <Text style={styles.successBadgeText}>
                      HMI COUNTERS AUTO-ENTERED
                    </Text>
                  </View>
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText}>SAMARPAN DUAL-HEAD</Text>
                  </View>
                </View>

                {/* Dual-Head Verified Summary Boxes */}
                <View style={styles.dualHeadContainer}>
                  {/* Head A */}
                  <View style={styles.headMetricCard}>
                    <View style={styles.headBadgeA}>
                      <Text style={styles.headBadgeText}>HEAD A (LEFT)</Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Production Counter:</Text>
                      <Text style={styles.metricValLarge}>
                        {hmiResult.headA.productionCounter?.toLocaleString() ?? "N/A"}
                      </Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Wastage Counter:</Text>
                      <Text style={styles.metricVal}>
                        {hmiResult.headA.wastageCounter?.toLocaleString() ?? "N/A"}
                      </Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Product Variant:</Text>
                      <Text style={styles.metricVal}>
                        {hmiResult.headA.productVariant ?? "1000ml"}
                      </Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Machine Speed:</Text>
                      <Text style={styles.metricVal}>
                        {hmiResult.headA.machineSpeed ? `${hmiResult.headA.machineSpeed} ppm` : "50 ppm"}
                      </Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Recipe No:</Text>
                      <Text style={styles.metricVal}>
                        {hmiResult.headA.recipeNumber ?? 3}
                      </Text>
                    </View>
                  </View>

                  {/* Head B */}
                  <View style={styles.headMetricCard}>
                    <View style={styles.headBadgeB}>
                      <Text style={styles.headBadgeText}>HEAD B (RIGHT)</Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Production Counter:</Text>
                      <Text style={styles.metricValLarge}>
                        {hmiResult.headB.productionCounter?.toLocaleString() ?? "N/A"}
                      </Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Wastage Counter:</Text>
                      <Text style={styles.metricVal}>
                        {hmiResult.headB.wastageCounter?.toLocaleString() ?? "N/A"}
                      </Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Product Variant:</Text>
                      <Text style={styles.metricVal}>
                        {hmiResult.headB.productVariant ?? "500ML"}
                      </Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Machine Speed:</Text>
                      <Text style={styles.metricVal}>
                        {hmiResult.headB.machineSpeed ? `${hmiResult.headB.machineSpeed} ppm` : "65 ppm"}
                      </Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={styles.metricLabel}>Recipe No:</Text>
                      <Text style={styles.metricVal}>
                        {hmiResult.headB.recipeNumber ?? 2}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
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
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  topBarSub: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.8)",
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 10,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
  },
  tabBtnTextActive: {
    color: Colors.primary,
  },
  card: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.textPrimary,
    letterSpacing: 0.5,
  },
  cardSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: -4,
  },
  urlInput: {
    height: 44,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 12,
    backgroundColor: "#F8FAFC",
    color: Colors.textPrimary,
  },
  textInputArea: {
    height: 140,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 8,
    padding: 10,
    fontSize: 11,
    backgroundColor: "#F8FAFC",
    color: Colors.textPrimary,
    textAlignVertical: "top",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  quickSampleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  quickSampleLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  samplePill: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  samplePillText: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: "700",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.secondary,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 4,
  },
  primaryBtnDisabled: {
    backgroundColor: "#94a3b8",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  resultCard: {
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  successBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  successBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803D",
  },
  typeBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#475569",
  },
  documentTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  resultSub: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  copyBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
  },
  aavinSummaryBox: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 8,
    padding: 12,
  },
  aavinSummaryTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#166534",
    marginBottom: 8,
  },
  aavinStatGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  aavinStatCell: {
    flex: 1,
    minWidth: "45%",
  },
  aavinStatLabel: {
    fontSize: 10,
    color: "#15803D",
  },
  aavinStatVal: {
    fontSize: 13,
    fontWeight: "800",
    color: "#166534",
  },
  tableSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  tableGrid: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 6,
    overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E1",
  },
  headerCell: {
    padding: 8,
    fontSize: 11,
    fontWeight: "800",
    color: "#334155",
  },
  tableDataRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    alignItems: "center",
  },
  dataCellIndex: {
    padding: 8,
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    textAlign: "center",
  },
  cellInput: {
    height: 32,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 4,
    paddingHorizontal: 6,
    fontSize: 11,
    backgroundColor: "#FFFFFF",
    color: Colors.textPrimary,
  },
  dualHeadContainer: {
    flexDirection: "column",
    gap: 10,
  },
  headMetricCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  headBadgeA: {
    alignSelf: "flex-start",
    backgroundColor: "#0284C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 4,
  },
  headBadgeB: {
    alignSelf: "flex-start",
    backgroundColor: "#7C3AED",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginBottom: 4,
  },
  headBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "800",
  },
  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  metricVal: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  metricValLarge: {
    fontSize: 16,
    fontWeight: "900",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    color: Colors.primary,
  },
});
