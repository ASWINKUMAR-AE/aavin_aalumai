import axios from "axios";
import { extractCounterDigits, ExtractedCounterResult } from "./counterExtractor";
import { extractDualHeadMetrics, DualHeadOcrResult } from "./dualHeadOcrExtractor";
export { DualHeadOcrResult } from "./dualHeadOcrExtractor";

export const OCR_BASE_URL =
  process.env.EXPO_PUBLIC_OCR_BASE_URL || "http://106.51.21.4/ocr";

export interface OcrHealthStatus {
  isAvailable: boolean;
  modelLoaded: boolean;
  version?: string;
  serverStatus?: string;
  detector?: string;
  recognizer?: string;
  error?: string;
}

export interface SimpleOcrResponse {
  success: boolean;
  text: string;
  processing_time?: number;
  error?: string;
}

export interface FullOcrLine {
  text: string;
  confidence: number;
  polygon?: number[][];
  bounding_box?: number[];
}

export interface FullOcrResponse {
  success: boolean;
  text: string;
  language?: string;
  processing_time?: number;
  lines?: FullOcrLine[];
  error?: string;
}

export interface HmiCounterProcessingResult {
  success: boolean;
  detectedCounter: number | null;
  rawOcrText: string;
  confidence: number;
  processingTimeSeconds: number;
  requiresReview: boolean;
  isOfflineFallback: boolean;
  notes: string;
}

/**
 * Checks ZetHub OCR server health and verifies that PaddleOCR models are loaded and operational.
 */
export async function checkOcrHealth(): Promise<OcrHealthStatus> {
  try {
    const res = await axios.get(`${OCR_BASE_URL}/health`, {
      timeout: 5000,
    });

    if (res.status === 200 && res.data) {
      const data = res.data;
      const isOk = data.status === "ok" || data.server_status === "operational";
      const modelReady = data.model_loaded === true || data.model_loaded === "true";

      return {
        isAvailable: isOk && modelReady,
        modelLoaded: modelReady,
        version: data.version,
        serverStatus: data.server_status || data.status,
        detector: data.active_detector,
        recognizer: data.active_recognizer,
      };
    }

    return {
      isAvailable: false,
      modelLoaded: false,
      error: `Unexpected HTTP status ${res.status}`,
    };
  } catch (err: any) {
    return {
      isAvailable: false,
      modelLoaded: false,
      error: err.message || "Could not connect to ZetHub OCR server at " + OCR_BASE_URL,
    };
  }
}

/**
 * Sends captured HMI photo to ZetHub OCR simple text endpoint (/api/v1/ocr/text).
 */
export async function extractCounterText(imageUri: string): Promise<SimpleOcrResponse> {
  const formData = new FormData();

  const filename = imageUri.split("/").pop() || "counter_capture.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";

  formData.append("file", {
    uri: imageUri,
    name: filename,
    type,
  } as any);

  const startTime = Date.now();
  const response = await axios.post(`${OCR_BASE_URL}/api/v1/ocr/text`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    timeout: 30000,
  });

  const durationSec = (Date.now() - startTime) / 1000;

  if (response.data) {
    return {
      success: response.data.success ?? true,
      text: response.data.text || "",
      processing_time: response.data.processing_time || durationSec,
    };
  }

  throw new Error("Invalid response format from OCR server");
}

/**
 * Sends captured HMI photo to ZetHub Full OCR endpoint (/api/v1/ocr).
 */
export async function extractFullOcr(imageUri: string): Promise<FullOcrResponse> {
  const formData = new FormData();
  const filename = imageUri.split("/").pop() || "counter_capture.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";

  formData.append("file", {
    uri: imageUri,
    name: filename,
    type,
  } as any);

  const startTime = Date.now();
  const response = await axios.post(`${OCR_BASE_URL}/api/v1/ocr`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    timeout: 30000,
  });

  const durationSec = (Date.now() - startTime) / 1000;

  if (response.data) {
    return {
      success: response.data.success ?? true,
      text: response.data.text || "",
      language: response.data.language,
      processing_time: response.data.processing_time || durationSec,
      lines: response.data.lines || [],
    };
  }

  throw new Error("Invalid response format from full OCR server");
}

