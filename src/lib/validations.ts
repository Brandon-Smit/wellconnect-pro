import * as z from 'zod';

export const AffiliateLinkSchema = z.object({
  companyName: z.string().min(2, "Company name must be at least 2 characters"),
  contactEmail: z.string().email("Invalid email address"),
  referralLink: z.string().url("Must be a valid URL"),
  description: z.string().optional(),
});

export const EmailConfigSchema = z.object({
  smtpHost: z.string().min(1, "SMTP Host is required"),
  smtpPort: z.number().min(1, "SMTP Port is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  useTLS: z.boolean().default(true),
});
