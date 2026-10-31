export interface AIResponse {
  text: string;
  provider: 'openrouter' | 'own_api';
  model: string;
  isFallback: boolean;
  fallbackReason?: string;
  latencyMs: number;
  tokensUsed?: number;
}

export interface AIProvider {
  getProviderName(): 'openrouter' | 'own_api';
  healthCheck(): Promise<boolean>;
  generateText(
    prompt: string,
    systemInstruction?: string,
    options?: { timeoutMs?: number }
  ): Promise<AIResponse>;
}
