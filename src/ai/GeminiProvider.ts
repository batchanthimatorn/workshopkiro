// GeminiProvider — เรียก Gemini API จริงผ่าน UrlFetchApp + backoff + cache
// (Ref: design/integration.md I1, operations.md, NFR-03; ใช้เมื่อ mock_mode=false เท่านั้น)
import type { AIProvider } from './AIProvider';
import { AIRequest, AIResponse } from '../types';
import { secretManager } from '../core/secret';
import { config } from '../core/config';
import { withRetry } from '../core/retry';
import { AppError } from '../core/errors';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-2.5-flash'; // ยืนยันแล้ว Phase 8 (2026-08-25); ตั้งค่าได้ผ่าน config 'gemini_model'
const CACHE_TTL_SECONDS = 3600;

interface GeminiApiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  usageMetadata?: { totalTokenCount?: number };
}

export class GeminiProvider implements AIProvider {
  generate(req: AIRequest): AIResponse {
    const model = req.model || config.get('gemini_model', DEFAULT_MODEL);
    const cache = CacheService.getScriptCache();
    const key = this.cacheKey(req, model);

    const cached = cache ? cache.get(key) : null;
    if (cached) return { ...(JSON.parse(cached) as AIResponse), cached: true };

    const response = withRetry(() => this.call(model, req));
    if (cache) cache.put(key, JSON.stringify(response), CACHE_TTL_SECONDS);
    return response;
  }

  private call(model: string, req: AIRequest): AIResponse {
    const apiKey = secretManager.require('GEMINI_API_KEY');
    const url = `${ENDPOINT}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const payload = {
      contents: [{ role: 'user', parts: [{ text: `${req.prompt}\n\n${req.content}` }] }],
    };

    const res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });

    const code = res.getResponseCode();
    if (code === 429) throw new AppError('QUOTA_EXCEEDED', 'Gemini rate limit');
    if (code >= 500) throw new AppError('AI_TIMEOUT', `Gemini ${code}`);
    if (code >= 400) throw new AppError('INTERNAL', `Gemini ${code}`);

    const body = JSON.parse(res.getContentText()) as GeminiApiResponse;
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    return {
      result: text,
      model,
      tokens: body.usageMetadata?.totalTokenCount,
      finishReason: 'stop',
      cached: false,
    };
  }

  private cacheKey(req: AIRequest, model: string): string {
    const raw = `${model}|${req.task}|${req.lang}|${req.tone ?? ''}|${req.prompt}|${req.content}`;
    const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, raw);
    return 'ai_' + digest.map((b) => ((b < 0 ? b + 256 : b) & 0xff).toString(16).padStart(2, '0')).join('');
  }
}
