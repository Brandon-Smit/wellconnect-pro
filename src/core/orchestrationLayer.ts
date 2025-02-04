import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Import all services
import { emailDiscoveryService } from '../services/emailDiscoveryService';
import { complianceService } from '../services/complianceService';
import { affiliateLinkService } from '../services/affiliateLinkService';
import { contentGenerationService } from '../services/contentGenerationService';
import { emailDispatchService } from '../services/emailDispatchService';

// Workflow Component Schema
const WorkflowComponentSchema = z.object({
  id: z.string().uuid(),
  type: z.enum([
    'email_discovery', 
    'compliance_check', 
    'content_generation', 
    'affiliate_link_management', 
    'email_dispatch'
  ]),
  status: z.enum([
    'pending', 
    'in_progress', 
    'completed', 
    'failed'
  ]),
  input: z.any(),
  output: z.any().optional(),
  performanceMetrics: z.object({
    startTime: z.date(),
    endTime: z.date().optional(),
    duration: z.number().optional(),
    errorCount: z.number().default(0)
  })
});

// Campaign Schema
const CampaignSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  components: z.array(z.infer<typeof WorkflowComponentSchema>),
  overallStatus: z.enum([
    'draft', 
    'in_progress', 
    'completed', 
    'failed'
  ]),
  performanceInsights: z.object({
    totalComponents: z.number(),
    successfulComponents: z.number(),
    failedComponents: z.number(),
    successRate: z.number().min(0).max(100)
  })
});

class OrchestrationLayer {
  private campaigns: z.infer<typeof CampaignSchema>[] = [];

  // Create a new campaign workflow
  async createCampaign(
    campaignConfig: {
      name: string;
      description?: string;
      targetIndustry?: string;
      companySize?: { min: number; max: number };
    }
  ): Promise<z.infer<typeof CampaignSchema>> {
    // Initialize campaign components
    const components: z.infer<typeof WorkflowComponentSchema>[] = [];

    try {
      // 1. Email Discovery
      const discoveryComponent = await this.executeEmailDiscovery(
        campaignConfig.targetIndustry, 
        campaignConfig.companySize
      );
      components.push(discoveryComponent);

      // 2. Compliance Check
      const complianceComponent = await this.executeComplianceCheck(
        discoveryComponent.output
      );
      components.push(complianceComponent);

      // 3. Content Generation
      const contentGenerationComponent = await this.executeContentGeneration(
        complianceComponent.output
      );
      components.push(contentGenerationComponent);

      // 4. Affiliate Link Management
      const affiliateLinkComponent = await this.executeAffiliateLinkManagement(
        contentGenerationComponent.output
      );
      components.push(affiliateLinkComponent);

      // 5. Email Dispatch
      const emailDispatchComponent = await this.executeEmailDispatch(
        affiliateLinkComponent.output
      );
      components.push(emailDispatchComponent);

      // Create campaign
      const campaign = CampaignSchema.parse({
        id: uuidv4(),
        name: campaignConfig.name,
        description: campaignConfig.description,
        components,
        overallStatus: this.calculateCampaignStatus(components),
        performanceInsights: this.calculatePerformanceInsights(components)
      });

      this.campaigns.push(campaign);
      return campaign;

    } catch (error) {
      console.error('Campaign creation failed', error);
      throw error;
    }
  }

  // Email Discovery Component
  private async executeEmailDiscovery(
    industry?: string, 
    companySize?: { min: number; max: number }
  ): Promise<z.infer<typeof WorkflowComponentSchema>> {
    const startTime = new Date();
    
    try {
      const contacts = await emailDiscoveryService.discoverContacts({
        industry,
        companySize,
        limit: 50
      });

      return WorkflowComponentSchema.parse({
        id: uuidv4(),
        type: 'email_discovery',
        status: 'completed',
        input: { industry, companySize },
        output: contacts,
        performanceMetrics: {
          startTime,
          endTime: new Date(),
          duration: new Date().getTime() - startTime.getTime(),
          errorCount: 0
        }
      });
    } catch (error) {
      return WorkflowComponentSchema.parse({
        id: uuidv4(),
        type: 'email_discovery',
        status: 'failed',
        input: { industry, companySize },
        performanceMetrics: {
          startTime,
          endTime: new Date(),
          duration: new Date().getTime() - startTime.getTime(),
          errorCount: 1
        }
      });
    }
  }

  // Compliance Check Component
  private async executeComplianceCheck(
    contacts: any[]
  ): Promise<z.infer<typeof WorkflowComponentSchema>> {
    const startTime = new Date();
    
    try {
      const complianceResults = await Promise.all(
        contacts.map(contact => 
          complianceService.checkContactCompliance(contact.email)
        )
      );

      return WorkflowComponentSchema.parse({
        id: uuidv4(),
        type: 'compliance_check',
        status: 'completed',
        input: contacts,
        output: complianceResults.filter(result => 
          result.status === 'compliant'
        ),
        performanceMetrics: {
          startTime,
          endTime: new Date(),
          duration: new Date().getTime() - startTime.getTime(),
          errorCount: 0
        }
      });
    } catch (error) {
      return WorkflowComponentSchema.parse({
        id: uuidv4(),
        type: 'compliance_check',
        status: 'failed',
        input: contacts,
        performanceMetrics: {
          startTime,
          endTime: new Date(),
          duration: new Date().getTime() - startTime.getTime(),
          errorCount: 1
        }
      });
    }
  }

