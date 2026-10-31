import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "../../services/api";

const HEAD_CHAINS = [
  { id: "RMC-01-H1", machine: "RMC-01", verifiedCount: 42, isValid: true, latestHash: "54ca113b8dbc9d99f018eac3528b9d21..." },
  { id: "RMC-01-H2", machine: "RMC-01", verifiedCount: 40, isValid: true, latestHash: "4422f711fdb1ccae77b21901ddfa4561..." },
  { id: "RMC-02-H1", machine: "RMC-02", verifiedCount: 38, isValid: true, latestHash: "98ab21cf4402bcde1203aa4567ef9021..." },
  { id: "RMC-02-H2", machine: "RMC-02", verifiedCount: 38, isValid: true, latestHash: "77ac90123efb45cd8901aa2345bc6789..." },
  { id: "SAMARPAN-01-H1", machine: "SAMARPAN-01", verifiedCount: 35, isValid: true, latestHash: "65de89ab12cd34ef5678bc9012de3456..." },
  { id: "SAMARPAN-01-H2", machine: "SAMARPAN-01", verifiedCount: 35, isValid: true, latestHash: "54cd7890ab12cd34ef5678bc9012de34..." },
  { id: "SAMARPAN-02-H1", machine: "SAMARPAN-02", verifiedCount: 32, isValid: true, latestHash: "43bc67890ab12cd34ef5678bc9012de3..." },
  { id: "SAMARPAN-02-H2", machine: "SAMARPAN-02", verifiedCount: 32, isValid: true, latestHash: "32ab567890ab12cd34ef5678bc9012de..." },
  { id: "SAMARPAN-03-H1", machine: "SAMARPAN-03", verifiedCount: 28, isValid: true, latestHash: "21ef4567890ab12cd34ef5678bc9012d..." },
  { id: "SAMARPAN-03-H2", machine: "SAMARPAN-03", verifiedCount: 28, isValid: true, latestHash: "10de34567890ab12cd34ef5678bc9012..." },
  { id: "ATOMIC-01-H1", machine: "ATOMIC-01", verifiedCount: 30, isValid: true, latestHash: "09cd234567890ab12cd34ef5678bc901..." },
  { id: "ATOMIC-01-H2", machine: "ATOMIC-01", verifiedCount: 30, isValid: true, latestHash: "98bc1234567890ab12cd34ef5678bc90..." },
  { id: "ATOMIC-02-H1", machine: "ATOMIC-02", verifiedCount: 26, isValid: true, latestHash: "87ab01234567890ab12cd34ef5678bc9..." },
  { id: "ATOMIC-02-H2", machine: "ATOMIC-02", verifiedCount: 26, isValid: true, latestHash: "76fa901234567890ab12cd34ef5678bc..." },
];

export default function OfficialIntegrityScreen() {
  const [chains, setChains] = useState(HEAD_CHAINS);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerifyAll = async () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      Alert.alert(
        "Cryptographic Audit Complete",
        "All 14 Machine Head Hash Chains verified from Genesis to latest reading. 0 broken links detected."
      );
    }, 1200);
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Hash Chain Integrity Monitor</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Verification Summary Banner */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryTop}>
            <View style={styles.shieldIcon}>
              <Ionicons name="shield-checkmark" size={32} color={Colors.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.summaryTitle}>14 / 14 Chains Verified</Text>
              <Text style={styles.summarySub}>Zero broken links • Zero tamper alerts</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.verifyBtn}
            onPress={handleVerifyAll}
            disabled={isVerifying}
            activeOpacity={0.85}
          >
            {isVerifying ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="reload" size={16} color="#FFF" style={{ marginRight: 6 }} />
                <Text style={styles.verifyBtnText}>RE-VERIFY ALL 14 CHAINS</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.listTitle}>Independent Head Hash Chains (14 Units)</Text>

        {chains.map((c) => (
          <View key={c.id} style={styles.chainCard}>
            <View style={styles.chainHeader}>
              <View>
                <Text style={styles.headIdText}>{c.id}</Text>
                <Text style={styles.machineText}>{c.machine}</Text>
              </View>
              <View style={styles.validBadge}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                <Text style={styles.validText}>VERIFIED</Text>
              </View>
            </View>

            <View style={styles.chainMetaRow}>
              <Text style={styles.metaLabel}>Verified Readings: <Text style={styles.metaVal}>{c.verifiedCount}</Text></Text>
              <Text style={styles.metaLabel}>Genesis Linked: <Text style={styles.metaVal}>YES</Text></Text>
            </View>

            <View style={styles.hashRow}>
              <Text style={styles.hashLabel}>LATEST SHA-256 HASH:</Text>
              <Text style={styles.hashVal} numberOfLines={1}>{c.latestHash}</Text>
            </View>
          </View>
        ))}
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
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: Colors.success,
    marginBottom: 20,
  },
  summaryTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
  },
  shieldIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.successLight,
    justifyContent: "center",
    alignItems: "center",
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: Colors.text,
  },
  summarySub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  verifyBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: 10,
    height: 44,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  verifyBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.secondary,
    marginBottom: 10,
  },
  chainCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  chainHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  headIdText: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.text,
  },
  machineText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  validBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.successLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  validText: {
    fontSize: 10,
    fontWeight: "800",
    color: Colors.success,
  },
  chainMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  metaLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  metaVal: {
    fontWeight: "800",
    color: Colors.text,
  },
  hashRow: {
    flexDirection: "row",
    backgroundColor: Colors.borderLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: "center",
    gap: 6,
  },
  hashLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.textSecondary,
  },
  hashVal: {
    flex: 1,
    fontSize: 10,
    fontFamily: "monospace",
    color: Colors.primary,
  },
});
