import { runSafetyTests } from './safety.test.js';
import { runPaymentTests } from './payments.test.js';
import { runAITests } from './ai.test.js';
import { runWorkflowIntegrationTests } from './workflow-integration.test.js';

async function runAll() {
  console.log('====================================================');
  console.log('  AAVIN SMART CATTLE PASSPORT - BACKEND TEST RUNNER  ');
  console.log('====================================================');

  await runSafetyTests();
  await runPaymentTests();
  await runAITests();
  await runWorkflowIntegrationTests();

  console.log('\n✅ All unit, invariant, and 4-stage workflow test suites executed successfully.\n');
  process.exit(0);
}

runAll().catch((err) => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
