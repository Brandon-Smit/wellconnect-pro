export interface CompanyContact {
  id: string;
  email: string;
  companyName: string;
  companySize: number;
  industry: string;
  role: string;
  contactName?: string;
  country?: string;
  quality: number; // Contact quality score 0-100
  source?: 'linkedin' | 'crunchbase' | 'direct' | 'other';
  lastVerified?: Date;
  tags?: string[];
}
