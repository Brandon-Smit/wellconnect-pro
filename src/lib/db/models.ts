import mongoose from 'mongoose';
import { z } from 'zod';

// Zod Schemas for Validation
export const EmailCampaignSchema = z.object({
  name: z.string().min(3, "Campaign name must be at least 3 characters"),
  target: z.string().email("Invalid target email"),
  status: z.enum(['draft', 'sent', 'completed']).default('draft'),
  content: z.string().min(10, "Campaign content too short"),
  sentAt: z.date().optional(),
  performanceMetrics: z.object({
    openRate: z.number().min(0).max(100).optional(),
    clickRate: z.number().min(0).max(100).optional()
  }).optional()
});

export const ComplianceLogSchema = z.object({
  campaignId: z.string(),
  timestamp: z.date(),
  action: z.enum(['sent', 'blocked', 'opted_out']),
  reason: z.string().optional()
});

// Mongoose Schemas
const EmailCampaignMongoSchema = new mongoose.Schema({
  name: { type: String, required: true },
  target: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['draft', 'sent', 'completed'], 
    default: 'draft' 
  },
  content: { type: String, required: true },
  sentAt: { type: Date },
  performanceMetrics: {
    openRate: { type: Number, min: 0, max: 100 },
    clickRate: { type: Number, min: 0, max: 100 }
  }
}, { timestamps: true });

const ComplianceLogMongoSchema = new mongoose.Schema({
  campaignId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  action: { 
    type: String, 
    enum: ['sent', 'blocked', 'opted_out'], 
    required: true 
  },
  reason: { type: String }
}, { timestamps: true });

export const EmailCampaign = mongoose.models.EmailCampaign || mongoose.model('EmailCampaign', EmailCampaignMongoSchema);
export const ComplianceLog = mongoose.models.ComplianceLog || mongoose.model('ComplianceLog', ComplianceLogMongoSchema);
