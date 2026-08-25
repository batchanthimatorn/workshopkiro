// Concrete repositories + init/seed (Ref: design/data-model.md, components.md C17)
import { SheetRepository } from './SheetRepository';
import { SHEET, DEFAULT_CONFIG, DEFAULT_PROMPTS } from './schema';
import { LogEntry, ConfigItem, PromptTemplate, Job, DashboardMetric, Deployment } from '../types';

export class LogRepository extends SheetRepository<LogEntry> {
  protected sheetName = SHEET.logs.name;
  protected headers = [...SHEET.logs.headers];
}

export class ConfigRepository extends SheetRepository<ConfigItem> {
  protected sheetName = SHEET.config.name;
  protected headers = [...SHEET.config.headers];

  getMap(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const c of this.readAll()) map[String(c.key)] = String(c.value ?? '');
    return map;
  }

  upsert(item: ConfigItem): void {
    this.withLock(() => {
      const all = this.readAll();
      const idx = all.findIndex((c) => c.key === item.key);
      const withMeta: ConfigItem = { ...item, updatedAt: new Date().toISOString() };
      if (idx < 0) {
        this.append(withMeta);
        return;
      }
      const rowNum = idx + 2; // +1 header, +1 1-based
      this.sheet().getRange(rowNum, 1, 1, this.headers.length).setValues([this.toRow(withMeta)]);
    });
  }
}

export class PromptRepository extends SheetRepository<PromptTemplate> {
  protected sheetName = SHEET.prompts.name;
  protected headers = [...SHEET.prompts.headers];

  findById(templateId: string): PromptTemplate | null {
    return this.readAll().find((t) => t.templateId === templateId) ?? null;
  }

  upsert(t: PromptTemplate): void {
    this.withLock(() => {
      const all = this.readAll();
      const idx = all.findIndex((x) => x.templateId === t.templateId);
      if (idx < 0) {
        this.append(t);
        return;
      }
      this.sheet().getRange(idx + 2, 1, 1, this.headers.length).setValues([this.toRow(t)]);
    });
  }
}

export class JobRepository extends SheetRepository<Job> {
  protected sheetName = SHEET.jobs.name;
  protected headers = [...SHEET.jobs.headers];

  findById(jobId: string): Job | null {
    return this.readAll().find((j) => j.jobId === jobId) ?? null;
  }

  upsert(job: Job): void {
    this.withLock(() => {
      const all = this.readAll();
      const idx = all.findIndex((j) => j.jobId === job.jobId);
      if (idx < 0) {
        this.append(job);
        return;
      }
      this.sheet().getRange(idx + 2, 1, 1, this.headers.length).setValues([this.toRow(job)]);
    });
  }

  deleteById(jobId: string): void {
    this.withLock(() => {
      const all = this.readAll();
      const idx = all.findIndex((j) => j.jobId === jobId);
      if (idx < 0) return;
      this.sheet().deleteRow(idx + 2);
    });
  }
}

export class DashboardRepository extends SheetRepository<DashboardMetric> {
  protected sheetName = SHEET.dashboard.name;
  protected headers = [...SHEET.dashboard.headers];

  upsert(m: DashboardMetric): void {
    this.withLock(() => {
      const all = this.readAll();
      const idx = all.findIndex((x) => String(x.period) === m.period);
      if (idx < 0) {
        this.append(m);
        return;
      }
      this.sheet().getRange(idx + 2, 1, 1, this.headers.length).setValues([this.toRow(m)]);
    });
  }
}

export class DeploymentRepository extends SheetRepository<Deployment> {
  protected sheetName = SHEET.deployments.name;
  protected headers = [...SHEET.deployments.headers];
}

/** สร้างทุกแท็บ + header (idempotent) */
export function initSpreadsheet(): void {
  new LogRepository().ensure();
  new ConfigRepository().ensure();
  new PromptRepository().ensure();
  new DashboardRepository().ensure();
  new DeploymentRepository().ensure();
  new JobRepository().ensure();
}

/** เติม config เริ่มต้นเฉพาะ key ที่ยังไม่มี */
export function seedConfig(): void {
  const repo = new ConfigRepository();
  const existing = repo.getMap();
  for (const item of DEFAULT_CONFIG) {
    if (!(item.key in existing)) repo.upsert(item);
  }
}

/** เติม prompt template เริ่มต้นเฉพาะที่ยังไม่มี */
export function seedPrompts(): void {
  const repo = new PromptRepository();
  for (const p of DEFAULT_PROMPTS) {
    if (!repo.findById(p.templateId)) repo.append(p);
  }
}
