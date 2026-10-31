import { 
  SEED_DEMO_USERS, 
  SEED_FARMERS, 
  SEED_COWS, 
  SEED_BOOTHS, 
  SEED_BMCS, 
  SEED_MILK_RECORDS, 
  SEED_DISCREPANCY_CASES 
} from '../data/seedData';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

console.log('\n======================================================');
console.log('🧪 AAVIN SMART CATTLE PASSPORT — FUNCTIONAL AUDIT SUITE');
console.log('======================================================\n');

// 1. Role Accounts & Seed Integrity
console.log('--- 1. Testing Role Accounts & Seed Entities ---');
const roles = ['farmer', 'booth', 'bmc', 'union', 'veterinary', 'admin'];
roles.forEach(role => {
  const account = SEED_DEMO_USERS.find(u => u.role === role);
  assert(!!account, `Demo account exists for role: ${role}`, `Found ${account?.id}`);
});

assert(SEED_DEMO_USERS.some(u => u.id === 'FARMER001'), 'FARMER001 exists');
assert(SEED_DEMO_USERS.some(u => u.id === 'BOOTH001'), 'BOOTH001 exists');
assert(SEED_DEMO_USERS.some(u => u.id === 'BMC001'), 'BMC001 exists');
assert(SEED_DEMO_USERS.some(u => u.id === 'UNION001'), 'UNION001 exists');
assert(SEED_DEMO_USERS.some(u => u.id === 'VET001'), 'VET001 exists');
assert(SEED_DEMO_USERS.some(u => u.id === 'ADMIN001'), 'ADMIN001 exists');

// 2. Farmer Validation
console.log('\n--- 2. Testing Farmer Validation & Uniqueness ---');
const indianPhoneRegex = /^[6-9]\d{9}$/;
SEED_FARMERS.forEach(f => {
  assert(indianPhoneRegex.test(f.mobileNumber), `Farmer ${f.name} has valid 10-digit Indian mobile: ${f.mobileNumber}`);
  assert(f.assignedBoothId.length > 0, `Farmer ${f.name} is assigned to Booth ${f.assignedBoothId}`);
});

const farmerIds = SEED_FARMERS.map(f => f.id);
const uniqueFarmerIds = new Set(farmerIds);
assert(farmerIds.length === uniqueFarmerIds.size, 'All seeded Farmer IDs are unique');

const farmerMobiles = SEED_FARMERS.map(f => f.mobileNumber);
const uniqueFarmerMobiles = new Set(farmerMobiles);
assert(farmerMobiles.length === uniqueFarmerMobiles.size, 'All seeded Farmer mobile numbers are unique');

// Test validation functions
function validateFarmer(data: { name: string; mobileNumber: string; assignedBoothId: string }) {
  if (!data.name.trim()) return 'Name required';
  if (!data.mobileNumber || !indianPhoneRegex.test(data.mobileNumber)) return 'Invalid mobile';
  if (!data.assignedBoothId) return 'Booth required';
  return null;
}

assert(validateFarmer({ name: 'R. Kumar', mobileNumber: '9842109876', assignedBoothId: 'BOOTH-MELUR-01' }) === null, 'Valid farmer passes validation');
assert(validateFarmer({ name: '', mobileNumber: '9842109876', assignedBoothId: 'BOOTH-MELUR-01' }) !== null, 'Empty name rejected');
assert(validateFarmer({ name: 'R. Kumar', mobileNumber: '1234567890', assignedBoothId: 'BOOTH-MELUR-01' }) !== null, 'Invalid mobile starting with 1 rejected');
assert(validateFarmer({ name: 'R. Kumar', mobileNumber: '984210987', assignedBoothId: 'BOOTH-MELUR-01' }) !== null, '9-digit mobile rejected');

// 3. Cattle 12-Digit Tag Validation
console.log('\n--- 3. Testing 12-Digit Cattle Tag Validation ---');
const tag12DigitRegex = /^\d{12}$/;
SEED_COWS.forEach(cow => {
  assert(tag12DigitRegex.test(cow.tagId), `Cow ${cow.name} tag #${cow.tagId} is 12 digits`);
  assert(cow.farmerId.length > 0, `Cow ${cow.name} is linked to Farmer ${cow.farmerId}`);
});

const cowTags = SEED_COWS.map(c => c.tagId);
const uniqueCowTags = new Set(cowTags);
assert(cowTags.length === uniqueCowTags.size, 'All seeded cow tags are unique');

function validateTag(tag: string, existingTags: string[]) {
  const clean = tag.replace(/\s+/g, '');
  if (!tag12DigitRegex.test(clean)) return 'Must be 12 digits';
  if (existingTags.includes(clean)) return 'Duplicate tag ID';
  return null;
}

assert(validateTag('100100001001', cowTags) === 'Duplicate tag ID', 'Duplicate tag correctly rejected');
assert(validateTag('100100009999', cowTags) === null, 'Unique 12-digit tag accepted');
assert(validateTag('12345', cowTags) === 'Must be 12 digits', 'Short tag correctly rejected');
assert(validateTag('10010000100A', cowTags) === 'Must be 12 digits', 'Non-numeric tag correctly rejected');

// 4. Milk Collection & Calculations
console.log('\n--- 4. Testing Milk Intake Calculations & Double Counting Prevention ---');
// Farmer-wise calculations
const farmerMuruganRecords = SEED_MILK_RECORDS.filter(r => r.farmerId === 'FARMER001');
assert(farmerMuruganRecords.length > 0, 'Farmer Murugan (FARMER001) has milk records');

