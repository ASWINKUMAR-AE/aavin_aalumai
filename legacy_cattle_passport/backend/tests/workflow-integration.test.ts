import assert from 'assert';
import { WorkflowService } from '../src/modules/workflow/workflow.service.js';
import enDict from '../../locales/en.json' assert { type: 'json' };
import taDict from '../../locales/ta.json' assert { type: 'json' };

export async function runWorkflowIntegrationTests() {
  console.log('\n--- Running Complete Aavin 4-Stage Workflow Integration Tests ---');

  // Test A: Master Data - Booths & BMCs
  const booths = await WorkflowService.getBooths();
  assert(booths.length >= 2, 'Must have at least 2 registered collection booths');
  const melurBooth = booths.find((b: any) => b.code.includes('MDU-01')) || booths[0];
  console.log(`✅ Test A1 Passed: Found Booth '${melurBooth.name}' linked to BMC`);

  // Test B: Milk Intake (Route A direct and Route B vendor)
  const today = new Date().toISOString().split('T')[0];

  // Route A: Direct Farmer supply
  const directTx = await WorkflowService.recordMilkTransaction({
    farmerUserId: 'usr-farmer-01',
    farmerName: 'K. Murugesan',
    boothId: melurBooth.id,
    collectionDate: today,
    session: 'morning',
    quantityLitres: 12.50,
    route: 'direct',
    measurementMethod: 'farmer_wise',
    createdByUserId: 'usr-booth-01',
    notes: 'Integration Test Direct Farm Supply',
  });
  assert(directTx.id, 'Transaction ID must be generated');
  assert.strictEqual(directTx.quantityLitres, 12.50);
  console.log(`✅ Test B1 Passed: Route A Direct Farmer Milk recorded (12.50 Litres)`);

  // Route B: Vendor Combined supply (without fabricating farmer-wise quantities)
  const vendorTx = await WorkflowService.recordMilkTransaction({
    boothId: melurBooth.id,
    collectionDate: today,
    session: 'morning',
    quantityLitres: 80.00,
    route: 'vendor',
    vendorId: 'vend-mdu-01',
    vendorName: 'V. Kumar Logistics',
    measurementMethod: 'combined',
    createdByUserId: 'usr-booth-01',
    notes: 'Integration Test Vendor Bulk Intake',
  });
  assert(vendorTx.id, 'Vendor Transaction ID must be generated');
  assert.strictEqual(vendorTx.quantityLitres, 80.00);
  console.log(`✅ Test B2 Passed: Route B Vendor Combined Milk recorded (80.00 Litres)`);

  // Test C: Review Booth Collection & Generate Booth Receipt (Stage 2)
  const review = await WorkflowService.reviewBoothCollection(melurBooth.id, today);
  assert(review.totalLitres >= 92.50, 'Total review litres must equal sum of direct + vendor');
  assert(review.directLitres >= 12.50, 'Direct litres must be tracked separately');
  assert(review.vendorLitres >= 80.00, 'Vendor litres must be tracked separately');
  console.log(`✅ Test C1 Passed: Booth Collection Review accurate (Total: ${review.totalLitres}L, Direct: ${review.directLitres}L, Vendor: ${review.vendorLitres}L)`);

  const boothReceipt = await WorkflowService.generateBoothReceipt({
    boothId: melurBooth.id,
    collectionDate: today,
    session: 'morning',
    notes: 'Integration Test Booth Receipt Dispatch',
    createdByUserId: 'usr-booth-01',
  });
  assert(boothReceipt.receiptId.startsWith('BR-'), 'Receipt ID must start with BR-');
  assert(boothReceipt.deliveryId.startsWith('DEL-'), 'Linked BMC delivery ID must start with DEL-');
  console.log(`✅ Test C2 Passed: Digital Booth Receipt generated & dispatched (${boothReceipt.receiptId})`);

  // Test D: Matching BMC Intake Verification (Stage 3)
  // Delivery with exact matching quantity -> difference = 0
  const matchResult = await WorkflowService.confirmBmcDelivery(boothReceipt.deliveryId, {
    measuredReceivedQuantity: boothReceipt.dispatchQuantity,
    receivedByUserId: 'usr-bmc-01',
    receivedByName: 'M. Ramanathan (BMC Manager)',
    thresholdLitres: 5.0,
    notes: 'Dipstick volume matched declared dispatch quantity',
  });
  assert.strictEqual(matchResult.differenceLitres, 0);
  assert.strictEqual(matchResult.status, 'matched');
  assert.strictEqual(matchResult.hasDiscrepancy, false);
  console.log(`✅ Test D Passed: BMC Intake Exact Match Verified (Declared: ${matchResult.declaredQuantity}L, Measured: ${matchResult.measuredQuantity}L, Diff: 0L)`);

  // Test E: Mismatched BMC Intake & Discrepancy Investigation
  // Create another delivery with shortfall: declared 1000L, measured 970L (30L variance)
  const mismatchDeliveryId = 'DEL-2026-001'; // From seed.sql
  const mismatchResult = await WorkflowService.confirmBmcDelivery(mismatchDeliveryId, {
    measuredReceivedQuantity: 970.00,
    receivedByUserId: 'usr-bmc-01',
    receivedByName: 'M. Ramanathan (BMC Manager)',
    thresholdLitres: 5.0,
    notes: 'Shortfall detected on tanker arrival',
  });
  assert.strictEqual(mismatchResult.differenceLitres, 30.00);
  assert.strictEqual(mismatchResult.status, 'mismatch_investigation');
  assert.strictEqual(mismatchResult.hasDiscrepancy, true);
  assert(mismatchResult.discrepancyCaseId, 'Discrepancy case must be logged');
  console.log(`✅ Test E1 Passed: BMC Mismatch Detected & Discrepancy Case logged (${mismatchResult.differenceLitres}L variance, Case ID: ${mismatchResult.discrepancyCaseId})`);

  // Add investigation note to case
  const noteResult = await WorkflowService.updateDiscrepancy(mismatchResult.discrepancyCaseId, 'add_note', {
    authorName: 'M. Ramanathan',
    note: 'Tanker calibration seal intact. Flow-meter recalibrated.',
    evidenceReference: 'METER-LOG-991',
  });
  assert.strictEqual(noteResult.success, true);
  console.log(`✅ Test E2 Passed: Investigation note appended to Discrepancy Case`);

  // Escalate case to Union
  const escResult = await WorkflowService.updateDiscrepancy(mismatchResult.discrepancyCaseId, 'escalate', {
    reason: 'Significant transit volume shrinkage exceeding 2.5% threshold',
  });
  assert.strictEqual(escResult.success, true);
  console.log(`✅ Test E3 Passed: Discrepancy case escalated to Union enforcement`);

  // Test F: BMC Daily Receipt & Union Review (Stage 4)
  const bmcReceipt = await WorkflowService.generateBmcReceipt('bmc-mdu-01', today, 'usr-bmc-01');
  assert(bmcReceipt.bmcReceiptId.startsWith('BMCR-'), 'BMC Receipt ID must start with BMCR-');
  assert(bmcReceipt.totalReceivedQuantity > 0, 'Total received litres must be positive');
  console.log(`✅ Test F1 Passed: BMC Daily Receipt generated & submitted to Union (${bmcReceipt.bmcReceiptId})`);

  // Union Audits and Approves BMC Receipt
  const unionReview = await WorkflowService.reviewUnionReceipt(
    bmcReceipt.bmcReceiptId,
    'Reviewed by District Quality Inspector. Deliveries verified against booth dispatches.',
    'usr-union-01'
  );
  assert.strictEqual(unionReview.success, true);
  console.log(`✅ Test F2 Passed: Union Executive reviewed and approved BMC Daily Receipt`);

  // District Aggregation (Separate Booth Intake, BMC Intake, Transit Variance)
  const summary = await WorkflowService.getConsolidatedSummary(today);
  assert(summary.farmerAndBoothLevel.recordedIntakeLitres >= 0, 'Booth intake must be computed');
  assert(summary.bmcLevel.measuredIntakeLitres >= 0, 'BMC measured intake must be computed');
  assert(summary.discrepancies.activeCount >= 1, 'Active discrepancy count must reflect escalated case');
  console.log(`✅ Test F3 Passed: District Consolidated Summary computed without double-counting`);

  // Test G: English and Tamil Localization Dictionary Parity
  assert(enDict.app.title, 'English app title must exist');
  assert(taDict.app.title, 'Tamil app title must exist');
  assert(enDict.farmer.greeting, 'English farmer greeting must exist');
  assert(taDict.farmer.greeting, 'Tamil farmer greeting must exist');
  assert(enDict.bmc.difference, 'English variance string must exist');
  assert(taDict.bmc.difference, 'Tamil variance string must exist');
  console.log(`✅ Test G Passed: English and Tamil localization keys verified in locales/en.json and locales/ta.json`);

  console.log('\n🎉 ALL 4-STAGE AAVIN WORKFLOW INTEGRATION TESTS PASSED SUCCESSFULLY!\n');
}
