// MockProvider — ผลจำลอง ไม่มี network call (mock-first, D1-5, guardrail: ไม่เรียก AI จริง)
import type { AIProvider } from './AIProvider';
import { AIRequest, AIResponse } from '../types';

export class MockProvider implements AIProvider {
  generate(req: AIRequest): AIResponse {
    const en = req.lang === 'en';
    const preview = req.content.replace(/\s+/g, ' ').trim().slice(0, 80);
    let result: string;

    if (req.task === 'draft') {
      const tone = req.tone ?? 'friendly';
      result = en
        ? `[MOCK DRAFT · tone=${tone}] Thank you for your message. This is a mock reply generated without calling any AI API. Please review and edit before sending.`
        : `[ตัวอย่าง MOCK · โทน=${tone}] ขอบคุณสำหรับข้อความครับ นี่คือข้อความร่างจำลอง (ไม่ได้เรียก AI จริง) กรุณาตรวจและแก้ไขก่อนส่ง`;
    } else {
      result = en
        ? `[MOCK SUMMARY] Key points from: "${preview}${req.content.length > 80 ? '…' : ''}" (mock, no AI call).`
        : `[สรุป MOCK] ประเด็นสำคัญจาก: "${preview}${req.content.length > 80 ? '…' : ''}" (จำลอง ไม่ได้เรียก AI จริง)`;
    }

    return {
      result,
      model: 'mock',
      tokens: Math.ceil(req.content.length / 4),
      finishReason: 'stop',
      cached: false,
    };
  }
}
