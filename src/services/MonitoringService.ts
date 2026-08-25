// MonitoringService — สรุปการใช้งาน/โควต้า + Deployment log (Ref: C14, US-013, NFR-04)
import { LogRepository, DashboardRepository, DeploymentRepository } from '../data/repositories';
import { DashboardMetric, Deployment } from '../types';

export interface DashboardData {
  totals: { aiCalls: number; tokensUsed: number; failures: number };
  metrics: DashboardMetric[];
  deployments: Deployment[];
  recentLogs: Array<{ timestamp: string; jobType: string; status: string; model: string }>;
}

export class MonitoringService {
  private logs = new LogRepository();
  private dash = new DashboardRepository();
  private deployments = new DeploymentRepository();

  getDashboardData(): DashboardData {
    const logs = this.logs.readAll();

    const totals = { aiCalls: 0, tokensUsed: 0, failures: 0 };
    const byPeriod = new Map<string, DashboardMetric>();

    for (const l of logs) {
      const isFailure = l.status === 'error' || l.status === 'timeout';
      const tokens = Number(l.tokens) || 0;
      totals.aiCalls++;
      totals.tokensUsed += tokens;
      if (isFailure) totals.failures++;

      const period = String(l.timestamp).slice(0, 7) || 'unknown';
      const m =
        byPeriod.get(period) ??
        { period, aiCalls: 0, tokensUsed: 0, failures: 0, updatedAt: new Date().toISOString() };
      m.aiCalls++;
      m.tokensUsed += tokens;
      if (isFailure) m.failures++;
      byPeriod.set(period, m);
    }

    const recentLogs = logs
      .slice(-10)
      .reverse()
      .map((l) => ({
        timestamp: String(l.timestamp),
        jobType: String(l.jobType),
        status: String(l.status),
        model: String(l.model),
      }));

    return {
      totals,
      metrics: [...byPeriod.values()].sort((a, b) => b.period.localeCompare(a.period)),
      deployments: this.deployments.readAll(),
      recentLogs,
    };
  }

  /** เขียน snapshot metrics รายเดือนลง DashboardSheet (upsert by period) */
  refreshMetrics(): void {
    for (const m of this.getDashboardData().metrics) {
      this.dash.upsert({ ...m, updatedAt: new Date().toISOString() });
    }
  }

  recordDeployment(info: Deployment): void {
    this.deployments.append(info);
  }
}

export const monitoringService = new MonitoringService();
