import axios from 'axios';
import * as cheerio from 'cheerio';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Advanced contact extraction schema
const ContactSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().optional(),
  role: z.string().optional(),
  companyName: z.string(),
  domain: z.string(),
  source: z.string(),
  confidence: z.number().min(0).max(10),
  extractedAt: z.date()
});

type Contact = z.infer<typeof ContactSchema>;

class WebScraperService {
  private proxyList: string[] = [
    'http://proxy1.example.com:8080',
    'http://proxy2.example.com:8080',
    // Add more proxy servers
  ];

  private userAgents: string[] = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    // Add more user agents
  ];

  // Advanced web scraping method
  async scrapeHRContacts(domain: string): Promise<Contact[]> {
    const contacts: Contact[] = [];

    // Multiple scraping strategies
    const scrapingStrategies = [
      this.extractFromAboutPage(domain),
      this.extractFromContactPage(domain),
      this.extractFromLinkedInCompanyPage(domain),
      this.extractFromCompanyDirectories(domain)
    ];

    // Run scraping strategies in parallel
    const resultsFromStrategies = await Promise.all(scrapingStrategies);

    // Flatten and deduplicate results
    return this.processAndFilterContacts(
      resultsFromStrategies.flat()
    );
  }

  // Extract contacts from About page
  private async extractFromAboutPage(domain: string): Promise<Contact[]> {
    try {
      const response = await this.makeRequest(`https://${domain}/about`);
      const $ = cheerio.load(response.data);
      
      const contacts: Contact[] = [];

      // Target HR-related email patterns
      $('*:contains("HR"), *:contains("Human Resources")').each((i, elem) => {
        const emailMatch = $(elem).text().match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/);
        
        if (emailMatch) {
          contacts.push(this.createContact({
            email: emailMatch[1],
            domain,
            source: 'about-page',
            confidence: 7
          }));
        }
      });

      return contacts;
    } catch (error) {
      console.error(`About page scraping error for ${domain}:`, error);
      return [];
    }
  }

  // Extract contacts from Contact page
  private async extractFromContactPage(domain: string): Promise<Contact[]> {
    try {
      const response = await this.makeRequest(`https://${domain}/contact`);
      const $ = cheerio.load(response.data);
      
      const contacts: Contact[] = [];

      // More sophisticated email extraction
      $('a[href^="mailto:"]').each((i, elem) => {
        const email = $(elem).attr('href')?.replace('mailto:', '');
        const name = $(elem).text();

        if (email && this.isHREmail(email)) {
          contacts.push(this.createContact({
            email,
            name,
            domain,
            source: 'contact-page',
            confidence: 8
          }));
        }
      });

      return contacts;
    } catch (error) {
      console.error(`Contact page scraping error for ${domain}:`, error);
      return [];
    }
  }

  // LinkedIn company page scraping
  private async extractFromLinkedInCompanyPage(domain: string): Promise<Contact[]> {
    // Placeholder for LinkedIn scraping
    return [];
  }

  // Company directories scraping
  private async extractFromCompanyDirectories(domain: string): Promise<Contact[]> {
    const directories = [
      `https://www.google.com/search?q=site:${domain}+HR+contact`,
      `https://www.bing.com/search?q=site:${domain}+HR+email`
    ];

    const contacts: Contact[] = [];

    for (const directoryUrl of directories) {
      try {
        const response = await this.makeRequest(directoryUrl);
        const $ = cheerio.load(response.data);

        $('a').each((i, elem) => {
          const href = $(elem).attr('href');
          const emailMatch = href?.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/);

          if (emailMatch && this.isHREmail(emailMatch[1])) {
            contacts.push(this.createContact({
              email: emailMatch[1],
              domain,
              source: 'directory-search',
              confidence: 6
            }));
          }
        });
      } catch (error) {
        console.error(`Directory scraping error for ${domain}:`, error);
      }
    }

    return contacts;
  }

  // Create a contact with validation
  private createContact(contactData: Partial<Contact>): Contact {
    return ContactSchema.parse({
      id: uuidv4(),
      ...contactData,
      extractedAt: new Date()
    });
  }

  // Make request with proxy and user agent rotation
  private async makeRequest(url: string) {
    const proxy = this.getRandomProxy();
    const userAgent = this.getRandomUserAgent();

    return axios.get(url, {
      httpsAgent: new HttpsProxyAgent(proxy),
      headers: {
        'User-Agent': userAgent,
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      timeout: 10000
    });
  }

  // Process and filter contacts
  private processAndFilterContacts(contacts: Contact[]): Contact[] {
    return contacts
      .filter(contact => this.isHREmail(contact.email))
      .filter((contact, index, self) => 
        index === self.findIndex(t => t.email === contact.email)
      )
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 50); // Limit to top 50 contacts
  }

  // HR email identification
  private isHREmail(email: string): boolean {
    const hrPatterns = [
      /hr@/i,
      /human.?resources/i,
      /people@/i,
      /talent@/i,
      /recruitment@/i
    ];

    return hrPatterns.some(pattern => pattern.test(email));
  }

  // Proxy rotation
  private getRandomProxy(): string {
    return this.proxyList[Math.floor(Math.random() * this.proxyList.length)];
  }

  // User agent rotation
  private getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }
}

export const webScraperService = new WebScraperService();
