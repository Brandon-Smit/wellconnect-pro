import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const affiliateService = {
  createLink: async (linkData) => {
    try {
      const response = await apiClient.post('/affiliates', linkData);
      return response.data;
    } catch (error) {
      console.error('Error creating affiliate link:', error);
      throw error;
    }
  },

  getLinks: async () => {
    try {
      const response = await apiClient.get('/affiliates');
      return response.data;
    } catch (error) {
      console.error('Error fetching affiliate links:', error);
      throw error;
    }
  },
};

export const emailService = {
  configureSmtp: async (smtpConfig) => {
    try {
      const response = await apiClient.post('/email/config', smtpConfig);
      return response.data;
    } catch (error) {
      console.error('Error configuring email:', error);
      throw error;
    }
  },
};
