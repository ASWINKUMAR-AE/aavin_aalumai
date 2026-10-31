export const TAB_BAR_HEIGHT = 68;
export const BUTTON_SIZE = 58;
export const TAB_BAR_CONTENT_INSET = 88;

// Aavin brand theme colors strictly matching requirements
export const AAVIN_NAV_COLORS = {
  navy: '#123451',
  primaryBlue: '#1688C9',
  skyBlueLight: '#EAF6FC',
  headerBg: '#5EA8EE', // Header background color matching DemoHeader & reference UI
  white: '#FFFFFF',
  darkText: '#17324D',
  secondaryText: '#718096',
  border: '#E2E8F0',
  success: '#218653',
  warning: '#D97706',
  error: '#C0392B',
};

/**
 * Generates a clean, closed SVG path for the pill-shaped floating bottom bar
 * with a smooth, continuous concave notch (cradle) around the active tab's center X.
 * 
 * Supports all 5 tabs and dynamically blends into left and right corner radii.
 */
export function getCurvedBarPath(w: number, h: number, x: number): string {
  if (w <= 0 || h <= 0) return '';

  const r = 28; // Outer corner radius of the bar
  const nw = 44; // Half-width of the notch
  const nd = 32; // Depth of the notch

  let d = `M 0 ${h - r} `;
  d += `A ${r} ${r} 0 0 0 ${r} ${h} `;
  d += `L ${w - r} ${h} `;
  d += `A ${r} ${r} 0 0 0 ${w} ${h - r} `;

  const xRight = x + nw;
  const xLeft = x - nw;

  // Right edge and right side of notch
  if (xRight >= w - 12) {
    // Notch intersects near the right rounded corner
    d += `L ${w} 24 `;
    d += `C ${w} 4, ${x + 22} ${nd}, ${x} ${nd} `;
  } else {
    d += `L ${w} ${r} `;
    d += `A ${r} ${r} 0 0 0 ${w - r} 0 `;
    d += `L ${xRight} 0 `;
    // Smooth convex lip into concave cradle
    d += `C ${x + 34} 0, ${x + 24} 6, ${x + 22} 12 `;
    d += `C ${x + 20} 20, ${x + 12} ${nd}, ${x} ${nd} `;
  }

  // Left side of notch and left edge
  if (xLeft <= 12) {
    // Notch intersects near the left rounded corner
    d += `C ${x - 12} ${nd}, ${x - 20} 20, ${x - 22} 12 `;
    d += `C ${x - 24} 6, 0 4, 0 24 `;
    d += `L 0 ${h - r} `;
  } else {
    d += `C ${x - 12} ${nd}, ${x - 20} 20, ${x - 22} 12 `;
    d += `C ${x - 24} 6, ${x - 34} 0, ${xLeft} 0 `;
    d += `L ${r} 0 `;
    d += `A ${r} ${r} 0 0 0 0 ${r} `;
    d += `L 0 ${h - r} `;
  }

  d += 'Z';
  return d;
}
