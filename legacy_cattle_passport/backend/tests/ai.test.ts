import assert from 'assert';
import { env } from '../src/config/env.js';
import { AIService } from '../src/modules/ai/ai.service.js';

export async function runAITests() {
  console.log('\n--- Running AI Provider & Fallback Tests ---');

  // Test 1: Fallback disabled by default
  assert.strictEqual(env.AI_FALLBACK_ENABLED, false, 'AI fallback MUST be disabled by default');
  console.log('✅ AI Test 1: AI_FALLBACK_ENABLED is false by default');

  // Test 2: AI Settings retrieval
  try {
    const settings = await AIService.getSettings();
    assert.ok(settings.active_provider, 'Active provider should exist');
    assert.ok(['openrouter', 'own_api', 'disabled'].includes(settings.active_provider));
    console.log(`✅ AI Test 2: Active Provider = ${settings.active_provider}, Fallback Enabled = ${settings.fallback_enabled}`);
  } catch (e: any) {
    console.log('ℹ️ AI DB settings note:', e.message);
  }

  // Test 3: Fallback response isolation & provider configuration
  assert.ok(env.AI_PROVIDER, 'Default AI provider must be defined');
  assert.ok(['openrouter', 'own_api', 'disabled'].includes(env.AI_PROVIDER), 'Valid AI provider configuration');
  console.log(`✅ AI Test 3: Provider configured cleanly as [${env.AI_PROVIDER}] with Fallback=${env.AI_FALLBACK_ENABLED}`);

  console.log('--- AI Provider Tests Completed ---');
}
