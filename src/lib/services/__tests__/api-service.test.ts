import { fetchSystemConfiguration, updateSystemConfiguration } from '../api-service';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('API Service', () => {
  const mockConfig = {
    emailTemplates: {
      hrOutreach: 'Sample HR Outreach Template',
      mentalHealthAwareness: 'Mental Health Awareness Template'
    },
    affiliateSettings: {
      commissionRate: 0.1,
      partnerIds: ['partner1', 'partner2']
    }
  };

  beforeEach(() => {
    mockedAxios.get.mockClear();
    mockedAxios.post.mockClear();
  });

  describe('fetchSystemConfiguration', () => {
    it('fetches system configuration successfully', async () => {
      mockedAxios.get.mockResolvedValue({ data: mockConfig });

      const result = await fetchSystemConfiguration();
      
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/system-configuration');
      expect(result).toEqual(mockConfig);
    });

    it('handles fetch configuration error', async () => {
      const errorMessage = 'Failed to fetch configuration';
      mockedAxios.get.mockRejectedValue(new Error(errorMessage));

      await expect(fetchSystemConfiguration()).rejects.toThrow(errorMessage);
    });
  });

  describe('updateSystemConfiguration', () => {
    it('updates system configuration successfully', async () => {
      mockedAxios.post.mockResolvedValue({ data: mockConfig });

      const result = await updateSystemConfiguration(mockConfig);
      
      expect(mockedAxios.post).toHaveBeenCalledWith('/api/system-configuration', mockConfig);
      expect(result).toEqual(mockConfig);
    });

    it('handles update configuration error', async () => {
      const errorMessage = 'Failed to update configuration';
      mockedAxios.post.mockRejectedValue(new Error(errorMessage));

      await expect(updateSystemConfiguration(mockConfig)).rejects.toThrow(errorMessage);
    });
  });
});
