import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

// Complete Code 128 patterns (widths of [bar, space, bar, space, bar, space])
// Sum of each pattern is 11 modules (indices 0 to 105). Stop pattern (106) has 7 elements.
const CODE128_PATTERNS: number[][] = [
  [2, 1, 2, 2, 2, 2], [2, 2, 2, 1, 2, 2], [2, 2, 2, 2, 2, 1], [1, 2, 1, 2, 2, 3], // 0-3
  [1, 2, 1, 3, 2, 2], [1, 3, 1, 2, 2, 2], [1, 2, 2, 2, 1, 3], [1, 2, 2, 3, 1, 2], // 4-7
  [1, 3, 2, 2, 1, 2], [2, 2, 1, 2, 1, 3], [2, 2, 1, 3, 1, 2], [2, 3, 1, 2, 1, 2], // 8-11
  [1, 1, 2, 2, 3, 2], [1, 2, 2, 1, 3, 2], [1, 2, 2, 2, 3, 1], [1, 1, 3, 2, 2, 2], // 12-15
  [1, 2, 3, 1, 2, 2], [1, 2, 3, 2, 2, 1], [2, 2, 3, 2, 1, 1], [2, 2, 1, 1, 3, 2], // 16-19
  [2, 2, 1, 2, 3, 1], [2, 1, 3, 2, 1, 2], [2, 2, 3, 1, 1, 2], [3, 1, 2, 1, 3, 1], // 20-23
  [3, 1, 1, 2, 2, 2], [3, 2, 1, 1, 2, 2], [3, 2, 1, 2, 2, 1], [3, 1, 2, 2, 1, 2], // 24-27
  [3, 2, 2, 1, 1, 2], [3, 2, 2, 2, 1, 1], [2, 1, 2, 1, 2, 3], [2, 1, 2, 3, 2, 1], // 28-31
  [2, 3, 2, 1, 2, 1], [1, 1, 1, 3, 2, 3], [1, 3, 1, 1, 2, 3], [1, 3, 1, 3, 2, 1], // 32-35
  [1, 1, 2, 3, 1, 3], [1, 3, 2, 1, 1, 3], [1, 3, 2, 3, 1, 1], [2, 1, 1, 3, 1, 3], // 36-39
  [2, 3, 1, 1, 1, 3], [2, 3, 1, 3, 1, 1], [1, 1, 2, 1, 3, 3], [1, 1, 2, 3, 3, 1], // 40-43
  [1, 3, 2, 1, 3, 1], [1, 1, 3, 1, 2, 3], [1, 1, 3, 3, 2, 1], [1, 3, 3, 1, 2, 1], // 44-47
  [3, 1, 3, 1, 2, 1], [2, 1, 1, 3, 3, 1], [2, 3, 1, 1, 3, 1], [2, 1, 3, 1, 1, 3], // 48-51
  [2, 1, 3, 3, 1, 1], [2, 1, 3, 1, 3, 1], [3, 1, 1, 1, 2, 3], [3, 1, 1, 3, 2, 1], // 52-55
  [3, 3, 1, 1, 2, 1], [3, 1, 2, 1, 1, 3], [3, 1, 2, 3, 1, 1], [3, 3, 2, 1, 1, 1], // 56-59
  [3, 1, 4, 1, 1, 1], [2, 2, 1, 4, 1, 1], [4, 3, 1, 1, 1, 1], [1, 1, 1, 2, 2, 4], // 60-63
  [1, 1, 1, 4, 2, 2], [1, 2, 1, 1, 2, 4], [1, 2, 1, 4, 2, 1], [1, 4, 1, 1, 2, 2], // 64-67
  [1, 4, 1, 2, 2, 1], [1, 1, 2, 2, 1, 4], [1, 1, 2, 4, 1, 2], [1, 2, 2, 1, 1, 4], // 68-71
  [1, 2, 2, 4, 1, 1], [1, 4, 2, 1, 1, 2], [1, 4, 2, 2, 1, 1], [2, 4, 1, 2, 1, 1], // 72-75
  [2, 2, 1, 1, 1, 4], [4, 1, 3, 1, 1, 1], [2, 4, 1, 1, 1, 2], [1, 3, 4, 1, 1, 1], // 76-79
  [1, 1, 1, 2, 4, 2], [1, 2, 1, 1, 4, 2], [1, 2, 1, 2, 4, 1], [1, 1, 4, 2, 1, 2], // 80-83
  [1, 2, 4, 1, 1, 2], [1, 2, 4, 2, 1, 1], [4, 1, 1, 2, 1, 2], [4, 2, 1, 1, 1, 2], // 84-87
  [4, 2, 1, 2, 1, 1], [2, 1, 2, 1, 4, 1], [2, 1, 4, 1, 2, 1], [4, 1, 2, 1, 2, 1], // 88-91
  [1, 1, 1, 1, 4, 3], [1, 1, 1, 3, 4, 1], [1, 3, 1, 1, 4, 1], [1, 1, 4, 1, 1, 3], // 92-95
  [1, 1, 4, 3, 1, 1], [4, 1, 1, 1, 1, 3], [4, 1, 1, 3, 1, 1], [1, 1, 3, 1, 4, 1], // 96-99
  [1, 1, 4, 1, 3, 1], [3, 1, 1, 1, 4, 1], [4, 1, 1, 1, 3, 1], [2, 1, 1, 4, 1, 2], // 100-103
  [2, 1, 1, 2, 1, 4], [2, 1, 1, 2, 3, 2],                                           // 104 (Start B), 105 (Start C)
  [2, 3, 3, 1, 1, 1, 2]                                                             // 106 (Stop)
];

