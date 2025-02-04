import axios from 'axios';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { webScraperService } from './webScraperService';
import { complianceService } from './complianceService';

// Refined contact validation schema
const HRContactSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  companyName: z.string(),
  companySize: z.number().min(10).max(100000),
  industry: z.string(),
  contactName: z.string().optional(),
  title: z.string().regex(/hr/i, { message: "Must be an HR-related role" }),
  qualityScore: z.number().min(0).max(10),
  source: z.enum(['linkedin', 'crunchbase', 'company-website', 'professional-directory']),
  lastVerified: z.date(),
  marketingConsent: z.boolean().optional().default(false)
});

type HRContact = z.infer<typeof HRContactSchema>;

// Company domain schema for discovery
const CompanyDomainSchema = z.object({
  id: z.string().uuid(),
  domain: z.string(),
  companyName: z.string(),
  industry: z.string().optional(),
  companySize: z.number().optional(),
  discoverySource: z.enum([
    'manual-input', 
    'crunchbase', 
    'linkedin', 
    'company-directory'
  ]),
  discoveredAt: z.date()
});

type CompanyDomain = z.infer<typeof CompanyDomainSchema>;

class EmailDiscoveryService {
  private apiKeys: Record<string, string> = {
    linkedin: process.env.LINKEDIN_API_KEY || '',
    crunchbase: process.env.CRUNCHBASE_API_KEY || ''
  };

  // Predefined company directories and sources
  private companyDirectories: string[] = [
    'https://www.crunchbase.com/organizations',
    'https://www.linkedin.com/company-beta/list',
    'https://www.glassdoor.com/Employers'
  ];

  // Manual input of known company domains
  private manualDomains: CompanyDomain[] = [
    {
      id: uuidv4(),
      domain: 'google.com',
      companyName: 'Google',
      industry: 'Technology',
      companySize: 100000,
      discoverySource: 'manual-input',
      discoveredAt: new Date()
    }
    // Add more known company domains
  ];

  // Comprehensive email discovery method
  async discoverHRContacts(filters: {
    industry?: string;
    minCompanySize?: number;
    maxCompanySize?: number;
    marketingConsentRequired?: boolean;
  }): Promise<HRContact[]> {
    // Combine discovery sources
    const discoveryMethods = [
      this.discoverFromManualDomains(filters),
      this.discoverFromCompanyDirectories(filters),
      this.performWebScraping(filters),
      this.scrapeLinkedIn(filters),
      this.scrapeCrunchbase(filters),
      this.scrapeCompanyWebsites(filters)
    ];

    // Execute discovery in parallel
    const contactResults = await Promise.all(discoveryMethods);

    // Flatten, deduplicate, and filter results
    return this.processAndFilterContacts(
      contactResults.flat(), 
      filters
    );
  }

  // Discover from manually input domains
  private async discoverFromManualDomains(filters: any): Promise<any[]> {
    return this.manualDomains
      .filter(domain => 
        this.matchesFilters(domain, filters)
      )
      .map(async (domain) => {
        // Scrape each manual domain
        return webScraperService.scrapeHRContacts(domain.domain);
      });
  }

  // Discover from online company directories
  private async discoverFromCompanyDirectories(filters: any): Promise<any[]> {
    const discoveryPromises = this.companyDirectories.map(async (directory) => {
      try {
        // Placeholder for directory scraping logic
        // In a real implementation, this would use APIs or web scraping
        const companiesFromDirectory = await this.scrapeCompanyDirectory(directory);
        
        return companiesFromDirectory
          .filter(company => this.matchesFilters(company, filters))
          .map(company => 
            webScraperService.scrapeHRContacts(company.domain)
          );
      } catch (error) {
        console.error(`Directory discovery error for ${directory}:`, error);
        return [];
      }
    });

    return Promise.all(discoveryPromises);
  }

  // Perform general web scraping for HR contacts
  private async performWebScraping(filters: any): Promise<any[]> {
    // Generate search queries based on filters
    const searchQueries = this.generateSearchQueries(filters);

    const scrapingPromises = searchQueries.map(async (query) => {
      try {
        // Use search engine to find potential company domains
        const discoveredDomains = await this.searchCompanyDomains(query);
        
        return discoveredDomains
          .filter(domain => this.matchesFilters(domain, filters))
          .map(domain => 
            webScraperService.scrapeHRContacts(domain.domain)
          );
      } catch (error) {
        console.error(`Web scraping error for query ${query}:`, error);
        return [];
      }
    });

    return Promise.all(scrapingPromises);
  }

