// HealthService — ตรวจ config/secret/sheets พร้อมใช้ (Ref: C16, US-015, D3-14)
import { secretManager } from '../core/secret';
import { config } from '../core/config';

export interface HealthCheck {
  status: 'ok' | 'fail';
  detail?: string;
}

export interface HealthReport {
  status: 'ready' | 'not_ready';
  version: string;
  provider: string;
  checks: Record<string, HealthCheck>;
  failures: string[];
}

const VERSION = '1.0.0';

export class HealthService {
  getHealthStatus(): HealthReport {
    const checks: Record<string, HealthCheck> = {};
    const failures: string[] = [];
    const mock = config.isMockMode();

    // API key (จำเป็นเมื่อไม่ใช่ mock)
    if (mock) {
      checks.apiKey = { status: 'ok', detail: 'mock mode (ไม่ต้องใช้ key)' };
    } else if (secretManager.has('GEMINI_API_KEY')) {
      checks.apiKey = { status: 'ok' };
    } else {
      checks.apiKey = { status: 'fail', detail: 'ไม่พบ GEMINI_API_KEY' };
      failures.push('GEMINI_API_KEY missing');
    }

    // Spreadsheet
    if (secretManager.has('SPREADSHEET_ID')) {
      try {
        SpreadsheetApp.openById(secretManager.require('SPREADSHEET_ID'));
        checks.sheets = { status: 'ok' };
      } catch {
        checks.sheets = { status: 'fail', detail: 'เปิด spreadsheet ไม่ได้' };
        failures.push('cannot open spreadsheet');
      }
    } else {
      checks.sheets = { status: 'fail', detail: 'ไม่พบ SPREADSHEET_ID' };
      failures.push('SPREADSHEET_ID missing');
    }

    // Allowed domains (info)
    const domains = config.getList('allowed_domains');
    checks.allowedDomains = {
      status: 'ok',
      detail: domains.length ? `จำกัด ${domains.length} โดเมน` : 'ไม่จำกัด (dev)',
    };

    return {
      status: failures.length ? 'not_ready' : 'ready',
      version: VERSION,
      provider: mock ? 'mock' : 'gemini',
      checks,
      failures,
    };
  }
}

export const healthService = new HealthService();
