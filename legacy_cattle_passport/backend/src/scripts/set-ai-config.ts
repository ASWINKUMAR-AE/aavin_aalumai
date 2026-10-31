import { db } from '../config/database.js';
import { AIService } from '../modules/ai/ai.service.js';

async function main() {
  await db.query(`
    UPDATE ai_provider_settings
    SET active_provider = 'own_api',
        own_api_model = 'gemma3:12b',
        timeout_ms = 90000,
        is_enabled = 1,
        fallback_enabled = 0
  `);
  console.log('✅ Updated ai_provider_settings in database.');

  const settings = await AIService.getSettings();
  console.log('Active AI Configuration:', {
    active_provider: settings.active_provider,
    own_api_model: settings.own_api_model,
    timeout_ms: settings.timeout_ms,
    is_enabled: settings.is_enabled,
  });

  console.log('\n--- Testing AI Prompt Execution with Gemma 3:12B ---');
  const start = Date.now();
  const testRes = await AIService.executePrompt(
    'usr-admin-01',
    'cow_summary',
    'Cow #TN-MDU-COW-1001: Breed Jersey Cross, peak lactation, 14.5L/day. Give a 1-sentence health & fodder note.'
  );
  console.log(`✅ Response (${Date.now() - start}ms):`, testRes.text);

  console.log('\n--- Testing In-Memory Cache (Immediate 0ms return) ---');
  const cacheStart = Date.now();
  const cacheRes = await AIService.executePrompt(
    'usr-admin-01',
    'cow_summary',
    'Cow #TN-MDU-COW-1001: Breed Jersey Cross, peak lactation, 14.5L/day. Give a 1-sentence health & fodder note.'
  );
  console.log(`✅ Cached Response (${Date.now() - cacheStart}ms):`, cacheRes.text);

  process.exit(0);
}

main().catch(console.error);
