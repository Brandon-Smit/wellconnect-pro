import { EmailDiscoveryAgent } from './emailDiscoveryAgent';
import { ContentGenerationAgent } from './contentGenerationAgent';
import { DispatchAgent } from './dispatchAgent';
import { PerformanceAgent } from './performanceAgent';
import { ComplianceAgent } from './complianceAgent';
import { CompanyContact } from '../types/companyContact';

export class OutreachOrchestrator {
  private emailDiscovery: EmailDiscoveryAgent;
  private contentGeneration: ContentGenerationAgent;
  private dispatch: DispatchAgent;
  private performance: PerformanceAgent;
  private compliance: ComplianceAgent;

  constructor() {
    this.emailDiscovery = new EmailDiscoveryAgent();
    this.contentGeneration = new ContentGenerationAgent();
    this.dispatch = new DispatchAgent();
    this.performance = new PerformanceAgent();
    this.compliance = new ComplianceAgent();
  }

  async runCampaign(industry?: string, companySize?: number) {
    try {
      // Discover potential contacts
      const contacts = await this.emailDiscovery.discoverHREmails(industry, companySize);

      for (const contact of contacts) {
        // Check compliance
        if (!this.compliance.isEligibleForOutreach(contact)) {
          continue;
        }

        // Generate personalized content
        const emailContent = await this.contentGeneration.generateEmailContent(contact);

        // Send email
        const sent = await this.dispatch.sendEmail(contact, emailContent);

        if (sent) {
          // Track performance
          this.performance.trackEmailSent(contact);
        }
      }

      // Generate insights
      const performanceReport = this.performance.getPerformanceReport();
      const complianceReport = this.compliance.generateComplianceReport();

      return {
        performance: performanceReport,
        compliance: complianceReport
      };

    } catch (error) {
      console.error('Outreach campaign failed:', error);
      return null;
    }
  }
}
