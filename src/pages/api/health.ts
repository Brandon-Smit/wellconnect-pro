import { NextApiRequest, NextApiResponse } from 'next';
import { systemOrchestrator } from '../../services/systemOrchestrator';
import { complianceService } from '../../services/complianceService';
import { performanceTrackingService } from '../../services/performanceTrackingService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Comprehensive system health check
    const systemHealth = await systemOrchestrator.systemHealthCheck();
    const complianceReport = complianceService.generateComplianceReport();
    const performanceMetrics = performanceTrackingService.getSystemPerformance();

    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      systemHealth: {
        emailDiscovery: systemHealth.emailDiscovery,
        dispatch: systemHealth.dispatch,
        compliance: systemHealth.compliance,
        affiliateLinks: systemHealth.affiliateLinks
      },
      complianceMetrics: {
        totalEvents: complianceReport.totalEvents,
        blocklistEntries: complianceReport.blocklistEntries,
        consentWithdrawals: complianceReport.consentWithdrawals
      },
      performanceMetrics: {
        averageResponseTime: performanceMetrics.averageResponseTime,
        totalCampaigns: performanceMetrics.totalCampaigns,
        successRate: performanceMetrics.successRate
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
}
