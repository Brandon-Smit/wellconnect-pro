import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { withAuth } from '@/lib/auth';
import { withPerformanceTracking } from '@/lib/performance';
import { configManager } from '@/lib/services/config-service';

// Comprehensive System Configuration Schema
const SystemConfigurationSchema = z.object({
  organizationProfile: z.object({
    name: z.string().min(2, 'Organization name is required'),
    industry: z.enum([
      'technology', 'healthcare', 'finance', 
      'education', 'manufacturing', 'consulting', 
      'other'
    ]),
    companySize: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']),
    employeeWellnessBudget: z.number().min(0).optional()
  }),

  emailConfiguration: z.object({
    smtpProvider: z.enum(['smtp', 'sendgrid', 'mailgun', 'amazon-ses']),
    apiKey: z.string().optional(),
    dailyEmailLimit: z.number().min(1).max(1000).default(50),
    emailTemplatePreference: z.enum([
      'professional', 'empathetic', 'direct', 'supportive'
    ]).default('supportive')
  }),

  affiliateSettings: z.object({
    mentalHealthServiceUrls: z.array(z.object({
      url: z.string().url('Invalid URL'),
      serviceName: z.string(),
      ethicalScore: z.number().min(0).max(10).optional(),
      specialization: z.string().optional()
    })).min(1, 'At least one mental health service URL is required'),
    commissionStructure: z.object({
      baseRate: z.number().min(0).max(50),
      performanceBonus: z.number().min(0).max(20).optional()
    }),
    targetIndustries: z.array(z.string()).min(1, 'Select at least one target industry')
  }),

  complianceSettings: z.object({
    gdprCompliant: z.boolean().default(true),
    canSpamCompliant: z.boolean().default(true),
    privacyPolicyUrl: z.string().url('Invalid URL').optional(),
    consentManagement: z.object({
      explicitConsent: z.boolean().default(true),
      optOutMechanism: z.boolean().default(true)
    })
  }),

  hrTargeting: z.object({
    targetCompanySizes: z.array(z.enum(['startup', 'small', 'medium', 'large', 'enterprise'])),
    targetCountries: z.array(z.string()).min(1, 'Select at least one country'),
    hrRoleFocus: z.array(z.enum([
      'HR Director', 
      'Chief People Officer', 
      'Wellness Coordinator', 
      'Employee Experience Manager'
    ])).min(1, 'Select at least one HR role')
  }),

  aiConfiguration: z.object({
    personalizedContentEnabled: z.boolean().default(true),
    mlModelTrainingUrls: z.array(z.object({
      url: z.string().url('Invalid URL'),
      category: z.enum([
        'mental_health_resources', 
        'workplace_wellness', 
        'employee_support'
      ])
    })).optional()
  })
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = (req as any).user;

  switch (req.method) {
    case 'POST':
      try {
        // Validate entire configuration
        const validatedConfig = SystemConfigurationSchema.parse(req.body);
        
        // Store configuration using config manager
        await configManager.updateConfig({
          ...validatedConfig,
          lastUpdatedBy: user.id,
          lastUpdatedAt: new Date().toISOString()
        });
        
        res.status(200).json({ 
          message: 'System configuration updated successfully',
          updatedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error('System Configuration Error:', error);
        res.status(400).json({ 
          error: 'Invalid system configuration', 
          details: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
      break;

    case 'GET':
      try {
        // Retrieve current configuration (excluding sensitive details)
        const currentConfig = await configManager.getConfig();
        
        res.status(200).json(currentConfig);
      } catch (error) {
        res.status(500).json({ 
          error: 'Failed to retrieve system configuration', 
          details: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default withAuth(withPerformanceTracking(handler));