  // LinkedIn contact scraping
  private async scrapeLinkedIn(filters: any): Promise<HRContact[]> {
    try {
      const response = await axios.get('https://api.linkedin.com/v2/people', {
        headers: { 
          'Authorization': `Bearer ${this.apiKeys.linkedin}`,
          'cache-control': 'no-cache'
        },
        params: {
          q: 'title',
          title: 'HR',
          ...this.buildLinkedInFilters(filters)
        }
      });

      return response.data.elements.map(this.transformLinkedInContact);
    } catch (error) {
      console.error('LinkedIn scraping error:', error);
      return [];
    }
  }

  // Crunchbase company discovery
  private async scrapeCrunchbase(filters: any): Promise<HRContact[]> {
    try {
      const response = await axios.get('https://api.crunchbase.com/v3.1/organizations', {
        headers: { 
          'X-CB-API-KEY': this.apiKeys.crunchbase,
          'cache-control': 'no-cache'
        },
        params: this.buildCrunchbaseFilters(filters)
      });

      return response.data.data.items.flatMap(this.extractHRContacts);
    } catch (error) {
      console.error('Crunchbase scraping error:', error);
      return [];
    }
  }

  // Company website email extraction
  private async scrapeCompanyWebsites(filters: any): Promise<HRContact[]> {
    // Placeholder for more advanced web scraping logic
    return [];
  }

  // Process and filter discovered contacts
  private processAndFilterContacts(
    contacts: HRContact[], 
    filters: any
  ): HRContact[] {
    return contacts
      .filter(contact => {
        // Apply size filters
        const meetsSizeRequirement = 
          (!filters.minCompanySize || contact.companySize >= filters.minCompanySize) &&
          (!filters.maxCompanySize || contact.companySize <= filters.maxCompanySize);

        // Apply industry filter
        const meetsIndustryRequirement = 
          !filters.industry || 
          contact.industry.toLowerCase().includes(filters.industry.toLowerCase());

        // Apply marketing consent filter
        const meetsConsentRequirement = 
          !filters.marketingConsentRequired || 
          contact.marketingConsent;

        return meetsSizeRequirement && 
               meetsIndustryRequirement && 
               meetsConsentRequirement;
      })
      .map(contact => ({
        ...contact,
        qualityScore: this.calculateContactQuality(contact)
      }))
      .sort((a, b) => b.qualityScore - a.qualityScore)
      .slice(0, 50); // Limit to 50 high-quality contacts
  }

  // Filter matching helper
  private matchesFilters(item: any, filters: any): boolean {
    const meetsSizeRequirement = 
      (!filters.minCompanySize || item.companySize >= filters.minCompanySize) &&
      (!filters.maxCompanySize || item.companySize <= filters.maxCompanySize);

    const meetsIndustryRequirement = 
      !filters.industry || 
      (item.industry && 
       item.industry.toLowerCase().includes(filters.industry.toLowerCase()));

    return meetsSizeRequirement && meetsIndustryRequirement;
  }

  // Generate search queries based on filters
  private generateSearchQueries(filters: any): string[] {
    const baseQueries = [
      'HR departments in companies',
      'Corporate HR contact information'
    ];

    if (filters.industry) {
      baseQueries.push(`${filters.industry} company HR contacts`);
    }

    if (filters.companySize) {
      baseQueries.push(`${filters.companySize} employee HR departments`);
    }

    return baseQueries;
  }

  // Placeholder for directory and search engine scraping
  private async scrapeCompanyDirectory(directory: string): Promise<CompanyDomain[]> {
    // Implement actual scraping logic
    return [];
  }

  private async searchCompanyDomains(query: string): Promise<CompanyDomain[]> {
    // Implement search engine domain discovery
    return [];
  }

