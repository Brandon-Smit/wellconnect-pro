import { z } from 'zod';

// Industry Types
export const IndustryTypes = [
  'technology', 
  'healthcare', 
  'finance', 
  'education', 
  'consulting', 
  'manufacturing', 
  'retail', 
  'nonprofit', 
  'hospitality', 
  'government'
] as const;

// Company Size Types
export const CompanySizeTypes = [
  'startup', 
  'small', 
  'medium', 
  'large', 
  'enterprise'
] as const;

// Content Type Schema
export const ContentTypeSchema = z.enum([
  'wellness', 
  'mental-health', 
  'professional-development', 
  'support-resources'
]);

// Marketing Campaign Input Schema
export const MarketingCampaignInputSchema = z.object({
  // Affiliate Link Details
  affiliateLink: z.string().url({
    message: "Must be a valid URL for the mental health service"
  }),
  
  // Company Information
  targetIndustry: z.enum(IndustryTypes, {
    errorMap: () => ({ message: "Invalid industry type" })
  }),
  companySize: z.enum(CompanySizeTypes, {
    errorMap: () => ({ message: "Invalid company size" })
  }),

  // Campaign Customization
  contentType: ContentTypeSchema.default('mental-health'),
  
  // Ethical and Compliance Settings
  ethicalGuidelines: z.boolean().default(true),
  
  // Optional Personalization
  companyName: z.string().optional(),
  specificChallenges: z.array(z.string()).optional(),
  
  // Contact Information
  contactEmail: z.string().email({
    message: "Must be a valid email for HR contact"
  }),
  contactName: z.string().optional(),
  
  // Campaign Tracking
  campaignId: z.string().uuid().optional(),
  
  // Performance Metrics Tracking
  trackingPreferences: z.object({
    enableDetailedTracking: z.boolean().default(true),
    trackOpenRate: z.boolean().default(true),
    trackClickRate: z.boolean().default(true)
  }).default({
    enableDetailedTracking: true,
    trackOpenRate: true,
    trackClickRate: true
  })
});

// Frontend Component Props Interface
export interface MarketingCampaignFormProps {
  onSubmit: (campaignData: z.infer<typeof MarketingCampaignInputSchema>) => Promise<void>;
  initialData?: Partial<z.infer<typeof MarketingCampaignInputSchema>>;
}

// Validation Utility
export function validateMarketingCampaignInput(
  input: unknown
): z.infer<typeof MarketingCampaignInputSchema> {
  return MarketingCampaignInputSchema.parse(input);
}

// Frontend Form Initial State
export const INITIAL_MARKETING_CAMPAIGN_STATE: Partial<z.infer<typeof MarketingCampaignInputSchema>> = {
  contentType: 'mental-health',
  ethicalGuidelines: true,
  trackingPreferences: {
    enableDetailedTracking: true,
    trackOpenRate: true,
    trackClickRate: true
  }
};

// Dropdown Options for Frontend
export const FRONTEND_DROPDOWN_OPTIONS = {
  industries: IndustryTypes.map(industry => ({
    value: industry,
    label: industry.charAt(0).toUpperCase() + industry.slice(1)
  })),
  companySizes: CompanySizeTypes.map(size => ({
    value: size,
    label: size.charAt(0).toUpperCase() + size.slice(1)
  })),
  contentTypes: [
    { value: 'wellness', label: 'Wellness' },
    { value: 'mental-health', label: 'Mental Health' },
    { value: 'professional-development', label: 'Professional Development' },
    { value: 'support-resources', label: 'Support Resources' }
  ]
};
