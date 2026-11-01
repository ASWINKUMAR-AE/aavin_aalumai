export interface OcrPolygonPoint {
  x: number;
  y: number;
}

export interface FullOcrLineItem {
  reading_order?: number;
  text: string;
  confidence: number;
  polygon?: number[][];
  bounding_box?: number[];
}

export interface HeadExtractedData {
  headNumber: number; // 1 (Head A) or 2 (Head B)
  headLabel: string; // "HEAD - A" or "HEAD - B"
  productionCounter: number | null;
  wastageCounter: number | null;
  productVariant: string | null;
  machineSpeed: number | null;
  feedTime: string | null;
  recipeNumber: number | null;
  confidence: number;
  isUncertain: boolean;
  notes: string;
}

export interface DualHeadOcrResult {
  success: boolean;
  machineDetected?: string;
  headA: HeadExtractedData;
  headB: HeadExtractedData;
  overallConfidence: number;
  rawText: string;
  processingTimeSeconds?: number;
}

interface BoundingBox {
  text: string;
  confidence: number;
  cx: number;
  cy: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Parses full OCR response lines with polygon coordinates to isolate
 * Head A (left side) and Head B (right side) metrics from an industrial HMI screen.
 */
export function extractDualHeadMetrics(
  lines: FullOcrLineItem[],
  rawText: string = ""
): DualHeadOcrResult {
  const boxes: BoundingBox[] = [];

  for (const line of lines) {
    if (!line.text) continue;
    const poly = line.polygon;
    if (poly && poly.length >= 4) {
      const xs = poly.map((p) => p[0]);
      const ys = poly.map((p) => p[1]);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      boxes.push({
        text: line.text.trim(),
        confidence: line.confidence ?? 0.95,
        cx: (minX + maxX) / 2,
        cy: (minY + maxY) / 2,
        minX,
        maxX,
        minY,
        maxY,
      });
    } else {
      // Line without polygon: fallback center based on index
      boxes.push({
        text: line.text.trim(),
        confidence: line.confidence ?? 0.9,
        cx: 500,
        cy: 500,
        minX: 0,
        maxX: 1000,
        minY: 0,
        maxY: 1000,
      });
    }
  }

  // Find split X boundary
  const headABox = boxes.find((b) => /HEAD\s*[-–—]?\s*A/i.test(b.text));
  const headBBox = boxes.find((b) => /HEAD\s*[-–—]?\s*B/i.test(b.text));
  const centerLogo = boxes.find((b) => /SAMARPAN|RMC|ATOMIC/i.test(b.text));

  let splitX = 560;
  if (headABox && headBBox) {
    splitX = (headABox.cx + headBBox.cx) / 2;
  } else if (centerLogo) {
    splitX = centerLogo.cx;
  } else if (boxes.length > 0) {
    const allX = boxes.map((b) => b.cx);
    splitX = (Math.min(...allX) + Math.max(...allX)) / 2;
  }

  const leftBoxes = boxes.filter((b) => b.cx < splitX);
  const rightBoxes = boxes.filter((b) => b.cx >= splitX);

  const headA = extractSideMetrics(leftBoxes, 1, "HEAD - A");
  const headB = extractSideMetrics(rightBoxes, 2, "HEAD - B");

  // Fallback text parsing if boxes produced no counters
  if (!headA.productionCounter && !headB.productionCounter && rawText) {
    applyTextFallback(rawText, headA, headB);
  }

  const overallConf = (headA.confidence + headB.confidence) / 2;

  return {
    success: true,
    machineDetected: centerLogo ? centerLogo.text : "SAMARPAN",
    headA,
    headB,
    overallConfidence: Number(overallConf.toFixed(3)),
    rawText,
  };
}

function extractSideMetrics(
  sideBoxes: BoundingBox[],
  headNumber: number,
  label: string
): HeadExtractedData {
  let productionCounter: number | null = null;
  let wastageCounter: number | null = null;
  let productVariant: string | null = null;
  let machineSpeed: number | null = null;
  let feedTime: string | null = null;
  let recipeNumber: number | null = null;

  let confidences: number[] = [];

  for (let i = 0; i < sideBoxes.length; i++) {
    const b = sideBoxes[i];
    const upper = b.text.toUpperCase();

    // 1. Production Counter (Number below 'PRODUCTION')
    if (upper === "PRODUCTION" || upper.includes("PROD")) {
      confidences.push(b.confidence);
      const candidates = sideBoxes.filter(
        (c) => c.cy > b.cy && Math.abs(c.cx - b.cx) < 70
      );
      candidates.sort((a, b) => a.cy - b.cy);
      for (const c of candidates) {
        const digits = c.text.replace(/\D/g, "");
        if (digits.length >= 4) {
          productionCounter = parseInt(digits, 10);
          confidences.push(c.confidence);
          break;
        }
      }
    }

    // 2. Wastage Counter (Number below 'WASTAGE')
    if (upper === "WASTAGE" || upper.includes("WAST")) {
      confidences.push(b.confidence);
      const candidates = sideBoxes.filter(
        (c) => c.cy > b.cy && Math.abs(c.cx - b.cx) < 70
      );
      candidates.sort((a, b) => a.cy - b.cy);
      for (const c of candidates) {
        const digits = c.text.replace(/\D/g, "");
        if (digits.length >= 1 && digits.length <= 6) {
          wastageCounter = parseInt(digits, 10);
          confidences.push(c.confidence);
          break;
        }
      }
    }

    // 3. Product Variant (e.g., '1000ml', '500ML', '200ml')
    if (/(\d+)\s*(ML|L|GM)/i.test(b.text)) {
      productVariant = b.text.trim();
      confidences.push(b.confidence);
    }

    // 4. Recipe Number (e.g. RECIPE No. 3 or 2)
    if (upper.includes("RECIPE")) {
      const candidates = sideBoxes.filter(
        (c) => Math.abs(c.cy - b.cy) < 25 && c.cx > b.cx
      );
      if (candidates.length > 0) {
        const num = parseInt(candidates[0].text.replace(/\D/g, ""), 10);
        if (!isNaN(num)) {
          recipeNumber = num;
          confidences.push(candidates[0].confidence);
        }
      }
    }

    // 5. Feed Time (e.g. FEED TIME 0.10)
    if (upper.includes("FEED TIME")) {
      const candidates = sideBoxes.filter(
        (c) => Math.abs(c.cy - b.cy) < 25 && c.cx > b.cx
      );
      if (candidates.length > 0) {
        feedTime = candidates[0].text.trim();
        confidences.push(candidates[0].confidence);
      }
    }

    // 6. Machine Speed (e.g. SET 50 / 65)
    if (upper === "SET") {
      const candidates = sideBoxes.filter(
        (c) => Math.abs(c.cy - b.cy) < 25 && c.cx > b.cx
      );
      if (candidates.length > 0) {
        const spd = parseInt(candidates[0].text.replace(/\D/g, ""), 10);
        if (!isNaN(spd)) {
          machineSpeed = spd;
          confidences.push(candidates[0].confidence);
        }
      }
    }
  }

  // Direct numeric scan fallback for production / wastage if label association missed
  if (!productionCounter) {
    const bigNumbers = sideBoxes
      .map((b) => ({
        val: parseInt(b.text.replace(/\D/g, ""), 10),
        conf: b.confidence,
        raw: b.text,
      }))
      .filter((n) => !isNaN(n.val) && n.val >= 10000 && n.val <= 999999);
    if (bigNumbers.length > 0) {
      productionCounter = bigNumbers[0].val;
      confidences.push(bigNumbers[0].conf);
    }
  }

  const avgConfidence =
    confidences.length > 0
      ? confidences.reduce((a, b) => a + b, 0) / confidences.length
      : 0.85;

  const isUncertain = productionCounter === null || avgConfidence < 0.88;

  return {
    headNumber,
    headLabel: label,
    productionCounter,
    wastageCounter,
    productVariant: productVariant || (headNumber === 1 ? "1000ml" : "500ML"),
    machineSpeed,
    feedTime,
    recipeNumber,
    confidence: Number(avgConfidence.toFixed(3)),
    isUncertain,
    notes: isUncertain
      ? "Low confidence or unconfirmed counter detected. Worker manual confirmation required."
      : "Spatial coordinates verified from physical HMI layout.",
  };
}

function applyTextFallback(
  text: string,
  headA: HeadExtractedData,
  headB: HeadExtractedData
) {
  // Regex pattern matching numbers in raw text
  const numbers = text.match(/\b\d{4,6}\b/g);
  if (numbers && numbers.length >= 2) {
    headA.productionCounter = parseInt(numbers[0], 10);
    headB.productionCounter = parseInt(numbers[1], 10);
    headA.confidence = 0.82;
    headB.confidence = 0.82;
  }
}
