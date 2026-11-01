import { apiClient, API_BASE_URL } from "./api";

export interface EvidenceUploadResult {
  evidence_id: string;
  evidence_uuid: string;
  machine_id: string;
  qr_id?: string;
  image_sha256: string;
  upload_status: string;
  file_size: number;
  server_received_at: string;
  image_url: string;
}

export interface DualHeadSubmissionPayload {
  evidence_id: string;
  machine_id: string;
  qr_id?: string;
  shift_id?: string;
  device_id?: string;
  device_time: string;
  device_monotonic_ms?: number;
  device_boot_id?: string;
  idempotency_key?: string;
  raw_ocr_response?: any;
  head_readings: Array<{
    head_number: number;
    head_id?: string;
    head_label?: string;
    variant_id?: string;
    production_ocr_value?: number | null;
    wastage_ocr_value?: number | null;
    variant_ocr_value?: string | null;
    machine_speed_ocr?: number | null;
    feed_time_ocr?: string | null;
    recipe_no_ocr?: number | null;
    production_confirmed_value: number;
    wastage_confirmed_value?: number | null;
    variant_confirmed_value?: string | null;
    ocr_confidence?: number;
    correction_status?: string;
    correction_reason?: string | null;
  }>;
}

export interface MachineDisplayEvidenceItem {
  id: string;
  evidence_uuid: string;
  machine_id: string;
  machine_code?: string;
  machine_name?: string;
  qr_id?: string;
  shift_id?: string;
  worker_id: string;
  worker_name?: string;
  mime_type: string;
  file_size: number;
  image_sha256: string;
  captured_at: string;
  server_received_at: string;
  upload_status: string;
  verification_status: string;
  image_url: string;
  head_readings: Array<{
    id: string;
    head_number: number;
    head_label?: string;
    production_ocr_value?: number;
    wastage_ocr_value?: number;
    variant_ocr_value?: string;
    production_confirmed_value: number;
    wastage_confirmed_value?: number;
    variant_confirmed_value?: string;
    machine_speed_ocr?: number;
    feed_time_ocr?: string;
    recipe_no_ocr?: number;
    ocr_confidence: number;
    correction_status: string;
    correction_reason?: string;
  }>;
  created_at: string;
}

export class EvidenceService {
  /**
   * Uploads captured HMI display photograph to the backend.
   * Generates SHA-256 and stores in protected evidence archive.
   */
  static async uploadDisplayEvidence(
    imageUri: string,
    machineId: string,
    qrId?: string,
    shiftId: string = "Shift 1 (Morning)",
    idempotencyKey?: string
  ): Promise<EvidenceUploadResult> {
    const formData = new FormData();
    const filename = imageUri.split("/").pop() || `hmi_${Date.now()}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";

    formData.append("image", {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    formData.append("machine_id", machineId);
    if (qrId) formData.append("qr_id", qrId);
    if (shiftId) formData.append("shift_id", shiftId);
    formData.append("captured_at", new Date().toISOString());
    formData.append("device_id", "AAVIN-RN-SCANNER-01");
    if (idempotencyKey) formData.append("idempotency_key", idempotencyKey);

    const response = await apiClient.post<EvidenceUploadResult>(
      "/machine-readings/evidence",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 45000,
      }
    );

    return response.data;
  }

  /**
   * Submits worker-confirmed multi-head readings linked to the uploaded evidence.
   */
  static async submitDisplayReadings(payload: DualHeadSubmissionPayload): Promise<any> {
    const response = await apiClient.post("/machine-readings", payload, {
      timeout: 30000,
    });
    return response.data;
  }

  /**
   * Retrieves list of uploaded HMI evidence records for official audit.
   */
  static async listEvidence(filters: {
    machine_id?: string;
    shift_id?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<MachineDisplayEvidenceItem[]> {
    const response = await apiClient.get<MachineDisplayEvidenceItem[]>(
      "/machine-readings/evidence",
      { params: filters }
    );
    return response.data;
  }

  /**
   * Retrieves single detailed evidence record with dual-head readings.
   */
  static async getEvidenceDetail(evidenceId: string): Promise<MachineDisplayEvidenceItem> {
    const response = await apiClient.get<MachineDisplayEvidenceItem>(
      `/machine-readings/evidence/${evidenceId}`
    );
    return response.data;
  }

  /**
   * Generates direct streaming URL for full-resolution original photograph.
   */
  static getImageUrl(evidenceId: string): string {
    return `${API_BASE_URL}/machine-readings/evidence/${evidenceId}/image`;
  }
}