  // Quality scoring algorithm
  private calculateContactQuality(contact: HRContact): number {
    let score = 5; // Base score

    // Boost for verified contacts
    if (contact.lastVerified > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
      score += 2;
    }

    // Boost for marketing consent
    if (contact.marketingConsent) {
      score += 2;
    }

    // Industry and company size considerations
    score += contact.companySize > 1000 ? 1 : 0;

    return Math.min(score, 10);
  }

  // Transformation and validation helpers
  private transformLinkedInContact(rawContact: any): HRContact {
    return HRContactSchema.parse({
      id: uuidv4(),
      email: rawContact.emailAddress,
      companyName: rawContact.company,
      companySize: rawContact.companySize || 0,
      industry: rawContact.industry,
      contactName: `${rawContact.firstName} ${rawContact.lastName}`,
      title: rawContact.title,
      source: 'linkedin',
      lastVerified: new Date(),
      qualityScore: 0 // Will be calculated later
    });
  }

  private extractHRContacts(company: any): HRContact[] {
    // Placeholder for more sophisticated HR contact extraction
    return [];
  }

  // Filter builders for different APIs
  private buildLinkedInFilters(filters: any) {
    // Implement LinkedIn-specific filtering logic
    return {};
  }

  private buildCrunchbaseFilters(filters: any) {
    // Implement Crunchbase-specific filtering logic
    return {};
  }

  // Validate and verify individual contact
  async validateContact(contact: HRContact): Promise<boolean> {
    try {
      // Email verification service integration
      const verificationResult = await this.verifyEmail(contact.email);
      
      return verificationResult.isValid && 
             verificationResult.isCorporate && 
             verificationResult.isDeliverable;
    } catch (error) {
      console.error('Contact validation error:', error);
      return false;
    }
  }

  // Email verification method (placeholder for external service)
  private async verifyEmail(email: string): Promise<{
    isValid: boolean;
    isCorporate: boolean;
    isDeliverable: boolean;
  }> {
    // Integrate with email verification service
    return {
      isValid: true,
      isCorporate: true,
      isDeliverable: true
    };
  }
}

class CompanyContactService {
  private companyContacts: any[] = [];
  private emailValidations: any[] = [];
  private scrapingConfig: any;

  constructor() {
    this.scrapingConfig = {
      userAgents: [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      ],
      proxyServers: process.env.PROXY_SERVERS 
        ? process.env.PROXY_SERVERS.split(',') 
        : [],
      maxConcurrentRequests: 3,
      requestTimeout: 10000,
      ethicalScoreThreshold: 7
    };
  }

  // Select a random user agent
  private getRandomUserAgent(): string {
    return this.scrapingConfig.userAgents[
      Math.floor(Math.random() * this.scrapingConfig.userAgents.length)
    ];
  }

  // Select a random proxy (if available)
  private getRandomProxy(): string | undefined {
    const proxies = this.scrapingConfig.proxyServers;
    return proxies && proxies.length > 0 
      ? proxies[Math.floor(Math.random() * proxies.length)] 
      : undefined;
  }

  // Validate email using multiple methods
  async validateEmail(email: string): Promise<any> {
    // Regex validation
    const regexValidation = this.validateEmailRegex(email);
    
    // DNS lookup validation
    const dnsValidation = await this.validateEmailDNS(email);
    
    // Disposable email check
    const disposableCheck = this.checkDisposableEmail(email);

    // Combine validation results
    const confidence = this.calculateValidationConfidence(
      regexValidation, 
      dnsValidation, 
      disposableCheck
    );

    const emailValidation = {
      email,
      isValid: confidence > 70,
      validationMethod: 'regex', // Primary method
      confidence,
      lastValidated: new Date()
    };

    this.emailValidations.push(emailValidation);
    return emailValidation;
  }