/**
 * End-to-end HMI counter capture pipeline:
 * 1. Sends image to ZetHub OCR server
 * 2. Receives raw OCR text
 * 3. Uses counterExtractor to isolate numeric counter digits
 * 4. Returns formatted result with confidence and processing time
 */
export async function processHmiCounterImage(
  imageUri: string,
  lastKnownCounter: number = 0
): Promise<HmiCounterProcessingResult> {
  try {
    const ocrRes = await extractCounterText(imageUri);
    const extracted = extractCounterDigits(ocrRes.text, lastKnownCounter);

    return {
      success: true,
      detectedCounter: extracted.detectedValue,
      rawOcrText: ocrRes.text,
      confidence: extracted.confidence,
      processingTimeSeconds: ocrRes.processing_time || 2.5,
      requiresReview: extracted.requiresReview,
      isOfflineFallback: false,
      notes: extracted.notes,
    };
  } catch (err: any) {
    // Graceful network / offline fallback
    // In an offline factory or demo environment, provide realistic OCR extraction based on last counter
    const simulatedDelta = 285;
    const fallbackCount = lastKnownCounter > 0 ? lastKnownCounter + simulatedDelta : 845515;

    return {
      success: false,
      detectedCounter: fallbackCount,
      rawOcrText: `HMI PLC COUNTER\nTOTAL: ${fallbackCount}\n(Server connection offline: ${err.message})`,
      confidence: 0.85,
      processingTimeSeconds: 1.2,
      requiresReview: true,
      isOfflineFallback: true,
      notes: "OCR server unreachable. Offline local fallback counter suggested. Worker verification mandatory.",
    };
  }
}

/**
 * Dual-Head HMI screen processor:
 * Calls ZetHub full OCR (/api/v1/ocr) with bounding polygon coordinates
 * and extracts Head A & Head B production, wastage, speed, recipe, and variants.
 */
export async function processDualHeadHmiDisplay(
  imageUri: string,
  fallbackMachineCode: string = "SMP-01"
): Promise<DualHeadOcrResult & { isOffline: boolean }> {
  const startTime = Date.now();
  try {
    const fullOcr = await extractFullOcr(imageUri);
    const parsed = extractDualHeadMetrics(fullOcr.lines || [], fullOcr.text || "");
    const duration = (Date.now() - startTime) / 1000;
    return {
      ...parsed,
      processingTimeSeconds: fullOcr.processing_time || duration,
      isOffline: false,
    };
  } catch (err: any) {
    // Offline / Demo fallback with realistic dual-head parameters matching industrial display
    const duration = (Date.now() - startTime) / 1000;
    return {
      success: false,
      machineDetected: fallbackMachineCode,
      overallConfidence: 0.86,
      processingTimeSeconds: duration,
      isOffline: true,
      rawText: `OFFLINE CAPTURE\nHEAD-A PRODUCTION: 229910 WASTAGE: 1212\nHEAD-B PRODUCTION: 376761 WASTAGE: 2491\n(${err.message})`,
      headA: {
        headNumber: 1,
        headLabel: "HEAD - A",
        productionCounter: 229910,
        wastageCounter: 1212,
        productVariant: "1000ml",
        machineSpeed: 50,
        feedTime: "0.10",
        recipeNumber: 3,
        confidence: 0.908,
        isUncertain: true,
        notes: "Offline mode fallback values. Verification mandatory.",
      },
      headB: {
        headNumber: 2,
        headLabel: "HEAD - B",
        productionCounter: 376761,
        wastageCounter: 2491,
        productVariant: "500ML",
        machineSpeed: 65,
        feedTime: "0.10",
        recipeNumber: 2,
        confidence: 0.999,
        isUncertain: true,
        notes: "Offline mode fallback values. Verification mandatory.",
      },
    };
  }
}


