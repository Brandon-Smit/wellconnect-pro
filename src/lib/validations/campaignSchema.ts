import { z } from 'zod';

// Comprehensive validation for email marketing campaigns
export const CampaignSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3, "Campaign name must be at least 3 characters"),
  description: z.string().optional(),
  
  // Targeting Criteria
  targetIndustries: z.array(z.string()).min(1, "At least one industry must be selected"),
  companySize: z.object({
    min: z.number().min(1, "Minimum company size must be positive"),
    max: z.number().max(10000, "Maximum company size is too large")
  }).optional(),

  // Content Parameters
  emailTemplate: z.object({
    subject: z.string().min(10, "Subject must be at least 10 characters"),
    body: z.string().min(50, "Email body must be at least 50 characters"),
    callToAction: z.string().optional()
  }),

  // Affiliate Link Details
  affiliateLink: z.object({
    url: z.string().url("Invalid URL"),
    trackingCode: z.string().optional(),
    commissionRate: z.number().min(0).max(1, "Commission rate must be between 0 and 1")
  }),

  // Compliance and Ethical Constraints
  complianceSettings: z.object({
    gdprCompliant: z.boolean().default(true),
    canSpamCompliant: z.boolean().default(true),
    optOutMechanism: z.boolean().default(true)
  }),

  // Performance Tracking
  performanceGoals: z.object({
    targetOpenRate: z.number().min(0).max(1).optional(),
    targetClickRate: z.number().min(0).max(1).optional()
  }).optional(),

  // Scheduling
  schedule: z.object({
    startDate: z.date(),
    endDate: z.date().optional(),
    dailyEmailLimit: z.number().min(1).max(100).default(50)
  }),

  // Status Tracking
  status: z.enum(['draft', 'active', 'paused', 'completed']).default('draft'),
  
  // Metadata
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date())
});

// Type inference for TypeScript
export type Campaign = z.infer<typeof CampaignSchema>;

// Validation function
export function validateCampaign(campaign: unknown): Campaign {
  return CampaignSchema.parse(campaign);
}
