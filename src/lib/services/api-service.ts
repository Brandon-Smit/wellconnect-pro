import axios from 'axios';
import { z } from 'zod';

// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

// Centralized error handling
class APIError extends Error {
  status?: number;
  
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'APIError';
    this.status = status;
  }
}

// Generic API service with comprehensive error handling and type safety
export class APIService {
  // Authentication Endpoints
  static async signUp(userData: {
    email: string;
    password: string;
    companyName?: string;
    role?: string;
  }) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/signup`, userData);
      return response.data;
    } catch (error: any) {
      throw new APIError(
        error.response?.data?.message || 'Signup failed', 
        error.response?.status
      );
    }
  }

  static async signIn(credentials: { email: string; password: string }) {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/signin`, credentials);
      return response.data;
    } catch (error: any) {
      throw new APIError(
        error.response?.data?.message || 'Login failed', 
        error.response?.status
      );
    }
  }

  // Email Campaign Endpoints
  static async createEmailCampaign(campaignData: {
    targetIndustry: string;
    companySize: 'small' | 'medium' | 'large';
    dailyEmailLimit: number;
    ethicalGuidelines: boolean;
  }) {
    try {
      const response = await axios.post(`${API_BASE_URL}/campaigns/email`, campaignData);
      return response.data;
    } catch (error: any) {
      throw new APIError(
        error.response?.data?.message || 'Campaign creation failed', 
        error.response?.status
      );
    }
  }

  static async getCampaignPerformance(campaignId: string) {
    try {
      const response = await axios.get(`${API_BASE_URL}/campaigns/${campaignId}/performance`);
      return response.data;
    } catch (error: any) {
      throw new APIError(
        error.response?.data?.message || 'Performance retrieval failed', 
        error.response?.status
      );
    }
  }

  // Affiliate Management Endpoints
  static async registerAffiliateLink(affiliateData: {
    url: string;
    industry: string;
    ethicalScore?: number;
  }) {
    try {
      const response = await axios.post(`${API_BASE_URL}/affiliates`, affiliateData);
      return response.data;
    } catch (error: any) {
      throw new APIError(
        error.response?.data?.message || 'Affiliate registration failed', 
        error.response?.status
      );
    }
  }

  // Compliance Endpoints
  static async checkComplianceStatus(emailContent: string) {
    try {
      const response = await axios.post(`${API_BASE_URL}/compliance/check`, { content: emailContent });
      return response.data;
    } catch (error: any) {
      throw new APIError(
        error.response?.data?.message || 'Compliance check failed', 
        error.response?.status
      );
    }
  }

  // Performance Analytics Endpoints
  static async getSystemPerformanceMetrics() {
    try {
      const response = await axios.get(`${API_BASE_URL}/performance/metrics`);
      return response.data;
    } catch (error: any) {
      throw new APIError(
        error.response?.data?.message || 'Performance metrics retrieval failed', 
        error.response?.status
      );
    }
  }

  // Configuration Management
  static async updateSystemConfiguration(config: Record<string, any>) {
    try {
      const response = await axios.put(`${API_BASE_URL}/config`, config);
      return response.data;
    } catch (error: any) {
      throw new APIError(
        error.response?.data?.message || 'Configuration update failed', 
        error.response?.status
      );
    }
  }

  // System-wide configuration update
  static async updateSystemConfigurationComprehensive(config: {
    organizationProfile: {
      name: string;
      industry: string;
      companySize: string;
      employeeWellnessBudget?: number;
    };
    emailConfiguration: {
      smtpProvider: string;
      apiKey?: string;
      dailyEmailLimit: number;
      emailTemplatePreference: string;
    };
    affiliateSettings: {
      mentalHealthServiceUrls: Array<{
        url: string;
        serviceName: string;
        ethicalScore?: number;
        specialization?: string;
      }>;
      commissionStructure: {
        baseRate: number;
        performanceBonus?: number;
      };
      targetIndustries: string[];
    };
    complianceSettings: {
      gdprCompliant: boolean;
      canSpamCompliant: boolean;
      privacyPolicyUrl?: string;
      consentManagement: {
        explicitConsent: boolean;
        optOutMechanism: boolean;
      };
    };
    hrTargeting: {
      targetCompanySizes: string[];
      targetCountries: string[];
      hrRoleFocus: string[];
    };
    aiConfiguration: {
      personalizedContentEnabled: boolean;
      mlModelTrainingUrls?: Array<{
        url: string;
        category: string;
      }>;
    };
  }) {
    try {
      const response = await axios.post('/api/system-configuration', config);
      return response.data;
    } catch (error: any) {
      throw new APIError(
        error.response?.data?.message || 'System configuration update failed', 
        error.response?.status
      );
    }
  }

  // Utility method for global error handling
  static handleError(error: unknown): never {
    if (error instanceof APIError) {
      console.error(`API Error (${error.status}):`, error.message);
      throw error;
    } else if (axios.isAxiosError(error)) {
      const apiError = new APIError(
        error.response?.data?.message || 'An unexpected error occurred',
        error.response?.status
      );
      console.error('Axios Error:', apiError);
      throw apiError;
    } else {
      const genericError = new APIError('An unknown error occurred');
      console.error('Unknown Error:', genericError);
      throw genericError;
    }
  }
}

// Export for use in components
export default APIService;
