import { ContentGenerationSystem } from '../services/contentGenerationSystem';
import { MachineLearningModel } from '../lib/machineLearningModel';
import { AffiliateContextAnalyzer } from '../services/affiliateLinkContextAnalyzer';

describe('ContentGenerationSystem', () => {
  let contentGenerationSystem: ContentGenerationSystem;
  let mlModel: MachineLearningModel;
  let contextAnalyzer: AffiliateContextAnalyzer;

  beforeEach(() => {
    contentGenerationSystem = ContentGenerationSystem.getInstance();
    mlModel = MachineLearningModel.getInstance();
    contextAnalyzer = AffiliateContextAnalyzer.getInstance();
  });

  describe('Content Generation', () => {
    it('should generate contextually relevant email content', async () => {
      const result = await contentGenerationSystem.generateContent({
        affiliateLink: 'https://example-mental-health-service.com',
        targetIndustry: 'technology',
        companySize: 'medium',
        contentType: 'mental-health'
      });

      expect(result).toBeDefined();
      expect(result.subject).toBeTruthy();
      expect(result.body).toBeTruthy();
      expect(result.ethicalScore).toBeDefined();
      expect(result.ethicalScore.sensitivityScore).toBeGreaterThanOrEqual(0);
      expect(result.ethicalScore.sensitivityScore).toBeLessThanOrEqual(1);
    });

    it('should generate multiple content variants', async () => {
      const result = await contentGenerationSystem.generateContent({
        affiliateLink: 'https://example-mental-health-service.com',
        targetIndustry: 'healthcare',
        companySize: 'large'
      });

      expect(result.contentVariants).toBeDefined();
      expect(result.contentVariants.length).toBeGreaterThan(1);
      result.contentVariants.forEach(variant => {
        expect(variant).toContain('[');
        expect(variant).toContain('TONE]');
      });
    });
  });

  describe('Ethical Content Validation', () => {
    it('should validate content ethics', async () => {
      const sampleContent = 'Supporting employee mental health with compassion and professionalism.';
      const ethicsValidation = await contentGenerationSystem.validateContentEthics(sampleContent);

      expect(ethicsValidation).toBeDefined();
      expect(ethicsValidation.isCompliant).toBeDefined();
      expect(ethicsValidation.score).toBeDefined();
      expect(ethicsValidation.score.sensitivityScore).toBeGreaterThanOrEqual(0);
      expect(ethicsValidation.score.sensitivityScore).toBeLessThanOrEqual(1);
    });

    it('should reject unethical content', async () => {
      const unethicalContent = 'Mental health is just a weakness. Employees should toughen up.';
      const ethicsValidation = await contentGenerationSystem.validateContentEthics(unethicalContent);

      expect(ethicsValidation.isCompliant).toBe(false);
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle generation errors gracefully', async () => {
      await expect(
        contentGenerationSystem.generateContent({
          affiliateLink: 'invalid-url',
          targetIndustry: 'technology',
          companySize: 'medium'
        })
      ).rejects.toThrow();
    });

    it('should track content generation performance', async () => {
      const result = await contentGenerationSystem.generateContent({
        affiliateLink: 'https://example-mental-health-service.com',
        targetIndustry: 'finance',
        companySize: 'small'
      });

      expect(result.processingTime).toBeDefined();
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });
});
