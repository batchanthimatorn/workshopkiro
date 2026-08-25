// PromptService — Prompt Template Registry + render (Ref: design/components.md C7, NFR-05, US-005)
import { PromptRepository } from '../data/repositories';
import { PromptTemplate, TaskType, Language, Tone } from '../types';
import { genRequestId } from '../core/logger';
import { AppError } from '../core/errors';

export interface RenderVars {
  content: string;
  lang: Language;
  tone?: Tone;
}

export class PromptService {
  private repo = new PromptRepository();

  private isActive(value: unknown): boolean {
    return value === true || String(value).toLowerCase() === 'true';
  }

  listTemplates(includeInactive = false): PromptTemplate[] {
    const all = this.repo.readAll();
    return includeInactive ? all : all.filter((t) => this.isActive(t.active));
  }

  getTemplate(templateId: string): PromptTemplate {
    const t = this.repo.findById(templateId);
    if (!t) throw new AppError('NOT_FOUND', `Prompt template not found: ${templateId}`);
    return t;
  }

  /** template active ตัวแรกของ taskType (ใช้เป็น default ตอนสรุป/ร่าง) */
  getDefaultFor(taskType: TaskType): PromptTemplate {
    const found = this.repo.readAll().find((t) => t.taskType === taskType && this.isActive(t.active));
    if (!found) throw new AppError('NOT_FOUND', `No active prompt template for task: ${taskType}`);
    return found;
  }

  saveTemplate(input: Omit<PromptTemplate, 'templateId' | 'updatedAt'> & { templateId?: string }): PromptTemplate {
    const template: PromptTemplate = {
      ...input,
      templateId: input.templateId || genRequestId(),
      updatedAt: new Date().toISOString(),
    };
    this.repo.upsert(template);
    return template;
  }

  /** แทนที่ placeholder ในแม่แบบด้วยค่าจริง */
  render(template: PromptTemplate, vars: RenderVars): string {
    return template.promptText
      .replace(/\{\{content\}\}/g, vars.content)
      .replace(/\{\{lang\}\}/g, vars.lang)
      .replace(/\{\{tone\}\}/g, vars.tone ?? '');
  }
}

export const promptService = new PromptService();
