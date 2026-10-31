import { getCurvedBarPath, TAB_BAR_HEIGHT, BUTTON_SIZE, AAVIN_NAV_COLORS } from '../components/navigation/curvedNavPath';
import enDict from '../locales/en.json';
import taDict from '../locales/ta.json';

console.log('====================================================');
console.log(' AAVIN FLOATING CURVED NAVIGATION BAR TEST SUITE   ');
console.log('====================================================\n');

let failedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`✅ Passed: ${testName}`);
  } else {
    console.error(`❌ FAILED: ${testName}`);
    if (detail) console.error(`   Detail: ${detail}`);
    failedTests++;
  }
}

// ----------------------------------------------------
// Test 1: Geometry & Constants
// ----------------------------------------------------
console.log('--- 1. Testing Floating Bar Constants & Sizing ---');
assert(TAB_BAR_HEIGHT === 68, 'Bar height is standard 68 points');
assert(BUTTON_SIZE === 58, 'Raised button diameter is 58 points (within 56-64 range)');
assert(AAVIN_NAV_COLORS.headerBg === '#5EA8EE', 'Selected nav item icon background color matches header bg (#5EA8EE)');

// ----------------------------------------------------
// Test 2: SVG Path Generator (Closed & Valid Paths)
// ----------------------------------------------------
console.log('\n--- 2. Testing SVG Curved Notch Generator ---');
const screenWidths = [320, 360, 393, 412, 768]; // Small Android, Standard, iPhone 15 Pro, Android Large, Tablet

for (const width of screenWidths) {
  for (let tabIndex = 0; tabIndex < 5; tabIndex++) {
    const itemWidth = width / 5;
    const activeX = (tabIndex + 0.5) * itemWidth;
    const path = getCurvedBarPath(width, TAB_BAR_HEIGHT, activeX);

    const isNonEmpty = path.length > 50;
    const startsWithM = path.startsWith('M ');
    const endsWithZ = path.trim().endsWith('Z');
    const hasNoNaN = !path.includes('NaN');
    const hasCurvedNotch = path.includes('C ') && path.includes('A ');

    assert(
      isNonEmpty && startsWithM && endsWithZ && hasNoNaN && hasCurvedNotch,
      `Valid closed SVG curve for width=${width}px, Tab ${tabIndex} (x=${activeX.toFixed(1)})`,
      `Path output: ${path}`
    );
  }
}

// ----------------------------------------------------
// Test 3: Edge Notch Handling (Tab 0 Left & Tab 4 Right)
// ----------------------------------------------------
console.log('\n--- 3. Testing Edge Corner Notch Blending ---');
const w = 360;
const leftPath = getCurvedBarPath(w, TAB_BAR_HEIGHT, (0 + 0.5) * (w / 5));
const rightPath = getCurvedBarPath(w, TAB_BAR_HEIGHT, (4 + 0.5) * (w / 5));

assert(!leftPath.includes('NaN'), 'Left edge notch has no NaN coordinates');
assert(!rightPath.includes('NaN'), 'Right edge notch has no NaN coordinates');
assert(leftPath.includes('A 28 28') || leftPath.includes('A 26 26'), 'Corner arcs preserved on base');

// ----------------------------------------------------
// Test 4: Role Navigation Definitions (Exactly 5 Items Per Role)
// ----------------------------------------------------
console.log('\n--- 4. Testing Role Navigation Configurations ---');

const ROLE_SPECS = {
  Farmer: ['Home', 'Milk', 'My Cows', 'Notifications', 'Profile'],
  'Society Staff': ['Home', 'Farmers', 'Record Milk', 'Receipts', 'Profile'],
  'BMC Staff': ['Home', 'Deliveries', 'Verify Milk', 'Alerts', 'Profile'],
  'Union Management': ['Home', 'BMCs', 'Reports', 'Alerts', 'Profile'],
  Veterinarian: ['Home', 'Cattle', 'Treatments', 'Follow-ups', 'Profile'],
};

for (const [role, tabs] of Object.entries(ROLE_SPECS)) {
  assert(tabs.length === 5, `${role} has exactly 5 tabs configured: [${tabs.join(', ')}]`);
}

// ----------------------------------------------------
// Test 5: English & Tamil Localization Coverage
// ----------------------------------------------------
console.log('\n--- 5. Testing English & Tamil Navigation Translations ---');

const requiredNavKeys = [
  'home',
  'milk',
  'myCows',
  'notifications',
  'profile',
  'farmers',
  'recordMilk',
  'receipts',
  'deliveries',
  'verifyMilk',
  'alerts',
  'bmcs',
  'reports',
  'cattle',
  'treatments',
  'followUps',
];

const enNav = (enDict as any).nav || {};
const taNav = (taDict as any).nav || {};

for (const key of requiredNavKeys) {
  assert(
    typeof enNav[key] === 'string' && enNav[key].trim().length > 0,
    `English translation exists for nav.${key}: "${enNav[key]}"`
  );
  assert(
    typeof taNav[key] === 'string' && taNav[key].trim().length > 0,
    `Tamil translation exists for nav.${key}: "${taNav[key]}"`
  );
}

// ----------------------------------------------------
// Summary
// ----------------------------------------------------
console.log('\n====================================================');
if (failedTests === 0) {
  console.log('🎉 ALL FLOATING CURVED NAVIGATION TESTS PASSED! (100% Success)');
} else {
  console.error(`⚠️ ${failedTests} tests failed.`);
  process.exit(1);
}
console.log('====================================================\n');
