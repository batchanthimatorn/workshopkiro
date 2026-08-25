// Sheet definitions + seed config (Ref: design/data-model.md E1-E6)
import { ConfigItem } from '../types';

export const SHEET = {
  logs: {
    name: 'Logs',
    headers: [
      'logId', 'timestamp', 'userEmailMasked', 'role', 'jobType', 'model',
      'status', 'tokens', 'durationMs', 'requestId', 'confirmedBy', 'confirmedAt',
    ],
  },
  config: {
    name: 'Config',
    headers: ['key', 'value', 'category', 'updatedBy', 'updatedAt'],
  },
  prompts: {
    name: 'Prompts',
    headers: ['templateId', 'name', 'taskType', 'language', 'tone', 'promptText', 'model', 'active', 'updatedAt'],
  },
  dashboard: {
    name: 'Dashboard',
    headers: ['period', 'aiCalls', 'tokensUsed', 'failures', 'urlFetchCount', 'updatedAt'],
  },
  deployments: {
    name: 'Deployments',
    headers: ['deploymentId', 'version', 'releaseNote', 'deployedBy', 'deployedAt', 'status'],
  },
  jobs: {
    name: 'Jobs',
    headers: [
      'jobId', 'ownerEmail', 'templateId', 'frequency', 'destination',
      'destinationId', 'triggerId', 'status', 'lastRunAt', 'lastRunStatus',
    ],
  },
} as const;

// seed ค่าเริ่มต้นของ Config (mock-first: mock_mode=true)
export const DEFAULT_CONFIG: ConfigItem[] = [
  { key: 'allowed_domains', value: '', category: 'security' },
  { key: 'admin_emails', value: '', category: 'security' },
  { key: 'banned_keywords', value: '', category: 'security' },
  { key: 'alert_threshold', value: '3', category: 'monitoring' },
  { key: 'alert_email', value: '', category: 'monitoring' },
  { key: 'chat_webhook_url', value: '', category: 'monitoring' },
  { key: 'log_retention_days', value: '90', category: 'general' },
  { key: 'mock_mode', value: 'true', category: 'general' },
  { key: 'gemini_model', value: 'gemini-2.5-flash', category: 'general' },
];

// seed prompt template เริ่มต้น (อย่างน้อย 1 active ต่อ taskType — data-model E3)
import { PromptTemplate } from '../types';

export const DEFAULT_PROMPTS: PromptTemplate[] = [
  {
    templateId: 'default-summarize',
    name: 'สรุปเนื้อหา (default)',
    taskType: 'summarize',
    language: 'auto',
    promptText:
      'สรุปเนื้อหาต่อไปนี้ให้กระชับ ชัดเจน เป็นหัวข้อสำคัญ (ตอบเป็นภาษา {{lang}}):\n\n{{content}}',
    active: true,
  },
  {
    templateId: 'default-draft',
    name: 'ร่างข้อความตอบกลับ (default)',
    taskType: 'draft',
    language: 'auto',
    promptText:
      'ร่างข้อความตอบกลับต่อไปนี้อย่างสุภาพและตรงประเด็น (โทน: {{tone}}, ภาษา: {{lang}}):\n\n{{content}}',
    active: true,
  },
];
