import { contentGenerationService } from '../src/content/contentGenerationService';
import { urlContextExtractor } from '../src/services/urlContextExtractor';
import { z } from 'zod';

describe('Content Generation Service', () => {
  const testServiceUrl = 'https://example-mental-health-service.com';
  
  beforeAll(async () => {
    // Mock URL context extraction
    jest.spyOn(urlContextExtractor, 'extractServiceContext').mockResolvedValue({
      serviceName: 'Test Mental Health Service',
      primaryServices: ['Counseling', 'Wellness Coaching'],
      keyBenefits: ['Confidential Support', 'Flexible Scheduling'],
      targetAudience: ['Corporate HR', 'Employees'],
      ethicalStandards: ['Professional Confidentiality'],
      corporatePackageAvailable: true
    });
  });

  test('Generate Email Content for HR Department', async () => {
    const emailContext = {
      serviceUrl: testServiceUrl,
      targetCompany: {
        name: 'Tech Innovations Inc',
        industry: 'Technology',
        size: 'medium'
      },
      communicationGoal: 'introduce_service'
    };

    const emailContent = await contentGenerationService.generateEmailContent(emailContext);

    expect(emailContent).toBeDefined();
    expect(emailContent.subject).toContain('Mental Health Support');
    expect(emailContent.body).toContain('Test Mental Health Service');
    expect(emailContent.callToAction).toBeTruthy();
  });

  test('Content Enhancement', async () => {
    const originalContent = 'Basic mental health service introduction';
    const enhancedContent = await contentGenerationService.enhanceContentContext(
      originalContent, 
      testServiceUrl
    );

    expect(enhancedContent).not.toBe(originalContent);
    expect(enhancedContent.length).toBeGreaterThan(originalContent.length);
  });

  test('Ethical Content Generation', async () => {
    const emailContext = {
      serviceUrl: testServiceUrl,
      targetCompany: {
        name: 'Wellness Corp',
        industry: 'Healthcare',
        size: 'large'
      },
      communicationGoal: 'schedule_demo'
    };

    const emailContent = await contentGenerationService.generateEmailContent(emailContext);

    // Check for ethical considerations
    expect(emailContent.body).toContain('confidential');
    expect(emailContent.body).toContain('professional');
    expect(emailContent.body).not.toContain('aggressive sales');
  });

  test('Error Handling', async () => {
    const invalidContext = {
      serviceUrl: 'invalid-url',
      targetCompany: {
        name: 'Invalid Company',
        industry: 'Unknown',
        size: 'small'
      },
      communicationGoal: 'provide_information'
    };

    await expect(
      contentGenerationService.generateEmailContent(invalidContext)
    ).rejects.toThrow();
  });
});

export {};
