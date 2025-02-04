import os from 'os';
import { performance } from 'perf_hooks';
import { logger } from '../core/loggingSystem';
import { eventBus, EventTypes } from '../core/eventBus';

interface SystemPerformanceReport {
  systemOverview: {
    cpuUsage: number;
    memoryUsage: number;
    totalMemory: number;
    freeMemory: number;
  };
  processDetails: {
    memoryUsed: number;
    cpuUsed: number;
    uptime: number;
  };
  alerts: Array<{
    type: 'warning' | 'critical';
    message: string;
    timestamp: number;
  }>;
}

class PerformanceDashboard {
  private static instance: PerformanceDashboard;
  private alerts: SystemPerformanceReport['alerts'] = [];

  private constructor() {
    this.setupPerformanceMonitoring();
  }

  public static getInstance(): PerformanceDashboard {
    if (!PerformanceDashboard.instance) {
      PerformanceDashboard.instance = new PerformanceDashboard();
    }
    return PerformanceDashboard.instance;
  }

  private setupPerformanceMonitoring(): void {
    // Periodic performance checks
    setInterval(() => {
      const performanceReport = this.generatePerformanceReport();
      this.checkPerformanceThresholds(performanceReport);
    }, 60000); // Every minute
  }

  private checkPerformanceThresholds(report: SystemPerformanceReport): void {
    const { cpuUsage, memoryUsage } = report.systemOverview;

    if (cpuUsage > 80) {
      this.recordAlert({
        type: 'warning',
        message: `High CPU Usage: ${cpuUsage.toFixed(2)}%`,
        timestamp: Date.now()
      });
    }

    if (memoryUsage > 85) {
      this.recordAlert({
        type: 'critical',
        message: `High Memory Usage: ${memoryUsage.toFixed(2)}%`,
        timestamp: Date.now()
      });
    }

    // Publish performance metrics event
    eventBus.publish(EventTypes.SYSTEM_PERFORMANCE_METRICS, report);
  }

  private recordAlert(alert: SystemPerformanceReport['alerts'][0]): void {
    this.alerts.push(alert);
    logger.log('warn', alert.message, { type: alert.type });

    // Keep only last 10 alerts
    if (this.alerts.length > 10) {
      this.alerts.shift();
    }
  }

  public generatePerformanceReport(): SystemPerformanceReport {
    const cpuUsage = this.calculateCPUUsage();
    const memoryUsage = this.calculateMemoryUsage();

    return {
      systemOverview: {
        cpuUsage,
        memoryUsage,
        totalMemory: os.totalmem() / (1024 * 1024 * 1024), // GB
        freeMemory: os.freemem() / (1024 * 1024 * 1024)   // GB
      },
      processDetails: {
        memoryUsed: process.memoryUsage().rss / (1024 * 1024), // MB
        cpuUsed: process.cpuUsage().system / 1000000,          // Seconds
        uptime: process.uptime()
      },
      alerts: this.alerts
    };
  }

  private calculateCPUUsage(): number {
    const startUsage = process.cpuUsage();
    const startTime = performance.now();

    // Simulate some work
    for (let i = 0; i < 1000000; i++) {
      Math.sqrt(i);
    }

    const endTime = performance.now();
    const endUsage = process.cpuUsage();

    const userCPUUsed = (endUsage.user - startUsage.user) / 1000000;
    const systemCPUUsed = (endUsage.system - startUsage.system) / 1000000;
    const totalCPUTime = userCPUUsed + systemCPUUsed;
    const elapsedTime = (endTime - startTime) / 1000;

    return (totalCPUTime / elapsedTime) * 100;
  }

  private calculateMemoryUsage(): number {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    return ((totalMemory - freeMemory) / totalMemory) * 100;
  }

  public getRecentAlerts(limit: number = 5): SystemPerformanceReport['alerts'] {
    return this.alerts.slice(-limit);
  }
}

export const performanceDashboard = PerformanceDashboard.getInstance();
