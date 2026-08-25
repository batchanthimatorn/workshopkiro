// Config service — อ่าน Config sheet + cache (Ref: design/components.md, D3-7/9)
import { ConfigRepository } from '../data/repositories';

const CACHE_KEY = 'config_map_v1';
const CACHE_TTL_SECONDS = 300; // 5 นาที

export class Config {
  private repo = new ConfigRepository();

  private cache(): GoogleAppsScript.Cache.Cache | null {
    return CacheService.getScriptCache();
  }

  getMap(): Record<string, string> {
    const c = this.cache();
    const cached = c ? c.get(CACHE_KEY) : null;
    if (cached) return JSON.parse(cached) as Record<string, string>;
    const map = this.repo.getMap();
    if (c) c.put(CACHE_KEY, JSON.stringify(map), CACHE_TTL_SECONDS);
    return map;
  }

  get(key: string, fallback = ''): string {
    const value = this.getMap()[key];
    return value !== undefined ? value : fallback;
  }

  getList(key: string): string[] {
    const value = this.get(key);
    return value ? value.split(',').map((s) => s.trim()).filter(Boolean) : [];
  }

  isMockMode(): boolean {
    return this.get('mock_mode', 'true').toLowerCase() !== 'false';
  }

  invalidate(): void {
    const c = this.cache();
    if (c) c.remove(CACHE_KEY);
  }
}

export const config = new Config();
