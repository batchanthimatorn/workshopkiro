// Shared types & interfaces (Ref: design/api-spec.md AI contract, design/data-model.md)

// ---- Enums / unions ----
export type Role = 'end_user' | 'automation_owner' | 'developer' | 'admin';
export type JobType = 'summarize' | 'draft' | 'automation' | 'other';
export type TaskType = 'summarize' | 'draft' | 'automation';
export type Language = 'th' | 'en' | 'auto';
export type Tone = 'formal' | 'concise' | 'friendly';
export type Frequency = 'hourly' | 'daily';
export type Destination = 'sheets' | 'docs';
export type LogStatus = 'success' | 'timeout' | 'error' | 'blocked';
export type JobStatus = 'active' | 'paused';
export type RunStatus = 'success' | 'error';

// ---- AI contract (D3-6) ----
export interface AIRequest {
  task: TaskType;
  content: string;
  prompt: string;
  lang: Language;
  tone?: Tone | null;
  model?: string | null;
}

export interface AIResponse {
  result: string;
  model: string;
  tokens?: number;
  finishReason?: 'stop' | 'length' | 'safety';
  cached?: boolean;
}

// ---- Entities (design/data-model.md) ----
export interface LogEntry {
  logId: string;
  timestamp: string;
  userEmailMasked: string;
  role: Role;
  jobType: JobType;
  model: string;
  status: LogStatus;
  tokens?: number;
  durationMs?: number;
  requestId: string;
  confirmedBy?: string;
  confirmedAt?: string;
}

export interface ConfigItem {
  key: string;
  value: string;
  category: 'security' | 'automation' | 'monitoring' | 'general';
  updatedBy?: string;
  updatedAt?: string;
}

export interface PromptTemplate {
  templateId: string;
  name: string;
  taskType: TaskType;
  language: Language;
  tone?: Tone;
  promptText: string;
  model?: string;
  active: boolean;
  updatedAt?: string;
}

export interface Job {
  jobId: string;
  ownerEmail: string;
  templateId: string;
  frequency: Frequency;
  destination: Destination;
  destinationId?: string;
  triggerId?: string;
  status: JobStatus;
  lastRunAt?: string;
  lastRunStatus?: RunStatus;
}

export interface DashboardMetric {
  period: string;
  aiCalls: number;
  tokensUsed: number;
  failures: number;
  urlFetchCount?: number;
  updatedAt: string;
}

export interface Deployment {
  deploymentId: string;
  version: string;
  releaseNote?: string;
  deployedBy?: string;
  deployedAt: string;
  status: 'active' | 'rolled_back';
}

// ---- API envelope (design/api-spec.md) ----
export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
  requestId: string;
}
