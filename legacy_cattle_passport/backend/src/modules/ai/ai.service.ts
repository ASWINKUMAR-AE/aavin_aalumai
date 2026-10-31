import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database.js';
import { env } from '../../config/env.js';
import { AIProvider, AIResponse } from './ai.interface.js';
import { OpenRouterProvider } from './openrouter.provider.js';
import { OwnAIProvider } from './ownai.provider.js';
import { RowDataPacket } from 'mysql2';

export class AIService {
  private static promptCache = new Map<string, { response: AIResponse; expiresAt: number }>();
  private static readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache for summaries

  private static getCacheKey(promptType: string, prompt: string): string {
    return `${promptType}:${prompt.trim().slice(0, 200)}`;
  }

  private static getProviders(settings?: any): {
    primary: AIProvider | null;
    fallback: AIProvider | null;
    activeProviderName: string;
    fallbackEnabled: boolean;
    fallbackProviderName: string;
  } {
    const active = settings?.active_provider || env.AI_PROVIDER;
    const fallbackEnabled = settings ? Boolean(settings.fallback_enabled) : env.AI_FALLBACK_ENABLED;
    const fallbackProvider = settings?.fallback_provider || env.AI_FALLBACK_PROVIDER;

    if (active === 'disabled') {
      return {
        primary: null,
        fallback: null,
        activeProviderName: 'disabled',
        fallbackEnabled: false,
        fallbackProviderName: 'none',
      };
    }

    const openRouter = new OpenRouterProvider(
      undefined,
      undefined,
      settings?.openrouter_model || env.OPENROUTER_MODEL,
      settings?.timeout_ms || env.AI_TIMEOUT_MS
    );

    const ownAI = new OwnAIProvider(
      undefined,
      undefined,
      settings?.own_api_model || env.OWN_AI_MODEL,
      settings?.timeout_ms || env.AI_TIMEOUT_MS
    );

    const primary = active === 'openrouter' ? openRouter : ownAI;
    const fallback = fallbackEnabled && fallbackProvider !== active
      ? (fallbackProvider === 'openrouter' ? openRouter : ownAI)
      : null;

    return {
      primary,
      fallback,
      activeProviderName: active,
      fallbackEnabled,
      fallbackProviderName: fallbackProvider,
    };
  }

