import axios from 'axios';
import { z } from 'zod';
import { logger } from '../core/loggingSystem';
import { parseHTML } from 'linkedom';

// URL Validation Schema
const URLSchema = z.object({
  url: z.string().url('Invalid URL format')
});

// Extracted Context Schema
const ServiceContextSchema = z.object({
  serviceName: z.string(),
  primaryServices: z.array(z.string()),
  keyBenefits: z.array(z.string()),
  targetAudience: z.array(z.string()),
  ethicalStandards: z.array(z.string()).optional(),
  corporatePackageAvailable: z.boolean().optional()
});

export class URLContextExtractor {
  private static instance: URLContextExtractor;

  private constructor() {}

  public static getInstance(): URLContextExtractor {
    if (!this.instance) {
      this.instance = new URLContextExtractor();
    }
    return this.instance;
  }

  public async extractServiceContext(
    url: string
  ): Promise<z.infer<typeof ServiceContextSchema>> {
    try {
      // Validate URL
      URLSchema.parse({ url });

      // Fetch webpage content
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'WellConnect Pro Context Extractor'
        },
        timeout: 10000
      });

      // Parse HTML
      const { document } = parseHTML(response.data);

      // Extract key contextual elements
      const serviceName = this.extractServiceName(document);
      const primaryServices = this.extractPrimaryServices(document);
      const keyBenefits = this.extractKeyBenefits(document);
      const targetAudience = this.extractTargetAudience(document);
      const ethicalStandards = this.extractEthicalStandards(document);
      const corporatePackageAvailable = this.checkCorporatePackage(document);

      const serviceContext = ServiceContextSchema.parse({
        serviceName,
        primaryServices,
        keyBenefits,
        targetAudience,
        ethicalStandards,
        corporatePackageAvailable
      });

      logger.log('info', 'Service Context Extracted', { 
        url, 
        serviceName: serviceContext.serviceName 
      });

      return serviceContext;
    } catch (error) {
      logger.log('error', 'URL Context Extraction Failed', { url, error });
      throw error;
    }
  }

  private extractServiceName(document: Document): string {
    const nameSelectors = [
      'h1.service-name',
      'title',
      'meta[property="og:title"]',
      '.company-name'
    ];

    for (const selector of nameSelectors) {
      const element = document.querySelector(selector);
      if (element) return element.textContent?.trim() || '';
    }

    return 'Unknown Mental Health Service';
  }

  private extractPrimaryServices(document: Document): string[] {
    const serviceSelectors = [
      '.services-list',
      '.primary-services',
      'ul.services',
      'div.service-description'
    ];

    for (const selector of serviceSelectors) {
      const elements = document.querySelectorAll(`${selector} li, ${selector}`);
      if (elements.length > 0) {
        return Array.from(elements)
          .map(el => el.textContent?.trim())
          .filter(text => text && text.length > 0)
          .slice(0, 5);
      }
    }

    return ['Mental Health Counseling', 'Employee Wellness Support'];
  }

  private extractKeyBenefits(document: Document): string[] {
    const benefitSelectors = [
      '.benefits-list',
      '.key-advantages',
      'ul.benefits',
      'div.service-benefits'
    ];

    for (const selector of benefitSelectors) {
      const elements = document.querySelectorAll(`${selector} li, ${selector}`);
      if (elements.length > 0) {
        return Array.from(elements)
          .map(el => el.textContent?.trim())
          .filter(text => text && text.length > 0)
          .slice(0, 5);
      }
    }

    return [
      'Confidential Professional Support',
      'Flexible Counseling Options',
      'Workplace Mental Health Improvement'
    ];
  }

  private extractTargetAudience(document: Document): string[] {
    const audienceSelectors = [
      '.target-audience',
      '.who-we-help',
      'div.audience-description'
    ];

    for (const selector of audienceSelectors) {
      const elements = document.querySelectorAll(`${selector} li, ${selector}`);
      if (elements.length > 0) {
        return Array.from(elements)
          .map(el => el.textContent?.trim())
          .filter(text => text && text.length > 0)
          .slice(0, 5);
      }
    }

    return [
      'Corporate HR Departments',
      'Employee Wellness Teams',
      'Management Professionals'
    ];
  }

  private extractEthicalStandards(document: Document): string[] {
    const ethicsSelectors = [
      '.ethical-standards',
      '.our-values',
      'div.ethics-description'
    ];

    for (const selector of ethicsSelectors) {
      const elements = document.querySelectorAll(`${selector} li, ${selector}`);
      if (elements.length > 0) {
        return Array.from(elements)
          .map(el => el.textContent?.trim())
          .filter(text => text && text.length > 0)
          .slice(0, 5);
      }
    }

    return [
      'Confidentiality Guaranteed',
      'Professional and Ethical Care',
      'Non-Discriminatory Services'
    ];
  }

  private checkCorporatePackage(document: Document): boolean {
    const packageSelectors = [
      '.corporate-package',
      '.business-solutions',
      'a:contains("Corporate Package")'
    ];

    return packageSelectors.some(selector => 
      document.querySelector(selector) !== null
    );
  }
}

export const urlContextExtractor = URLContextExtractor.getInstance();
