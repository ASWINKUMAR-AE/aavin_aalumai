import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "./api";
import { EvidenceService, DualHeadSubmissionPayload } from "./evidenceService";

export interface QueuedReading {
  idempotencyKey: string;
  machineId: string;
  headId: string;
  variantId: string;
  count: number;
  ocrValue: number | null;
  confirmedValue: number;
  ocrConfidence: number;
  deviceTime: string;
  deviceMonotonicMs: number;
  deviceBootId: string;
  source: string;
  photoBase64: string;
  status: "pending" | "uploading" | "synced" | "rejected";
  errorReason?: string;
  timestamp: number;
}

export interface QueuedDisplayEvidenceReading {
  idempotencyKey: string;
  photoUri: string;
  machineId: string;
  qrId?: string;
  shiftId: string;
  payload: DualHeadSubmissionPayload;
  status: "pending" | "uploading" | "synced" | "rejected";
  errorReason?: string;
  timestamp: number;
}

const STORAGE_KEY = "@aavin_offline_readings_queue";
const DISPLAY_STORAGE_KEY = "@aavin_offline_display_evidence_queue";

export class OfflineQueueService {
  static async enqueueReading(reading: QueuedReading): Promise<void> {
    const queue = await this.getQueue();
    queue.push(reading);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }

  static async getQueue(): Promise<QueuedReading[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static async enqueueDisplayEvidence(item: QueuedDisplayEvidenceReading): Promise<void> {
    const queue = await this.getDisplayQueue();
    queue.push(item);
    await AsyncStorage.setItem(DISPLAY_STORAGE_KEY, JSON.stringify(queue));
  }

  static async getDisplayQueue(): Promise<QueuedDisplayEvidenceReading[]> {
    try {
      const data = await AsyncStorage.getItem(DISPLAY_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static async syncDisplayQueue(): Promise<{ synced: number; failed: number }> {
    const queue = await this.getDisplayQueue();
    let synced = 0;
    let failed = 0;
    const remaining: QueuedDisplayEvidenceReading[] = [];

    for (const item of queue) {
      if (item.status === "synced") continue;
      try {
        // If evidence not uploaded yet, upload first
        if (!item.payload.evidence_id || item.payload.evidence_id.startsWith("local_")) {
          const uploadRes = await EvidenceService.uploadDisplayEvidence(
            item.photoUri,
            item.machineId,
            item.qrId,
            item.shiftId,
            item.idempotencyKey
          );
          item.payload.evidence_id = uploadRes.evidence_id;
        }

        await EvidenceService.submitDisplayReadings(item.payload);
        synced++;
      } catch (err: any) {
        failed++;
        item.status = "rejected";
        item.errorReason = err.response?.data?.detail || err.message;
        remaining.push(item);
      }
    }

    await AsyncStorage.setItem(DISPLAY_STORAGE_KEY, JSON.stringify(remaining));
    return { synced, failed };
  }

  static async syncPending(): Promise<{ synced: number; failed: number }> {
    const queue = await this.getQueue();
    let synced = 0;
    let failed = 0;
    const remaining: QueuedReading[] = [];

    for (const item of queue) {
      if (item.status === "synced") continue;
      try {
        await apiClient.post("/readings", {
          machine_id: item.machineId,
          head_id: item.headId,
          variant_id: item.variantId,
          count: item.confirmedValue,
          ocr_value: item.ocrValue,
          confirmed_value: item.confirmedValue,
          ocr_confidence: item.ocrConfidence,
          device_time: item.deviceTime,
          device_monotonic_ms: item.deviceMonotonicMs,
          device_boot_id: item.deviceBootId,
          source: item.source,
          photo_base64: item.photoBase64,
          idempotency_key: item.idempotencyKey,
        });
        synced++;
      } catch (err: any) {
        failed++;
        item.status = "rejected";
        item.errorReason = err.response?.data?.detail || err.message;
        remaining.push(item);
      }
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));

    // Also sync display evidence queue
    const displaySync = await this.syncDisplayQueue();
    synced += displaySync.synced;
    failed += displaySync.failed;

    return { synced, failed };
  }

  static async clearQueue(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await AsyncStorage.removeItem(DISPLAY_STORAGE_KEY);
  }
}