  static async getSettings() {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT * FROM ai_provider_settings LIMIT 1`
    );
    if (rows.length > 0) return rows[0];

    return {
      id: 'ai-default',
      active_provider: env.AI_PROVIDER,
      is_enabled: env.AI_ENABLED ? 1 : 0,
      fallback_enabled: env.AI_FALLBACK_ENABLED ? 1 : 0,
      fallback_provider: env.AI_FALLBACK_PROVIDER,
      openrouter_model: env.OPENROUTER_MODEL,
      own_api_model: env.OWN_AI_MODEL,
      timeout_ms: env.AI_TIMEOUT_MS,
      max_retries: env.AI_MAX_RETRIES,
      daily_token_budget: 1000000,
    };
  }

  static async updateSettings(adminUserId: string, data: any) {
    // Validate provider choices
    if (data.activeProvider && !['openrouter', 'own_api', 'disabled'].includes(data.activeProvider)) {
      throw new Error("Invalid active_provider. Must be 'openrouter' | 'own_api' | 'disabled'");
    }
    if (data.fallbackProvider && !['openrouter', 'own_api'].includes(data.fallbackProvider)) {
      throw new Error("Invalid fallback_provider. Must be 'openrouter' | 'own_api'");
    }

    await db.query(
      `UPDATE ai_provider_settings
       SET active_provider = COALESCE(?, active_provider),
           is_enabled = COALESCE(?, is_enabled),
           fallback_enabled = COALESCE(?, fallback_enabled),
           fallback_provider = COALESCE(?, fallback_provider),
           openrouter_model = COALESCE(?, openrouter_model),
           own_api_model = COALESCE(?, own_api_model),
           timeout_ms = COALESCE(?, timeout_ms),
           updated_by_user_id = ?,
           updated_at = UTC_TIMESTAMP()`,
      [
        data.activeProvider,
        data.isEnabled !== undefined ? (data.isEnabled ? 1 : 0) : null,
        data.fallbackEnabled !== undefined ? (data.fallbackEnabled ? 1 : 0) : null,
        data.fallbackProvider,
        data.openrouterModel,
        data.ownApiModel,
        data.timeoutMs,
        adminUserId,
      ]
    );

    return this.getSettings();
  }

  static async executePrompt(
    userId: string,
    promptType: string,
    prompt: string,
    systemInstruction?: string
  ): Promise<AIResponse> {
    const settings = await this.getSettings();

    if (!settings.is_enabled || settings.active_provider === 'disabled') {
      // Deterministic rule-based fallback response if AI is disabled
      return {
        text: 'AI services are currently disabled by Aavin administration. Please refer to deterministic digital cattle records.',
        provider: 'own_api',
        model: 'deterministic-rules',
        isFallback: false,
        latencyMs: 1,
      };
    }

    const cacheKey = this.getCacheKey(promptType, prompt);
    if (promptType !== 'chat' && promptType !== 'test_connectivity') {
      const cached = this.promptCache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return {
          ...cached.response,
          latencyMs: 0,
        };
      }
    }

    const { primary, fallback, fallbackEnabled } = this.getProviders(settings);
    if (!primary) {
      throw new Error('AI primary provider is not configured.');
    }

    const start = Date.now();
    try {
      // Attempt Primary Provider
      const result = await primary.generateText(prompt, systemInstruction);

      // Cache summary results
      if (promptType !== 'chat' && promptType !== 'test_connectivity') {
        this.promptCache.set(cacheKey, {
          response: result,
          expiresAt: Date.now() + this.CACHE_TTL_MS,
        });
      }

      // Log success
      await this.logUsage({
        userId,
        promptType,
        providerUsed: result.provider,
        modelName: result.model,
        isFallback: false,
        tokensIn: 0,
        tokensOut: result.tokensUsed || 0,
        latencyMs: result.latencyMs,
        success: true,
      });

      return result;
    } catch (primaryErr: any) {
      console.warn(`[AI Service] Primary provider ${primary.getProviderName()} failed:`, primaryErr.message);

      // Check if fallback is enabled and available
      if (fallbackEnabled && fallback) {
        console.log(`[AI Service] Invoking FALLBACK provider: ${fallback.getProviderName()} (Reason: ${primaryErr.message})`);

        try {
          const fallbackResult = await fallback.generateText(prompt, systemInstruction);
          fallbackResult.isFallback = true;
          fallbackResult.fallbackReason = primaryErr.message;

          // Mandatory non-silent logging for fallback
          await this.logUsage({
            userId,
            promptType,
            providerUsed: fallbackResult.provider,
            modelName: fallbackResult.model,
            isFallback: true,
            fallbackReason: primaryErr.message,
            tokensIn: 0,
            tokensOut: fallbackResult.tokensUsed || 0,
            latencyMs: fallbackResult.latencyMs,
            success: true,
          });

          // Raise admin notification
          await db.query(
            `INSERT INTO notifications (id, user_id, title, body, category)
             SELECT ?, id, '⚠️ AI Fallback Invoked', ?, 'ai_fallback'
             FROM users WHERE id IN (SELECT user_id FROM user_roles WHERE role_id = 'role-admin') LIMIT 1`,
            [
              uuidv4(),
              `AI query automatically routed to fallback provider '${fallback.getProviderName()}'. Primary failed: ${primaryErr.message}`,
            ]
          );

          return fallbackResult;
        } catch (fallbackErr: any) {
          await this.logUsage({
            userId,
            promptType,
            providerUsed: fallback.getProviderName(),
            modelName: settings.own_api_model,
            isFallback: true,
            fallbackReason: `Primary: ${primaryErr.message}; Fallback: ${fallbackErr.message}`,
            tokensIn: 0,
            tokensOut: 0,
            latencyMs: Date.now() - start,
            success: false,
            errorMessage: fallbackErr.message,
          });

          // Return graceful deterministic summary if both external LLMs are unreachable
          return this.generateDeterministicRuleExplanation(prompt, promptType);
        }
      }

      // If fallback is not enabled, log failure and return controlled response
      await this.logUsage({
        userId,
        promptType,
        providerUsed: primary.getProviderName(),
        modelName: settings.openrouter_model,
        isFallback: false,
        tokensIn: 0,
        tokensOut: 0,
        latencyMs: Date.now() - start,
        success: false,
        errorMessage: primaryErr.message,
      });

      return this.generateDeterministicRuleExplanation(prompt, promptType);
    }
  }

  /**
   * Deterministic explanation generator if AI providers are unreachable or offline
   */
  private static generateDeterministicRuleExplanation(prompt: string, promptType: string): AIResponse {
    let text = '';
    if (prompt.includes('[VERIFIED DATABASE RECORDS FROM AAVIN MYSQL DB]')) {
      text = '🐄 **Aavin Dairy Intelligence Advisory (Verified Database Records):**\n\n' +
        '• **Cattle & Milk Status:** Your livestock health and milk collections are verified in your Aavin database.\n' +
        '• **Daily Recommendations:** Ensure consistent milking times, 20kg/day Co-4 hybrid green fodder, and 50g chelated mineral mixture per milking cow.\n' +
        '• **Quality & Safety:** Maintain clean udder hygiene before milking to ensure optimal Fat >= 3.5% and SNF >= 8.5% for maximum Fortnight payment realization.\n\n' +
        '*(தகவல்: உங்கள் பசுக்களின் பால் உற்பத்தி மற்றும் தரம் ஆவின் தரவுத்தளத்தில் பாதுகாப்பாக பதிவு செய்யப்பட்டுள்ளது).*';
    } else if (promptType === 'cow_summary') {
      text = '🐄 **Cattle Passport Summary:** Normal lactation parameters recorded. Maintain 20kg/day Co-4 green fodder and fresh water access.';
    } else if (promptType === 'production_insights') {
      text = '📊 **7-Day Milk Yield Insight:** Milking curve reflects regular production. Balance feed concentrates to maximize morning vs evening yield stability.';
    } else if (promptType === 'quality_summary') {
      text = '🥛 **Milk Quality Benchmark:** Standard Aavin Cow Milk requirements are Fat >= 3.50% and SNF >= 8.50%. Clean milk samples receive full procurement incentive.';
    } else {
      text = '🌾 **Aavin Farm Advisory:** To improve milk Fat & SNF naturally, supply balanced dietary crude fiber (paddy straw) alongside bypass fat concentrates and fresh mineral mix.';
    }

    return {
      text,
      provider: 'own_api',
      model: 'aavin-rules-engine',
      isFallback: false,
      latencyMs: 5,
    };
  }

  private static async logUsage(params: {
    userId: string;
    promptType: string;
    providerUsed: 'openrouter' | 'own_api';
    modelName: string;
    isFallback: boolean;
    fallbackReason?: string;
    tokensIn: number;
    tokensOut: number;
    latencyMs: number;
    success: boolean;
    errorMessage?: string;
  }) {
    try {
      await db.query(
        `INSERT INTO ai_usage_logs (
          id, user_id, prompt_type, provider_used, model_name, is_fallback_invoked,
          fallback_trigger_reason, tokens_in, tokens_out, latency_ms, success, error_message, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP())`,
        [
          uuidv4(),
          params.userId,
          params.promptType,
          params.providerUsed,
          params.modelName,
          params.isFallback ? 1 : 0,
          params.fallbackReason || null,
          params.tokensIn,
          params.tokensOut,
          params.latencyMs,
          params.success ? 1 : 0,
          params.errorMessage || null,
        ]
      );
    } catch (e) {
      console.error('Failed to log AI usage:', e);
    }
  }
}
