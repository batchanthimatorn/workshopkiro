// AIProvider abstraction + factory (Ref: design/components.md C8, D1-3 Add-on, D3-5/6)
import { AIRequest, AIResponse } from '../types';
import { config } from '../core/config';
import { MockProvider } from './MockProvider';
import { GeminiProvider } from './GeminiProvider';

export interface AIProvider {
  generate(req: AIRequest): AIResponse;
}

/**
 * เลือก provider ตาม config:
 * - mock_mode = true  -> MockProvider (mock-first, ไม่มี network call) [D1-5]
 * - mock_mode = false -> GeminiProvider (เรียก Gemini จริง, ต้องมี GEMINI_API_KEY)
 * (VertexAIProvider = optional/future ตาม Add-on)
 */
export function getAIProvider(): AIProvider {
  return config.isMockMode() ? new MockProvider() : new GeminiProvider();
}
