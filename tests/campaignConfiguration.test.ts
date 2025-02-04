import { z } from 'zod';
import { CampaignConfigSchema } from '../src/schemas/campaignConfig';

describe('Campaign Configuration Validation', () => {
  // Valid configuration test
  it('should validate a complete, correct configuration', () => {
    const validConfig = {
      affiliateLink: 'https://mental-health-service.com/affiliate',
      targetIndustry: 'technology',
      companySize: 'medium',
      dailyEmailLimit: 25,
      emailPlatform: {
        provider: 'smtp'
      },
      ethicalGuidelineConsent: true
    };

    expect(() => CampaignConfigSchema.parse(validConfig)).not.toThrow();
  });

  // Invalid affiliate link test
  it('should reject invalid affiliate link', () => {
    const invalidConfig = {
      affiliateLink: 'not-a-valid-url',
      targetIndustry: 'technology',
      companySize: 'medium',
      dailyEmailLimit: 25,
      emailPlatform: {
        provider: 'smtp'
      },
      ethicalGuidelineConsent: true
    };

    expect(() => CampaignConfigSchema.parse(invalidConfig)).toThrow();
  });

  // Daily email limit tests
  it('should reject email limit below 1', () => {
    const invalidConfig = {
      affiliateLink: 'https://mental-health-service.com/affiliate',
      targetIndustry: 'technology',
      companySize: 'medium',
      dailyEmailLimit: 0,
      emailPlatform: {
        provider: 'smtp'
      },
      ethicalGuidelineConsent: true
    };

    expect(() => CampaignConfigSchema.parse(invalidConfig)).toThrow();
  });

  it('should reject email limit above 50', () => {
    const invalidConfig = {
      affiliateLink: 'https://mental-health-service.com/affiliate',
      targetIndustry: 'technology',
      companySize: 'medium',
      dailyEmailLimit: 51,
      emailPlatform: {
        provider: 'smtp'
      },
      ethicalGuidelineConsent: true
    };

    expect(() => CampaignConfigSchema.parse(invalidConfig)).toThrow();
  });

  // Ethical consent test
  it('should reject configuration without ethical consent', () => {
    const invalidConfig = {
      affiliateLink: 'https://mental-health-service.com/affiliate',
      targetIndustry: 'technology',
      companySize: 'medium',
      dailyEmailLimit: 25,
      emailPlatform: {
        provider: 'smtp'
      },
      ethicalGuidelineConsent: false
    };

    expect(() => CampaignConfigSchema.parse(invalidConfig)).toThrow();
  });

  // Industry targeting test
  it('should validate all allowed industries', () => {
    const industries = [
      'technology', 'healthcare', 'finance', 
      'education', 'manufacturing', 'other'
    ];

    industries.forEach(industry => {
      const validConfig = {
        affiliateLink: 'https://mental-health-service.com/affiliate',
        targetIndustry: industry,
        companySize: 'medium',
        dailyEmailLimit: 25,
        emailPlatform: {
          provider: 'smtp'
        },
        ethicalGuidelineConsent: true
      };

      expect(() => CampaignConfigSchema.parse(validConfig)).not.toThrow();
    });
  });
});
