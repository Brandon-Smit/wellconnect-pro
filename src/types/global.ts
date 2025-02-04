import { z } from 'zod';

// Comprehensive Type Definitions for WellConnect Pro

// Company Contact Type
export const CompanyContactSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  domain: z.string().url(),
  industry: z.string(),
  companySize: z.object({
    min: z.number().optional(),
    max: z.number().optional()
  }),
  emails: z.array(z.string().email()),
  discoverySource: z.enum([
    'linkedin', 
    'company_website', 
    'crunchbase', 
    'manual_input', 
    'other'
  ]),
  discoveryTimestamp: z.date(),
  ethicalScore: z.number().min(0).max(10).default(5)
});

// Email Campaign Type
export const EmailCampaignSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  startDate: z.date(),
  endDate: z.date().optional(),
  targetIndustries: z.array(z.string()),
  targetCompanySize: z.object({
    min: z.number().optional(),
    max: z.number().optional()
  }),
  status: z.enum([
    'draft', 
    'scheduled', 
    'in_progress', 
    'completed', 
    'paused'
  ]),
  performanceMetrics: z.object({
    emailsSent: z.number(),
    deliveryRate: z.number().min(0).max(100),
    openRate: z.number().min(0).max(100),
    clickRate: z.number().min(0).max(100)
  })
});

// Affiliate Link Type
export const AffiliateLinkSchema = z.object({
  id: z.string().uuid(),
  originalUrl: z.string().url(),
  shortCode: z.string(),
  destination: z.string().url(),
  createdAt: z.date(),
  performanceMetrics: z.object({
    clicks: z.number(),
    uniqueVisitors: z.number(),
    conversionRate: z.number().min(0).max(100)
  }),
  ethicalScore: z.number().min(0).max(10).default(5)
});

// User Role Type
export const UserRoleSchema = z.enum([
  'admin', 
  'manager', 
  'analyst', 
  'viewer'
]);

// User Account Type
export const UserAccountSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: UserRoleSchema,
  lastLogin: z.date().optional(),
  isActive: z.boolean().default(true)
});

// Export Types
export type CompanyContact = z.infer<typeof CompanyContactSchema>;
export type EmailCampaign = z.infer<typeof EmailCampaignSchema>;
export type AffiliateLink = z.infer<typeof AffiliateLinkSchema>;
export type UserRole = z.infer<typeof UserRoleSchema>;
export type UserAccount = z.infer<typeof UserAccountSchema>;
