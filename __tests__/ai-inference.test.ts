import { aiInferenceService } from '@/lib/services/ai-inference';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AI Inference Service', () => {
  beforeEach(() => {
    process.env.HUGGING_FACE_API_KEY = 'test_api_key';
  });

  test('generates email content successfully', async () => {
    const mockResponse = {
      data: [{
        generated_text: `Subject: Mental Health Support for Modern Workplaces

Empowering your team's mental well-being is our top priority. We understand the challenges of maintaining mental health in a fast-paced work environment.

Take the first step towards a healthier workplace.`
      }]
    };

    mockedAxios.post.mockResolvedValue(mockResponse);

    const result = await aiInferenceService.generateEmailContent({
      industry: 'technology',
      companySize: 'medium',
      mentalHealthFocus: 'stress management'
    });

    expect(result.subject).toBeTruthy();
    expect(result.body).toBeTruthy();
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('gpt2'),
      expect.any(Object),
      expect.any(Object)
    );
  });

  test('throws error for invalid input', async () => {
    await expect(aiInferenceService.generateEmailContent({
      // @ts-ignore
      industry: '',
      companySize: 'medium'
    })).rejects.toThrow();
  });
});