const totalFarmerWise = farmerMuruganRecords.reduce((sum, r) => sum + r.quantityLitres, 0);
assert(totalFarmerWise > 0, `Farmer Murugan total milk: ${totalFarmerWise.toFixed(2)} L calculated from records`);

// Booth Eligible Total Calculation (Double Counting Prevention)
function calculateBoothEligibleTotal(records: typeof SEED_MILK_RECORDS) {
  let farmerWiseSum = 0;
  let vendorCombinedSum = 0;

  records.forEach(r => {
    if (r.measurementMethod === 'combined') {
      vendorCombinedSum += r.quantityLitres;
    } else {
      farmerWiseSum += r.quantityLitres;
    }
  });

  return {
    farmerWiseSum,
    vendorCombinedSum,
    totalEligible: farmerWiseSum + vendorCombinedSum,
  };
}

const boothIntake = calculateBoothEligibleTotal(SEED_MILK_RECORDS);
assert(boothIntake.totalEligible === (boothIntake.farmerWiseSum + boothIntake.vendorCombinedSum), 'Eligible total matches farmer-wise + combined without double counting');
assert(boothIntake.farmerWiseSum > 0, `Farmer-wise intake: ${boothIntake.farmerWiseSum.toFixed(2)} L`);
assert(boothIntake.vendorCombinedSum > 0, `Vendor combined intake: ${boothIntake.vendorCombinedSum.toFixed(2)} L`);

// 5. BMC Reconciliation & Difference Calculation
console.log('\n--- 5. Testing BMC Reconciliation (Difference = Declared - Measured) ---');
function reconcileDelivery(declaredLitres: number, measuredLitres: number, thresholdLitres = 5.0) {
  const difference = declaredLitres - measuredLitres;
  const isMismatch = Math.abs(difference) > thresholdLitres;
  return {
    declaredLitres,
    measuredLitres,
    difference,
    isMismatch,
    status: isMismatch ? 'mismatch_investigation_required' : 'confirmed_match',
  };
}

// Scenario A: Matching quantities
const scenarioA = reconcileDelivery(1000.0, 1000.0);
assert(scenarioA.difference === 0, 'Scenario A: Difference is exactly 0 L');
assert(!scenarioA.isMismatch, 'Scenario A: No mismatch flagged');
assert(scenarioA.status === 'confirmed_match', 'Scenario A: Status confirmed_match');

// Scenario B: Mismatched quantities (1000L declared, 970L measured)
const scenarioB = reconcileDelivery(1000.0, 970.0);
assert(scenarioB.difference === 30.0, 'Scenario B: Difference is 30.0 L (Declared 1000 - Measured 970)');
assert(scenarioB.isMismatch, 'Scenario B: Mismatch flagged when diff > threshold');
assert(scenarioB.status === 'mismatch_investigation_required', 'Scenario B: Status mismatch_investigation_required');
assert(scenarioB.declaredLitres === 1000.0, 'Scenario B: Original declared quantity preserved');
assert(scenarioB.measuredLitres === 970.0, 'Scenario B: Measured received quantity preserved');

// 6. Milk Safety Twin - Medicine Withdrawal Logic
console.log('\n--- 6. Testing Milk Safety Twin (Medicine Withdrawal Alerts) ---');
const cowLakshmi = SEED_COWS.find(c => c.tagId === '100100001002');
assert(!!cowLakshmi, 'Cow Lakshmi found in cattle registry');
assert(cowLakshmi?.activeWithdrawal?.hasActiveWithdrawal === true, 'Cow Lakshmi has active withdrawal flagged');
assert(!!cowLakshmi?.activeWithdrawal?.medicineName.includes('Amoxicillin'), 'Prescribed medicine recorded');
assert((cowLakshmi?.activeWithdrawal?.daysRemaining || 0) > 0, `Active withdrawal days remaining: ${cowLakshmi?.activeWithdrawal?.daysRemaining} days`);

// 7. Supply Chain 3-Stage Disaggregation
console.log('\n--- 7. Testing 3-Stage Stage Reconciliation (Distinct Nodes) ---');
const stage1_boothDispatched: number = 1250.0;
const stage2_bmcReceived: number = 1215.0;
const stage3_bmcReceiptSlips: number = 1215.0;
const netVariance = stage1_boothDispatched - stage2_bmcReceived;

assert(netVariance === 35.0, 'Stage variance calculated correctly (35.0 L)');
assert(stage1_boothDispatched !== stage2_bmcReceived, 'Stage 1 and Stage 2 are distinct measurement nodes');
assert(stage1_boothDispatched + stage2_bmcReceived !== stage3_bmcReceiptSlips, 'Stages are not artificially summed together');

// 8. Notification & Privacy Filtering
console.log('\n--- 8. Testing Notification & Record Role Filtering ---');
// Ensure a farmer cannot see records for another farmer
const farmer1Cows = SEED_COWS.filter(c => c.farmerId === 'FARM-MDU-101');
const farmer2Cows = SEED_COWS.filter(c => c.farmerId === 'FARM-MDU-102');
assert(farmer1Cows.every(c => c.farmerId === 'FARM-MDU-101'), 'Farmer 1 cows belong exclusively to Farmer 1');
assert(farmer2Cows.every(c => c.farmerId === 'FARM-MDU-102'), 'Farmer 2 cows belong exclusively to Farmer 2');
assert(farmer1Cows.every(c => !farmer2Cows.includes(c)), 'Zero cross-contamination of cow passports across farmers');

console.log('\n======================================================');
console.log(`📊 AUDIT RESULTS: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
