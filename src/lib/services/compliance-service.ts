import { ComplianceLog } from '@/lib/db/models';
import { z } from 'zod';

// Compliance action types
export const ComplianceActionSchema = z.enum([
  'draft', 
  'sent', 
  'bounced', 
  'opened', 
  'clicked', 
  'unsubscribed'
]);

// Compliance log input schema
export const ComplianceLogInputSchema = z.object({
  campaignId: z.string(),
  action: ComplianceActionSchema,
  reason: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export type ComplianceAction = z.infer<typeof ComplianceActionSchema>;
export type ComplianceLogInput = z.infer<typeof ComplianceLogInputSchema>;

export class ComplianceService {
  async logAction(input: ComplianceLogInput) {
    // Validate input
    const validatedInput = ComplianceLogInputSchema.parse(input);

    try {
      const complianceLog = new ComplianceLog({
        ...validatedInput,
        timestamp: new Date()
      });

      await complianceLog.save();
      return complianceLog;
    } catch (error) {
      console.error('Compliance Logging Error:', error);
      throw new Error('Failed to log compliance action');
    }
  }

  async getCampaignComplianceLogs(campaignId: string) {
    try {
      return await ComplianceLog.find({ campaignId }).sort({ timestamp: -1 });
    } catch (error) {
      console.error('Fetching Compliance Logs Error:', error);
      throw new Error('Failed to retrieve compliance logs');
    }
  }

  async getComplianceMetrics(campaignId: string) {
    try {
      const logs = await this.getCampaignComplianceLogs(campaignId);
      
      const metrics = {
        total: logs.length,
        actions: logs.reduce((acc, log) => {
          acc[log.action] = (acc[log.action] || 0) + 1;
          return acc;
        }, {} as Record<ComplianceAction, number>)
      };

      return metrics;
    } catch (error) {
      console.error('Compliance Metrics Error:', error);
      throw new Error('Failed to calculate compliance metrics');
    }
  }
}

export const complianceService = new ComplianceService();