/**
 * Encodes text into Code 128 symbols and generates bar modules
 */
function encodeCode128(text: string): { bars: boolean[]; totalModules: number } {
  const clean = text.trim();
  const isAllDigits = /^\d+$/.test(clean) && clean.length % 2 === 0 && clean.length > 0;

  const symbols: number[] = [];

  if (isAllDigits) {
    // Code 128C: Numeric pairs
    symbols.push(105); // Start C
    for (let i = 0; i < clean.length; i += 2) {
      symbols.push(parseInt(clean.substring(i, i + 2), 10));
    }
  } else {
    // Code 128B: Alphanumeric
    symbols.push(104); // Start B
    for (let i = 0; i < clean.length; i++) {
      const code = clean.charCodeAt(i);
      symbols.push(code >= 32 && code <= 126 ? code - 32 : 0);
    }
  }

  // Calculate checksum
  let checksum = symbols[0];
  for (let i = 1; i < symbols.length; i++) {
    checksum += symbols[i] * i;
  }
  symbols.push(checksum % 103);
  symbols.push(106); // Stop

  // Flatten symbols into binary bar modules
  const bars: boolean[] = [];
  for (const sym of symbols) {
    const pattern = CODE128_PATTERNS[sym] || CODE128_PATTERNS[0];
    let isBar = true;
    for (const width of pattern) {
      for (let w = 0; w < width; w++) {
        bars.push(isBar);
      }
      isBar = !isBar;
    }
  }

  return { bars, totalModules: bars.length };
}

export function clean12DigitUID(val?: string | null): string {
  if (!val) return '100100001001';
  let digits = String(val).replace(/\D/g, '');
  if (digits.length === 12) return digits;
  if (digits.length >= 4) {
    return ('10010000' + digits.slice(-4)).slice(0, 12).padEnd(12, '0');
  }
  return '100100001001';
}

