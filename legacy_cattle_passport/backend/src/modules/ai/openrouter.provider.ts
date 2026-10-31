import { AIProvider, AIResponse } from './ai.interface.js';
import { env } from '../../config/env.js';

export class OpenRouterProvider implements AIProvider {
  private apiKey: string;
  private baseUrl: string;
  private model: string;
  private timeoutMs: number;

  constructor(apiKey?: string, baseUrl?: string, model?: string, timeoutMs?: number) {
    this.apiKey = apiKey || env.OPENROUTER_API_KEY;
    this.baseUrl = baseUrl || env.OPENROUTER_BASE_URL;
    this.model = model || env.OPENROUTER_MODEL;
    this.timeoutMs = timeoutMs || env.AI_TIMEOUT_MS;
  }

  getProviderName(): 'openrouter' {
    return 'openrouter';
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        signal: controller.signal,
      });
      clearTimeout(id);
      return res.ok;
    } catch {
      return false;
    }
  }

  async generateText(
    prompt: string,
    systemInstruction = 'You are the Aavin Madurai Dairy Assistant.',
    options?: { timeoutMs?: number }
  ): Promise<AIResponse> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key is not configured on the backend');
    }

    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options?.timeoutMs || this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://aavin.tn.gov.in',
          'X-Title': 'Aavin Milk Safety Twin',
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`OpenRouter API error (${response.status}): ${errorBody}`);
      }

      const json = (await response.json()) as any;
      const text = json.choices?.[0]?.message?.content || 'No response generated.';
      const tokensUsed = json.usage?.total_tokens || 0;

      return {
        text,
        provider: 'openrouter',
        model: this.model,
        isFallback: false,
        latencyMs: Date.now() - startTime,
        tokensUsed,
      };
    } catch (err: any) {
      clearTimeout(timeout);
      throw err;
    }
  }
}
