import { installGasMocks, seedSheet, getSheetRows } from '../mocks/gas-globals';
import { MockProvider } from '../../src/ai/MockProvider';
import { PromptService } from '../../src/services/PromptService';
import { Config } from '../../src/core/config';
import { summaryService } from '../../src/services/SummaryService';

const CONFIG_HEADER = ['key', 'value', 'category', 'updatedBy', 'updatedAt'];
const PROMPT_HEADER = ['templateId', 'name', 'taskType', 'language', 'tone', 'promptText', 'model', 'active', 'updatedAt'];

beforeEach(() => installGasMocks({ props: { SPREADSHEET_ID: 'test' } }));

describe('MockProvider', () => {
  it('produces mock summary (th) without network', () => {
    const r = new MockProvider().generate({ task: 'summarize', content: 'hello world', prompt: 'p', lang: 'th' });
    expect(r.model).toBe('mock');
    expect(r.result).toContain('สรุป');
  });

  it('produces mock draft (en)', () => {
    const r = new MockProvider().generate({ task: 'draft', content: 'hi', prompt: 'p', lang: 'en', tone: 'formal' });
    expect(r.result).toContain('MOCK DRAFT');
  });
});

describe('PromptService.render', () => {
  it('replaces placeholders', () => {
    const out = new PromptService().render(
      {
        templateId: 'x',
        name: 'n',
        taskType: 'summarize',
        language: 'auto',
        promptText: 'lang={{lang}} tone={{tone}} c={{content}}',
        active: true,
      },
      { content: 'C', lang: 'th', tone: 'formal' },
    );
    expect(out).toBe('lang=th tone=formal c=C');
  });
});

describe('Config', () => {
  it('isMockMode reads seeded config', () => {
    seedSheet('Config', [CONFIG_HEADER, ['mock_mode', 'true', 'general', '', '']]);
    expect(new Config().isMockMode()).toBe(true);
  });
});

describe('SummaryService (integration with mock provider)', () => {
  it('summarizes via mock and writes a usage log', () => {
    seedSheet('Config', [
      CONFIG_HEADER,
      ['mock_mode', 'true', 'general', '', ''],
      ['banned_keywords', '', 'security', '', ''],
    ]);
    seedSheet('Prompts', [
      PROMPT_HEADER,
      ['default-summarize', 'sum', 'summarize', 'auto', '', '{{content}}', '', 'true', ''],
    ]);

    const res = summaryService.summarize({ content: 'some meaningful text', lang: 'th', userEmail: 'user@corp.com' });
    expect(res.model).toBe('mock');

    const logs = getSheetRows('Logs');
    expect(logs.length).toBeGreaterThanOrEqual(2); // header + 1 usage row
  });

  it('blocks content with banned keyword (BR-02)', () => {
    seedSheet('Config', [
      CONFIG_HEADER,
      ['mock_mode', 'true', 'general', '', ''],
      ['banned_keywords', 'secret', 'security', '', ''],
    ]);
    seedSheet('Prompts', [
      PROMPT_HEADER,
      ['default-summarize', 'sum', 'summarize', 'auto', '', '{{content}}', '', 'true', ''],
    ]);
    expect(() =>
      summaryService.summarize({ content: 'this has a secret', lang: 'th', userEmail: 'u@corp.com' }),
    ).toThrow();
  });
});