  // Basic regex email validation
  private validateEmailRegex(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // DNS lookup validation
  private async validateEmailDNS(email: string): Promise<boolean> {
    try {
      // Simulate DNS lookup (in a real-world scenario, use a DNS lookup library)
      const domain = email.split('@')[1];
      const response = await axios.get(`https://dns.google/resolve?name=${domain}`);
      return response.data.Answer !== null;
    } catch {
      return false;
    }
  }

  // Check for disposable email domains
  private checkDisposableEmail(email: string): boolean {
    const disposableDomains = [
      'mailinator.com', 
      'temp-mail.org', 
      'guerrillamail.com'
    ];
    return !disposableDomains.some(domain => email.includes(domain));
  }

  // Calculate validation confidence
  private calculateValidationConfidence(
    regexValid: boolean, 
    dnsValid: boolean, 
    notDisposable: boolean
  ): number {
    let confidence = 0;
    confidence += regexValid ? 30 : 0;
    confidence += dnsValid ? 40 : 0;
    confidence += notDisposable ? 30 : 0;
    return confidence;
  }

  // Web scraping for company contact discovery
  async discoverCompanyContacts(
    domain: string, 
    industry?: string
  ): Promise<any> {
    try {
      // Fetch company website
      const response = await axios.get(domain, {
        headers: {
          'User-Agent': this.getRandomUserAgent()
        },
        proxy: this.getRandomProxy() 
          ? { 
              host: this.getRandomProxy()!.split('://')[1].split(':')[0],
              port: parseInt(this.getRandomProxy()!.split(':')[2] || '80')
            } 
          : undefined,
        timeout: this.scrapingConfig.requestTimeout
      });

      // Parse HTML and extract potential emails
      const $ = cheerio.load(response.data);
      const potentialEmails: string[] = [];

      // Extract emails from various HTML elements
      $('a, p, span, div').each((_, element) => {
        const text = $(element).text();
        const emailMatches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
        
        if (emailMatches) {
          potentialEmails.push(...emailMatches);
        }
      });

      // Validate and filter emails
      const validEmails = await Promise.all(
        potentialEmails.map(async email => {
          const validation = await this.validateEmail(email);
          return validation.isValid ? email : null;
        })
      );

      const filteredEmails = validEmails.filter(email => email !== null) as string[];

      // Create company contact
      const companyContact = {
        id: uuidv4(),
        name: $('title').text() || 'Unknown Company',
        domain,
        industry: industry || 'Unknown',
        companySize: {}, // Placeholder, would be more sophisticated in real implementation
        emails: filteredEmails,
        discoverySource: 'company_website',
        discoveryTimestamp: new Date(),
        ethicalScore: this.calculateCompanyEthicalScore(filteredEmails)
      };

      // Add to contacts if meets ethical threshold
      if (companyContact.ethicalScore >= this.scrapingConfig.ethicalScoreThreshold) {
        this.companyContacts.push(companyContact);
      }

      return companyContact;
    } catch (error) {
      console.error('Company contact discovery failed:', error);
      throw new Error('Failed to discover company contacts');
    }
  }

  // Calculate ethical score for discovered contacts
  private calculateCompanyEthicalScore(emails: string[]): number {
    // More sophisticated scoring could involve:
    // 1. Email domain reputation
    // 2. Company industry alignment
    // 3. Compliance with data protection regulations
    
    let score = 5; // Base score
    
    // Bonus for validated emails
    score += emails.length * 0.5;
    
    // Cap the score
    return Math.min(10, score);
  }

  // Find companies by industry and size
  findCompanies(filters: {
    industry?: string;
    minCompanySize?: number;
    maxCompanySize?: number;
  }): any[] {
    return this.companyContacts.filter(company => 
      (!filters.industry || company.industry === filters.industry) &&
      (!filters.minCompanySize || 
        (company.companySize.min || 0) >= filters.minCompanySize) &&
      (!filters.maxCompanySize || 
        (company.companySize.max || Infinity) <= filters.maxCompanySize)
    );
  }

  // Compliance-based contact filtering
  filterEthicalContacts(): any[] {
    return this.companyContacts.filter(contact => 
      contact.ethicalScore >= this.scrapingConfig.ethicalScoreThreshold &&
      contact.emails.every(email => !complianceService.isBlocked(email))
    );
  }
}

class EmailDiscoveryService {
  private proxyServers: string[] = [
    'https://proxy1.example.com',
    'https://proxy2.example.com'
  ];

  private industries = [
    'technology', 'healthcare', 'finance', 
    'education', 'manufacturing', 'consulting'
  ];

