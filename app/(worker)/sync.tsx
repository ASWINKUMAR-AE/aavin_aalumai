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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "../../constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { OfflineQueueService, QueuedReading } from "../../services/offlineQueue";

export default function OfflineSyncScreen() {
  const insets = useSafeAreaInsets();
  const [queue, setQueue] = useState<QueuedReading[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    const items = await OfflineQueueService.getQueue();
    setQueue(items);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await OfflineQueueService.syncPending();
      Alert.alert(
        "Synchronization Complete",
        `Synced: ${res.synced} readings\nFailed: ${res.failed} readings`
      );
      await loadQueue();
    } catch {
      Alert.alert("Sync Error", "Server unreachable or network error.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 14) }]}>
        <Text style={styles.topBarTitle}>Offline Queue & Sync</Text>
        <TouchableOpacity onPress={loadQueue} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Status Banner */}
        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusTitle}>Encrypted Local SQLite Cache</Text>
          </View>
          <Text style={styles.statusDesc}>
            Readings captured without factory internet are stored locally with SHA-256 evidence hashes and synchronized idempotently when connectivity resumes.
          </Text>
        </View>

        <View style={styles.counterBox}>
          <Text style={styles.counterNum}>{queue.length}</Text>
          <Text style={styles.counterLabel}>Records Pending Upload</Text>
        </View>

        <TouchableOpacity
          style={styles.syncBtn}
          onPress={handleSync}
          disabled={isSyncing || queue.length === 0}
          activeOpacity={0.85}
        >
          {isSyncing ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Ionicons name="cloud-upload" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.syncBtnText}>TRIGGER SYNCHRONIZATION NOW</Text>
            </>
          )}
        </TouchableOpacity>

        {queue.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={48} color={Colors.success} />
            <Text style={styles.emptyTitle}>Queue is Clear</Text>
            <Text style={styles.emptySub}>All captured readings are synced with the central ledger.</Text>
          </View>
        ) : (
          queue.map((item, idx) => (
            <View key={item.idempotencyKey || idx} style={styles.queueCard}>
              <View style={styles.queueHeader}>
                <Text style={styles.headText}>{item.headId}</Text>
                <View
                  style={[
                    styles.statusPill,
                    item.status === "rejected" ? styles.pillError : styles.pillPending,
                  ]}
                >
                  <Text style={styles.pillText}>{item.status.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={styles.valText}>
                Counter: <Text style={{ fontWeight: "900", color: Colors.primary }}>{item.confirmedValue.toLocaleString()}</Text>
              </Text>
              <Text style={styles.keyText}>Key: {item.idempotencyKey}</Text>
            </View>
          ))
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
    justifyContent: "space-between",
    alignItems: "center",
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
  refreshBtn: {
    padding: 6,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statusCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: Colors.text,
  },
  statusDesc: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  counterBox: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 16,
  },
  counterNum: {
    fontSize: 36,
    fontWeight: "900",
    color: Colors.primary,
  },
  counterLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginTop: 4,
  },
  syncBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 50,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  syncBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
  queueCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  queueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  headText: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.secondary,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pillPending: {
    backgroundColor: Colors.warningLight,
  },
  pillError: {
    backgroundColor: Colors.errorLight,
  },
  pillText: {
    fontSize: 9,
    fontWeight: "800",
    color: Colors.text,
  },
  valText: {
    fontSize: 13,
    color: Colors.text,
    marginBottom: 4,
  },
  keyText: {
    fontSize: 10,
    color: Colors.textMuted,
  },
});

