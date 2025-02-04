import { z } from 'zod';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../core/loggingSystem';
import { eventBus, EventTypes } from '../core/eventBus';
import { complianceRuleEngine } from '../compliance/complianceRuleEngine';

// Email Validation Schema
const EmailContactSchema = z.object({
  email: z.string().email(),
  domain: z.string(),
  companyName: z.string(),
  industry: z.string(),
  companySize: z.enum(['small', 'medium', 'large']),
  contactType: z.enum(['hr', 'executive', 'general']),
  confidence: z.number().min(0).max(1),
  sourceUrl: z.string().url(),
  discoveredAt: z.date(),
  ethicalScore: z.number().min(0).max(1).default(0.5)
});

// Search Configuration Schema
const SearchConfigSchema = z.object({
  industries: z.array(z.string()).default(['healthcare', 'technology', 'finance']),
  companySizes: z.array(z.enum(['small', 'medium', 'large'])).default(['medium', 'large']),
  searchDepth: z.number().min(1).max(10).default(3),
  geoTargets: z.array(z.string()).default(['US']),
  emailPatterns: z.array(z.string()).default([
    'hr@{domain}',
    'hiring@{domain}',
    'careers@{domain}',
    'contact@{domain}'
  ])
});

class EmailDiscoveryModule {
  private static instance: EmailDiscoveryModule;
  private discoveredContacts: Set<z.infer<typeof EmailContactSchema>> = new Set();
  private searchConfig: z.infer<typeof SearchConfigSchema>;

  private constructor() {
    this.searchConfig = SearchConfigSchema.parse({});
  }

  public static getInstance(): EmailDiscoveryModule {
    if (!EmailDiscoveryModule.instance) {
      EmailDiscoveryModule.instance = new EmailDiscoveryModule();
    }
    return EmailDiscoveryModule.instance;
  }

  // Configure search parameters
  public configure(config: Partial<z.infer<typeof SearchConfigSchema>>): void {
    this.searchConfig = SearchConfigSchema.parse({
      ...this.searchConfig,
      ...config
    });

    logger.log('info', 'Email Discovery Configuration Updated', {
      industries: this.searchConfig.industries,
      companySizes: this.searchConfig.companySizes
    });
  }

  // Primary email discovery method
  public async discoverEmails(query: string): Promise<z.infer<typeof EmailContactSchema>[]> {
    const results: z.infer<typeof EmailContactSchema>[] = [];

    try {
      const searchResults = await this.performWebSearch(query);
      
      for (const result of searchResults) {
        const emailContacts = await this.extractEmailContacts(result);
        results.push(...emailContacts);
      }

      // Publish discovery event
      eventBus.publish(EventTypes.EMAIL_DISCOVERY_COMPLETED, {
        query,
        totalContacts: results.length
      });

      return this.filterAndValidateContacts(results);
    } catch (error) {
      logger.log('error', 'Email Discovery Failed', { 
        query, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });

      throw error;
    }
  }

