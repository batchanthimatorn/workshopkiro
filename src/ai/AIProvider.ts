// AIProvider abstraction + factory (Ref: design/components.md C8, D1-3 Add-on, D3-5/6)
import { AIRequest, AIResponse } from '../types';
import { config } from '../core/config';
import { MockProvider } from './MockProvider';
import { GeminiProvider } from './GeminiProvider';
import { OpenRouterProvider } from './OpenRouterProvider';

export interface AIProvider {
  generate(req: AIRequest): AIResponse;
}

/**
 * เลือก provider ตาม config:
 * - mock_mode = true  -> MockProvider
 * - ai_provider = openrouter -> OpenRouterProvider (ใช้ OPENROUTER_API_KEY)
 * - อื่น ๆ / default -> GeminiProvider (ใช้ GEMINI_API_KEY)
 */
export function getAIProvider(): AIProvider {
  if (config.isMockMode()) return new MockProvider();
  const provider = config.get('ai_provider', 'gemini').toLowerCase();
  if (provider === 'openrouter') return new OpenRouterProvider();
  return new GeminiProvider();
}
