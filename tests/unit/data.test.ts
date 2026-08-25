import { installGasMocks } from '../mocks/gas-globals';
import { ConfigRepository, PromptRepository } from '../../src/data/repositories';

beforeEach(() => installGasMocks({ props: { SPREADSHEET_ID: 'test-sheet' } }));

describe('ConfigRepository', () => {
  it('upsert inserts then updates by key; getMap reflects latest', () => {
    const repo = new ConfigRepository();
    repo.upsert({ key: 'mock_mode', value: 'true', category: 'general' });
    repo.upsert({ key: 'alert_threshold', value: '5', category: 'monitoring' });
    repo.upsert({ key: 'mock_mode', value: 'false', category: 'general' }); // update existing

    const map = repo.getMap();
    expect(map.mock_mode).toBe('false');
    expect(map.alert_threshold).toBe('5');
    expect(repo.readAll()).toHaveLength(2);
  });
});

describe('PromptRepository', () => {
  it('append + findById + upsert', () => {
    const repo = new PromptRepository();
    repo.append({
      templateId: 't1',
      name: 'name1',
      taskType: 'summarize',
      language: 'auto',
      promptText: '{{content}}',
      active: true,
    });
    expect(repo.findById('t1')?.name).toBe('name1');
    expect(repo.findById('missing')).toBeNull();

    repo.upsert({
      templateId: 't1',
      name: 'renamed',
      taskType: 'summarize',
      language: 'auto',
      promptText: '{{content}}',
      active: true,
    });
    expect(repo.findById('t1')?.name).toBe('renamed');
    expect(repo.readAll()).toHaveLength(1);
  });
});