  // Content Generation Component
  private async executeContentGeneration(
    complianceContacts: any[]
  ): Promise<z.infer<typeof WorkflowComponentSchema>> {
    const startTime = new Date();
    
    try {
      const contentResults = await Promise.all(
        complianceContacts.map(contact => 
          contentGenerationService.generateEmailContent({
            name: contact.companyName,
            industry: contact.industry,
            size: contact.companySize,
            challenges: ['Mental health awareness']
          })
        )
      );

      return WorkflowComponentSchema.parse({
        id: uuidv4(),
        type: 'content_generation',
        status: 'completed',
        input: complianceContacts,
        output: contentResults,
        performanceMetrics: {
          startTime,
          endTime: new Date(),
          duration: new Date().getTime() - startTime.getTime(),
          errorCount: 0
        }
      });
    } catch (error) {
      return WorkflowComponentSchema.parse({
        id: uuidv4(),
        type: 'content_generation',
        status: 'failed',
        input: complianceContacts,
        performanceMetrics: {
          startTime,
          endTime: new Date(),
          duration: new Date().getTime() - startTime.getTime(),
          errorCount: 1
        }
      });
    }
  }

  // Affiliate Link Management Component
  private async executeAffiliateLinkManagement(
    generatedContent: any[]
  ): Promise<z.infer<typeof WorkflowComponentSchema>> {
    const startTime = new Date();
    
    try {
      const affiliateLinkResults = generatedContent.map(content => 
        affiliateLinkService.createAffiliateLink(
          'https://wellconnectpro.com/mental-health-resources',
          'mental_health_resource'
        )
      );

      return WorkflowComponentSchema.parse({
        id: uuidv4(),
        type: 'affiliate_link_management',
        status: 'completed',
        input: generatedContent,
        output: affiliateLinkResults,
        performanceMetrics: {
          startTime,
          endTime: new Date(),
          duration: new Date().getTime() - startTime.getTime(),
          errorCount: 0
        }
      });
    } catch (error) {
      return WorkflowComponentSchema.parse({
        id: uuidv4(),
        type: 'affiliate_link_management',
        status: 'failed',
        input: generatedContent,
        performanceMetrics: {
          startTime,
          endTime: new Date(),
          duration: new Date().getTime() - startTime.getTime(),
          errorCount: 1
        }
      });
    }
  }

  // Email Dispatch Component
  private async executeEmailDispatch(
    affiliateLinks: any[]
  ): Promise<z.infer<typeof WorkflowComponentSchema>> {
    const startTime = new Date();
    
    try {
      const emailDispatchResults = await emailDispatchService.dispatchBulkEmails(
        affiliateLinks.map(link => ({
          recipient: {
            email: link.originalUrl.replace('https://', '').split('/')[0] + '@example.com',
            name: 'HR Manager'
          },
          content: {
            subject: 'Mental Health Resources for Your Team',
            body: `Check out our mental health resources: ${link.shortCode}`
          }
        }))
      );

      return WorkflowComponentSchema.parse({
        id: uuidv4(),
        type: 'email_dispatch',
        status: 'completed',
        input: affiliateLinks,
        output: emailDispatchResults,
        performanceMetrics: {
          startTime,
          endTime: new Date(),
          duration: new Date().getTime() - startTime.getTime(),
          errorCount: 0
        }
      });
    } catch (error) {
      return WorkflowComponentSchema.parse({
        id: uuidv4(),
        type: 'email_dispatch',
        status: 'failed',
        input: affiliateLinks,
        performanceMetrics: {
          startTime,
          endTime: new Date(),
          duration: new Date().getTime() - startTime.getTime(),
          errorCount: 1
        }
      });
    }
  }

  // Calculate overall campaign status
  private calculateCampaignStatus(
    components: z.infer<typeof WorkflowComponentSchema>[]
  ): z.infer<typeof CampaignSchema>['overallStatus'] {
    const failedComponents = components.filter(
      component => component.status === 'failed'
    );

    if (failedComponents.length > 0) return 'failed';
    if (components.some(component => component.status === 'in_progress')) return 'in_progress';
    return 'completed';
  }

  // Calculate performance insights
  private calculatePerformanceInsights(
    components: z.infer<typeof WorkflowComponentSchema>[]
  ): z.infer<typeof CampaignSchema>['performanceInsights'] {
    const totalComponents = components.length;
    const successfulComponents = components.filter(
      component => component.status === 'completed'
    ).length;
    const failedComponents = totalComponents - successfulComponents;

    return {
      totalComponents,
      successfulComponents,
      failedComponents,
      successRate: (successfulComponents / totalComponents) * 100
    };
  }

  // Retrieve campaign by ID
  getCampaignById(
    campaignId: string
  ): z.infer<typeof CampaignSchema> | undefined {
    return this.campaigns.find(campaign => campaign.id === campaignId);
  }

  // Generate comprehensive campaign report
  generateCampaignReport(
    campaignId: string
  ): {
    campaignDetails: z.infer<typeof CampaignSchema>;
    componentDetails: Array<{
      type: string;
      status: string;
      duration: number;
      output: any;
    }>;
  } | null {
    const campaign = this.getCampaignById(campaignId);
    
    if (!campaign) return null;

    return {
      campaignDetails: campaign,
      componentDetails: campaign.components.map(component => ({
        type: component.type,
        status: component.status,
        duration: component.performanceMetrics.duration || 0,
        output: component.output
      }))
    };
  }
}

export const orchestrationLayer = new OrchestrationLayer();
