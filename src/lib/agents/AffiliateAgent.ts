import { BaseAgent, AgentConfig } from './BaseAgent';
import { affiliateService } from '@/lib/api';

export class AffiliateAgent extends BaseAgent {
  constructor(config: AgentConfig) {
    super(config);
  }

  async initialize(): Promise<void> {
    // Initialize affiliate-related state or connections
    try {
      const existingLinks = await affiliateService.getLinks();
      this.setState('affiliateLinks', existingLinks);
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
    }
  }

  async process(input: { 
    action: 'create' | 'list' | 'analyze', 
    data?: any 
  }): Promise<any> {
    switch (input.action) {
      case 'create':
        return this.createAffiliateLink(input.data);
      case 'list':
        return this.listAffiliateLinks();
      case 'analyze':
        return this.analyzeAffiliatePerformance();
      default:
        throw new Error('Unsupported action');
    }
  }

  private async createAffiliateLink(linkData: any) {
    try {
      const newLink = await affiliateService.createLink(linkData);
      
      // Update local state
      const currentLinks = this.getState('affiliateLinks') || [];
      this.setState('affiliateLinks', [...currentLinks, newLink]);

      return newLink;
    } catch (error) {
      this.emit('error', { type: 'createLink', error });
      throw error;
    }
  }

  private async listAffiliateLinks() {
    try {
      const links = await affiliateService.getLinks();
      this.setState('affiliateLinks', links);
      return links;
    } catch (error) {
      this.emit('error', { type: 'listLinks', error });
      throw error;
    }
  }

  private async analyzeAffiliatePerformance() {
    // Placeholder for more advanced performance analysis
    const links = this.getState('affiliateLinks') || [];
    
    return {
      totalLinks: links.length,
      performanceSummary: links.map(link => ({
        companyName: link.companyName,
        referralLink: link.referralLink,
        createdAt: link.createdAt,
      })),
    };
  }

  handleEvent(eventType: string, payload: any): void {
    switch (eventType) {
      case 'linkCreated':
        this.process({ action: 'create', data: payload });
        break;
      case 'performanceRequest':
        this.process({ action: 'analyze' });
        break;
      default:
        this.emit('unhandledEvent', { eventType, payload });
    }
  }
}