  // Perform web search to find potential company pages
  private async performWebSearch(query: string): Promise<string[]> {
    const searchUrls: string[] = [];
    
    // Use multiple search engines for redundancy
    const searchEngines = [
      `https://www.google.com/search?q=${encodeURIComponent(query)}`,
      `https://www.bing.com/search?q=${encodeURIComponent(query)}`
    ];

    for (const searchUrl of searchEngines) {
      try {
        const response = await axios.get(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        const $ = cheerio.load(response.data);
        
        // Extract search result URLs
        $('a').each((_, element) => {
          const href = $(element).attr('href');
          if (href && href.startsWith('http') && !searchUrls.includes(href)) {
            searchUrls.push(href);
          }
        });

        // Limit search depth
        if (searchUrls.length >= this.searchConfig.searchDepth * 5) break;
      } catch (error) {
        logger.log('warn', 'Search Engine Scraping Failed', { 
          searchEngine: searchUrl,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return searchUrls.slice(0, this.searchConfig.searchDepth * 5);
  }

  // Extract email contacts from a web page
  private async extractEmailContacts(
    url: string
  ): Promise<z.infer<typeof EmailContactSchema>[]> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      const emails: z.infer<typeof EmailContactSchema>[] = [];

      // Extract emails using regex
      const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
      const pageText = $('body').text();
      const matches = pageText.match(emailRegex) || [];

      for (const emailStr of matches) {
        try {
          const contact = this.validateEmailContact(emailStr, url);
          if (contact) emails.push(contact);
        } catch (validationError) {
          logger.log('warn', 'Email Validation Failed', { 
            email: emailStr, 
            error: validationError instanceof Error ? validationError.message : 'Unknown error'
          });
        }
      }

      return emails;
    } catch (error) {
      logger.log('warn', 'Email Extraction Failed', { 
        url, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return [];
    }
  }

  // Validate and enrich email contact
  private validateEmailContact(
    email: string, 
    sourceUrl: string
  ): z.infer<typeof EmailContactSchema> | null {
    try {
      // Basic email validation
      const parsedEmail = EmailContactSchema.parse({
        email,
        domain: new URL(sourceUrl).hostname,
        companyName: this.extractCompanyName(sourceUrl),
        industry: this.inferIndustry(sourceUrl),
        companySize: this.inferCompanySize(sourceUrl),
        contactType: this.inferContactType(email),
        confidence: this.calculateConfidence(email, sourceUrl),
        sourceUrl,
        discoveredAt: new Date()
      });

      // Compliance check
      const complianceCheck = complianceRuleEngine.checkCompliance(
        parsedEmail, 
        { 
          dataType: 'email_contact', 
          dataSource: 'web_discovery' 
        }
      );

      // Only return if compliance check passes
      return complianceCheck.passed ? parsedEmail : null;
    } catch (error) {
      return null;
    }
  }

  // Filter and validate discovered contacts
  private filterAndValidateContacts(
    contacts: z.infer<typeof EmailContactSchema>[]
  ): z.infer<typeof EmailContactSchema>[] {
    return contacts
      .filter(contact => 
        this.searchConfig.industries.includes(contact.industry) &&
        this.searchConfig.companySizes.includes(contact.companySize)
      )
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 50); // Limit to 50 highest confidence contacts
  }

  // Utility methods for contact inference
  private extractCompanyName(url: string): string {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace('www.', '').split('.')[0];
    } catch {
      return 'Unknown Company';
    }
  }

  private inferIndustry(url: string): string {
    const industryKeywords: Record<string, string> = {
      'healthcare': ['hospital', 'clinic', 'medical', 'health'],
      'technology': ['tech', 'software', 'cloud', 'digital'],
      'finance': ['bank', 'financial', 'investment', 'capital']
    };

    for (const [industry, keywords] of Object.entries(industryKeywords)) {
      if (keywords.some(keyword => url.includes(keyword))) {
        return industry;
      }
    }

    return 'other';
  }

  private inferCompanySize(url: string): z.infer<typeof EmailContactSchema>['companySize'] {
    // Simple heuristic based on URL complexity and content
    const domainParts = new URL(url).hostname.split('.');
    return domainParts.length > 2 ? 'large' : 'medium';
  }

  private inferContactType(email: string): z.infer<typeof EmailContactSchema>['contactType'] {
    const hrPatterns = ['hr', 'human.resources', 'hiring', 'recruit'];
    const executivePatterns = ['ceo', 'cto', 'cfo', 'executive'];

    if (hrPatterns.some(pattern => email.includes(pattern))) return 'hr';
    if (executivePatterns.some(pattern => email.includes(pattern))) return 'executive';
    
    return 'general';
  }

  private calculateConfidence(email: string, url: string): number {
    let confidence = 0.5;

    // Increase confidence for professional email patterns
    if (email.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)) {
      confidence += 0.2;
    }

    // Increase confidence for known company domains
    if (url.includes('.com') || url.includes('.org')) {
      confidence += 0.2;
    }

    // Cap confidence at 1
    return Math.min(confidence, 1);
  }

  // Retrieve discovered contacts
  public getDiscoveredContacts(): z.infer<typeof EmailContactSchema>[] {
    return Array.from(this.discoveredContacts);
  }

  // Clear discovered contacts
  public clearDiscoveredContacts(): void {
    this.discoveredContacts.clear();
    logger.log('info', 'Discovered Contacts Cleared');
  }
}

export const emailDiscoveryModule = EmailDiscoveryModule.getInstance();