export function formatPashuAadhaarUID(val?: string | null): string {
  const digits = clean12DigitUID(val);
  return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`;
}

export interface BarcodeViewProps {
  value: string;
  width?: number;
  height?: number;
  barColor?: string;
  backgroundColor?: string;
  showText?: boolean;
  formatText?: boolean;
  tagStyle?: 'plain' | 'ear-tag';
  subtitle?: string;
}

export const BarcodeView: React.FC<BarcodeViewProps> = ({
  value,
  width = 240,
  height = 64,
  barColor = '#0F172A',
  backgroundColor = 'transparent',
  showText = true,
  formatText = true,
  tagStyle = 'plain',
  subtitle = 'PASHU AADHAAR UID',
}) => {
  // Ensure value is strictly a 12-digit Pashu Aadhaar UID (digits only)
  const pashu12DigitUID = useMemo(() => {
    const raw = (value || '100100001001').trim();
    const digitsOnly = raw.replace(/\D/g, '');
    if (digitsOnly.length === 12) {
      return digitsOnly;
    }
    if (digitsOnly.length >= 4) {
      return ('10010000' + digitsOnly.slice(-4)).slice(0, 12).padEnd(12, '0');
    }
    return '100100001001';
  }, [value]);

  // Format 12-digit number into blocks of 4 digits (e.g. 1001  0000  1001)
  const formattedText = useMemo(() => {
    if (!formatText) return pashu12DigitUID;
    return `${pashu12DigitUID.slice(0, 4)}  ${pashu12DigitUID.slice(4, 8)}  ${pashu12DigitUID.slice(8, 12)}`;
  }, [pashu12DigitUID, formatText]);

  const { bars, totalModules } = useMemo(() => {
    return encodeCode128(pashu12DigitUID);
  }, [pashu12DigitUID]);

  const moduleWidth = width / totalModules;

  // Group continuous bars into rectangles for optimal SVG rendering
  const rects = useMemo(() => {
    const elements: { x: number; w: number }[] = [];
    let currentX = 0;
    let currentWidth = 0;
    let inBar = false;

    for (let i = 0; i < bars.length; i++) {
      if (bars[i]) {
        if (!inBar) {
          currentX = i * moduleWidth;
          currentWidth = moduleWidth;
          inBar = true;
        } else {
          currentWidth += moduleWidth;
        }
      } else {
        if (inBar) {
          elements.push({ x: currentX, w: currentWidth });
          inBar = false;
        }
      }
    }
    if (inBar) {
      elements.push({ x: currentX, w: currentWidth });
    }
    return elements;
  }, [bars, moduleWidth]);

  const content = (
    <View style={[styles.barcodeInner, { backgroundColor }]}>
      <Svg width={width} height={height}>
        {rects.map((r, idx) => (
          <Rect
            key={idx}
            x={r.x}
            y={0}
            width={r.w}
            height={height}
            fill={barColor}
          />
        ))}
      </Svg>
      {showText && (
        <View style={styles.textContainer}>
          <Text style={[styles.codeText, { color: barColor }]}>
            {formattedText}
          </Text>
          {subtitle ? (
            <Text style={styles.subText}>{subtitle}</Text>
          ) : null}
        </View>
      )}
    </View>
  );

  if (tagStyle === 'ear-tag') {
    return (
      <View style={styles.earTagContainer}>
        {/* Physical Ear Tag Look: Yellow Polyurethane Tag with Rivet & Emblem */}
        <View style={styles.earTagHole} />
        <View style={styles.earTagHeader}>
          <Text style={styles.earTagGovt}>GOVT OF INDIA • INAPH / NDDB</Text>
          <Text style={styles.earTagAavin}>AAVIN SMART PASSPORT</Text>
        </View>
        <View style={styles.earTagBody}>
          {content}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {content}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  barcodeInner: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  textContainer: {
    alignItems: 'center',
    marginTop: 6,
  },
  codeText: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  subText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  earTagContainer: {
    backgroundColor: '#FEF08A', // Official INAPH livestock ear-tag bright yellow
    borderColor: '#EAB308',
    borderWidth: 2,
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#CA8A04',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    position: 'relative',
    marginVertical: 6,
  },
  earTagHole: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EAB308',
    borderColor: '#CA8A04',
    borderWidth: 1.5,
    marginBottom: 6,
  },
  earTagHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  earTagGovt: {
    fontSize: 9,
    fontWeight: '800',
    color: '#713F12',
    letterSpacing: 0.6,
  },
  earTagAavin: {
    fontSize: 11,
    fontWeight: '900',
    color: '#854D0E',
    letterSpacing: 0.4,
  },
  earTagBody: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FDE047',
  },
});
