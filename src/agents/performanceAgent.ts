import { CompanyContact } from '../types/companyContact';

interface EmailMetrics {
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
}

export class PerformanceAgent {
  private metrics: Record<string, EmailMetrics> = {};

  trackEmailSent(contact: CompanyContact) {
    if (!this.metrics[contact.industry]) {
      this.metrics[contact.industry] = {
        sent: 0,
        opened: 0,
        clicked: 0,
        converted: 0
      };
    }
    this.metrics[contact.industry].sent++;
  }

  trackEmailOpened(contact: CompanyContact) {
    this.metrics[contact.industry].opened++;
  }

  trackEmailClicked(contact: CompanyContact) {
    this.metrics[contact.industry].clicked++;
  }

  trackConversion(contact: CompanyContact) {
    this.metrics[contact.industry].converted++;
  }

  getPerformanceReport() {
    return Object.entries(this.metrics).map(([industry, metrics]) => ({
      industry,
      ...metrics,
      openRate: metrics.opened / metrics.sent * 100,
      clickRate: metrics.clicked / metrics.sent * 100,
      conversionRate: metrics.converted / metrics.sent * 100
    }));
  }

  optimizeStrategy() {
    const report = this.getPerformanceReport();
    const bestPerformingIndustries = report
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 3)
      .map(r => r.industry);

    return {
      recommendedIndustries: bestPerformingIndustries,
      suggestedImprovements: this.generateInsights(report)
    };
  }

  private generateInsights(report: any[]) {
    return report.map(r => ({
      industry: r.industry,
      recommendation: r.conversionRate < 1 
        ? 'Refine targeting and messaging' 
        : 'Continue current approach'
    }));
  }
}
