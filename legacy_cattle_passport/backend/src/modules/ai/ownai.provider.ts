import { AIProvider, AIResponse } from './ai.interface.js';
import { env } from '../../config/env.js';

export class OwnAIProvider implements AIProvider {
  private baseUrl: string;
  private apiKey: string;
  private model: string;
  private timeoutMs: number;

  constructor(baseUrl?: string, apiKey?: string, model?: string, timeoutMs?: number) {
    this.baseUrl = baseUrl || env.OWN_AI_BASE_URL;
    this.apiKey = apiKey || env.OWN_AI_API_KEY;
    this.model = model || env.OWN_AI_MODEL;
    this.timeoutMs = timeoutMs || env.AI_TIMEOUT_MS;
  }

  getProviderName(): 'own_api' {
    return 'own_api';
  }

  async healthCheck(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        headers: this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {},
        signal: controller.signal,
      }).catch(() => null);
      clearTimeout(id);
      return res ? res.ok : false;
    } catch {
      return false;
    }
  }

  async generateText(
    prompt: string,
    systemInstruction = 'You are the Aavin Madurai Dairy Private Intelligence Model. Provide concise, helpful Tamil Nadu dairy domain insights.',
    options?: { timeoutMs?: number }
  ): Promise<AIResponse> {
    const startTime = Date.now();
    const effectiveTimeout = options?.timeoutMs || this.timeoutMs;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), effectiveTimeout);

    try {
      // 1. Try Ollama native /api/generate first
      try {
        const ollamaRes = await fetch(`${this.baseUrl}/api/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
          },
          body: JSON.stringify({
            model: this.model,
            prompt: `${systemInstruction}\n\nUser Request: ${prompt}`,
            stream: false,
          }),
          signal: controller.signal,
        });

        if (ollamaRes.ok) {
          clearTimeout(timeout);
          const json = (await ollamaRes.json()) as any;
          const text = (json.response || '').trim();
          if (text) {
            return {
              text,
              provider: 'own_api',
              model: this.model,
              isFallback: false,
              latencyMs: Date.now() - startTime,
              tokensUsed: json.eval_count || 0,
            };
          }
        }
      } catch (ollamaErr: any) {
        if (ollamaErr.name === 'AbortError') throw ollamaErr;
        // Fallback to /v1/chat/completions
      }

      // 2. Try standard /v1/chat/completions (OpenAI compatible)
      const chatUrl = this.baseUrl.endsWith('/v1')
        ? `${this.baseUrl}/chat/completions`
        : `${this.baseUrl}/v1/chat/completions`;

      const response = await fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt },
          ],
          temperature: 0.2,
          stream: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Own AI API error (${response.status}): ${errText}`);
      }

      const json = (await response.json()) as any;
      const text = (json.choices?.[0]?.message?.content || json.text || '').trim();

      return {
        text: text || 'No response generated from AI model.',
        provider: 'own_api',
        model: this.model,
        isFallback: false,
        latencyMs: Date.now() - startTime,
        tokensUsed: json.usage?.total_tokens || 0,
      };
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error(`AI request timed out after ${effectiveTimeout}ms`);
      }
      throw err;
    }
  }
}
