// OpenRouterProvider — เรียก AI ผ่าน OpenRouter (รองรับหลายโมเดล: Gemini/Claude/GPT ฯลฯ)
import type { AIProvider } from './AIProvider';
import { AIRequest, AIResponse } from '../types';
import { secretManager } from '../core/secret';
import { config } from '../core/config';
import { withRetry } from '../core/retry';
import { AppError } from '../core/errors';

const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'google/gemini-2.5-flash';

export class OpenRouterProvider implements AIProvider {
  generate(req: AIRequest): AIResponse {
    const model = req.model || config.get('openrouter_model', DEFAULT_MODEL);
    const response = withRetry(() => this.call(model, req));
    return response;
  }

  private call(model: string, req: AIRequest): AIResponse {
    const apiKey = secretManager.require('OPENROUTER_API_KEY');
    const payload = {
      model,
      messages: [{ role: 'user', content: `${req.prompt}\n\n${req.content}` }],
    };

    const res = UrlFetchApp.fetch(ENDPOINT, {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: `Bearer ${apiKey}` },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });

    const code = res.getResponseCode();
    if (code === 429) throw new AppError('QUOTA_EXCEEDED', 'OpenRouter rate limit');
    if (code >= 500) throw new AppError('AI_TIMEOUT', `OpenRouter ${code}`);
    if (code >= 400) throw new AppError('INTERNAL', `OpenRouter ${code}: ${res.getContentText().slice(0, 200)}`);

    const body = JSON.parse(res.getContentText()) as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
      model?: string;
    };

    const text = body.choices?.[0]?.message?.content ?? '';
    return {
      result: text,
      model: body.model || model,
      tokens: body.usage?.total_tokens,
      finishReason: 'stop',
      cached: false,
    };
  }
}
