/**
 * Test for IndicTrans2 Pure TypeScript / Node.js Engine
 * Run with: npx tsx backend/tests/indictrans2.test.ts
 */

import { IndicTrans2BackendService, normalizeIndicTransLang } from '../src/modules/ai/indictrans2.service.js';

async function runTests() {
  console.log('========================================================');
  console.log('AI4BHARAT INDICTRANS2 BACKEND TEST SUITE (PURE JS/TS)');
  console.log('========================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${msg}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${msg}`);
    }
  }

  // 1. Language tag tests
  assert(normalizeIndicTransLang('en') === 'eng_Latn', 'Normalize "en" to "eng_Latn"');
  assert(normalizeIndicTransLang('ta') === 'tam_Taml', 'Normalize "ta" to "tam_Taml"');
  assert(normalizeIndicTransLang('tam_Taml') === 'tam_Taml', 'Preserve "tam_Taml"');

  // 2. English -> Tamil translations
  const r1 = await IndicTrans2BackendService.translate('Milk Safety Twin Platform', 'eng_Latn', 'tam_Taml');
  console.log(`Input: "Milk Safety Twin Platform" -> Output: "${r1.translatedText}" (${r1.engine})`);
  assert(r1.translatedText === 'பால் பாதுகாப்பு இரட்டை தளம்', 'Translates Milk Safety Twin Platform to Tamil');

  const r2 = await IndicTrans2BackendService.translate('Bulk Milk Cooling Centre', 'eng_Latn', 'tam_Taml');
  console.log(`Input: "Bulk Milk Cooling Centre" -> Output: "${r2.translatedText}" (${r2.engine})`);
  assert(r2.translatedText === 'மொத்த பால் குளிரூட்டும் மையம் (BMC)', 'Translates BMC to Tamil');

  const r3 = await IndicTrans2BackendService.translate('25.5 Litres', 'eng_Latn', 'tam_Taml');
  console.log(`Input: "25.5 Litres" -> Output: "${r3.translatedText}" (${r3.engine})`);
  assert(r3.translatedText === '25.5 லிட்டர்', 'Translates 25.5 Litres to 25.5 லிட்டர்');

  // 3. Cache verification
  const rCached = await IndicTrans2BackendService.translate('25.5 Litres', 'eng_Latn', 'tam_Taml');
  assert(rCached.cached === true, 'Subsequent translation served from cache');

  // 4. Tamil -> English reverse translation
  const rRev = await IndicTrans2BackendService.translate('பால் பாதுகாப்பு இரட்டை தளம்', 'tam_Taml', 'eng_Latn');
  console.log(`Input: "பால் பாதுகாப்பு இரட்டை தளம்" -> Output: "${rRev.translatedText}" (${rRev.engine})`);
  assert(rRev.translatedText === 'Milk Safety Twin', 'Reverse translates Tamil title to English');

  console.log(`\nResult: ${passed}/${total} backend tests passed successfully!`);
}

runTests().catch(console.error);