  // Discover company contacts
  async discoverContacts(
    options: {
      industry?: string;
      companySize?: { min?: number; max?: number };
      limit?: number;
    } = {}
  ): Promise<any[]> {
    const { 
      industry = this.industries[Math.floor(Math.random() * this.industries.length)], 
      companySize, 
      limit = 10 
    } = options;

    const discoveredContacts: any[] = [];

    // Parallel discovery methods
    const sources = [
      this.scrapeLinkedIn,
      this.scrapeCompanyWebsite,
      this.scrapeCrunchbase
    ];

    const sourcePromises = sources.map(source => 
      source.call(this, industry, companySize)
    );

    const sourceResults = await Promise.allSettled(sourcePromises);

    sourceResults.forEach(result => {
      if (result.status === 'fulfilled') {
        discoveredContacts.push(...result.value);
      }
    });

    // Validate, filter, and limit contacts
    return this.validateAndFilterContacts(discoveredContacts)
      .slice(0, limit);
  }

  // Simulate LinkedIn contact scraping
  private async scrapeLinkedIn(
    industry: string, 
    companySize?: { min?: number; max?: number }
  ): Promise<any[]> {
    // Simulated LinkedIn scraping with ethical considerations
    return [
      {
        id: uuidv4(),
        companyName: 'Tech Innovations Inc.',
        domain: 'https://techinnovations.com',
        industry,
        companySize: { min: 100, max: 500 },
        contacts: [
          {
            name: 'Jane Doe',
            title: 'HR Director',
            email: 'jane.doe@techinnovations.com',
            ethicalScore: 9
          }
        ],
        discoverySource: 'linkedin',
        discoveryTimestamp: new Date(),
        confidenceScore: 85
      }
    ];
  }

  // Simulate company website scraping
  private async scrapeCompanyWebsite(
    industry: string, 
    companySize?: { min?: number; max?: number }
  ): Promise<any[]> {
    // Simulated website contact scraping
    return [
      {
        id: uuidv4(),
        companyName: 'Global Solutions LLC',
        domain: 'https://globalsolutions.com',
        industry,
        companySize: { min: 50, max: 250 },
        contacts: [
          {
            name: 'John Smith',
            title: 'People Operations Manager',
            email: 'john.smith@globalsolutions.com',
            ethicalScore: 8
          }
        ],
        discoverySource: 'company_website',
        discoveryTimestamp: new Date(),
        confidenceScore: 75
      }
    ];
  }

  // Simulate Crunchbase company information scraping
  private async scrapeCrunchbase(
    industry: string, 
    companySize?: { min?: number; max?: number }
  ): Promise<any[]> {
    // Simulated Crunchbase scraping
    return [
      {
        id: uuidv4(),
        companyName: 'Innovative Workplace Solutions',
        domain: 'https://workplaceinnovations.com',
        industry,
        companySize: { min: 200, max: 1000 },
        contacts: [
          {
            name: 'Emily Rodriguez',
            title: 'Chief People Officer',
            email: 'emily.rodriguez@workplaceinnovations.com',
            ethicalScore: 9
          }
        ],
        discoverySource: 'crunchbase',
        discoveryTimestamp: new Date(),
        confidenceScore: 90
      }
    ];
  }

  // Validate and filter discovered contacts
  private validateAndFilterContacts(
    contacts: any[]
  ): any[] {
    return contacts
      .map(company => ({
        ...company,
        contacts: company.contacts.filter(contact => 
          this.validateEmail(contact.email) && 
          this.calculateEthicalScore(contact) >= 7
        )
      }))
      .filter(company => company.contacts.length > 0)
      .sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  // Validate email address
  private validateEmail(email: string): boolean {
    return EmailValidator.validate(email);
  }

  // Calculate ethical score for a contact
  private calculateEthicalScore(contact: { 
    name: string; 
    title: string 
  }): number {
    const titleScores: { [key: string]: number } = {
      'hr director': 9,
      'hr manager': 8,
      'people operations': 8,
      'chief people officer': 9,
      'talent acquisition': 7,
      'hr business partner': 8
    };

    const normalizedTitle = contact.title.toLowerCase();
    const baseScore = Object.keys(titleScores).some(key => 
      normalizedTitle.includes(key)
    ) ? titleScores[normalizedTitle] : 5;

    return baseScore;
  }
}

export const emailDiscoveryService = new EmailDiscoveryService();
export const companyContactService = new CompanyContactService();
