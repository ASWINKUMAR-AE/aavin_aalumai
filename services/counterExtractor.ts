/**
 * Configurable Counter Digit Extractor
 * Isolates the actual cumulative packet counter from surrounding PLC / HMI display text.
 */

export interface CounterCandidate {
  raw: string;
  cleaned: string;
  value: number;
  confidence: number;
  score: number;
  isLeadingZero: boolean;
}

export interface ExtractedCounterResult {
  detectedValue: number | null;
  rawText: string;
  candidates: CounterCandidate[];
  processingTimeSeconds?: number;
  confidence: number;
  requiresReview: boolean;
  notes: string;
}

// Common non-counter keywords appearing on VFFS HMI screens
const HMI_DISCARD_KEYWORDS = [
  "MACHINE", "HEAD", "TOTAL", "BATCH", "TEMP", "SEAL",
  "SPEED", "PPM", "RUNNING", "STOPPED", "ALARM", "SET",
  "RMC", "SAMARPAN", "ATOMIC", "VFFS", "AAVIN", "TIME",
  "SHIFT", "DATE", "LIMIT", "TARGET", "ERROR", "OK",
  "PLC", "HMI", "OPERATOR", "KG", "ML", "PACKET", "COUNT"
];

export function extractCounterDigits(
  rawOcrText: string,
  lastKnownCounter: number = 0,
  minDigits: number = 4,
  maxDigits: number = 7
): ExtractedCounterResult {
  if (!rawOcrText || typeof rawOcrText !== "string") {
    return {
      detectedValue: null,
      rawText: "",
      candidates: [],
      confidence: 0,
      requiresReview: true,
      notes: "No text returned from OCR engine",
    };
  }

  const lines = rawOcrText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const candidates: CounterCandidate[] = [];

  // Regex to extract all numeric tokens (including those separated by commas, periods, or spaces)
  const tokenRegex = /\b\d[\d,\.\s]{2,9}\d\b|\b\d{4,7}\b/g;

  for (const line of lines) {
    const uppercaseLine = line.toUpperCase();

    // Check if line is purely a label
    const isHeaderLine = HMI_DISCARD_KEYWORDS.some((kw) => uppercaseLine.includes(kw) && !uppercaseLine.match(/\d{4,}/));
    if (isHeaderLine) continue;

    const matches = line.match(tokenRegex);
    if (!matches) continue;

    for (const match of matches) {
      // Strip thousand separators and extraneous spaces
      const cleaned = match.replace(/[,\.\s]/g, "");
      if (!/^\d+$/.test(cleaned)) continue;

      const numVal = parseInt(cleaned, 10);
      if (isNaN(numVal)) continue;

      const digitCount = cleaned.length;
      if (digitCount < minDigits || digitCount > maxDigits) continue;

      // Scoring logic:
      // 1. Digits count score (5-6 digits standard on 1,000,000 rollover counters)
      let score = 50;
      if (digitCount >= 5 && digitCount <= 6) score += 30;

      // 2. Comparison with previous reading
      // Monotonic production: expected to be >= lastKnownCounter and <= lastKnownCounter + 15000 (unless rollover)
      if (lastKnownCounter > 0) {
        const delta = numVal - lastKnownCounter;
        if (delta >= 0 && delta <= 15000) {
          score += 40; // Highly plausible shift production increment
        } else if (lastKnownCounter >= 950000 && numVal <= 10000) {
          score += 35; // Plausible 1,000,000 rollover reset
        } else if (delta < 0) {
          score -= 20; // Unexpected backward count
        }
      }

      // 3. Isolated position preference
      if (line.trim() === match.trim()) {
        score += 20; // Single number on its own line
      }

      candidates.push({
        raw: match,
        cleaned,
        value: numVal,
        confidence: 0.95,
        score,
        isLeadingZero: cleaned.startsWith("0"),
      });
    }
  }

  // Sort candidates by score descending
  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 0) {
    // Fallback: look for ANY number of at least 3 digits
    const anyNumMatch = rawOcrText.match(/\d{3,}/);
    if (anyNumMatch) {
      const fallbackVal = parseInt(anyNumMatch[0], 10);
      return {
        detectedValue: fallbackVal,
        rawText: rawOcrText,
        candidates: [{
          raw: anyNumMatch[0],
          cleaned: anyNumMatch[0],
          value: fallbackVal,
          confidence: 0.60,
          score: 30,
          isLeadingZero: false,
        }],
        confidence: 0.60,
        requiresReview: true,
        notes: "Low-confidence candidate extracted from display text",
      };
    }

    return {
      detectedValue: null,
      rawText: rawOcrText,
      candidates: [],
      confidence: 0,
      requiresReview: true,
      notes: "Could not isolate valid counter digits from OCR output",
    };
  }

  const bestCandidate = candidates[0];
  const requiresReview = candidates.length > 1 && (candidates[0].score - candidates[1].score < 15);

  return {
    detectedValue: bestCandidate.value,
    rawText: rawOcrText,
    candidates,
    confidence: bestCandidate.score >= 80 ? 0.98 : (bestCandidate.score >= 60 ? 0.85 : 0.70),
    requiresReview,
    notes: requiresReview
      ? "Multiple counter candidates detected on HMI display. Worker verification required."
      : "Single high-confidence counter value isolated.",
  };
}

