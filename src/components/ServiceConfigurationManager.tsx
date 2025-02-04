import React, { useState, useCallback } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Configuration schemas for different service types
const AIServiceConfigSchema = z.object({
  provider: z.enum(['mistral', 'openai', 'huggingface', 'custom']),
  apiKey: z.string().optional(),
  customEndpoint: z.string().url().optional(),
  model: z.string().optional()
});

const EmailServiceConfigSchema = z.object({
  provider: z.enum(['sendgrid', 'mailgun', 'postfix', 'custom']),
  apiKey: z.string().optional(),
  smtpHost: z.string().optional(),
  smtpPort: z.number().optional(),
  username: z.string().optional(),
  password: z.string().optional()
});

const DatabaseConfigSchema = z.object({
  type: z.enum(['sqlite', 'postgresql', 'mongodb', 'custom']),
  connectionString: z.string().optional(),
  host: z.string().optional(),
  port: z.number().optional(),
  username: z.string().optional(),
  password: z.string().optional()
});

const AnalyticsConfigSchema = z.object({
  provider: z.enum(['plausible', 'mixpanel', 'custom']),
  apiKey: z.string().optional(),
  selfHostedUrl: z.string().url().optional()
});

const ServiceConfigSchema = z.object({
  aiService: AIServiceConfigSchema,
  emailService: EmailServiceConfigSchema,
  database: DatabaseConfigSchema,
  analytics: AnalyticsConfigSchema
});

type ServiceConfig = z.infer<typeof ServiceConfigSchema>;

export default function ServiceConfigurationManager() {
  const [serviceConfig, setServiceConfig] = useState<ServiceConfig>({
    aiService: { provider: 'mistral' },
    emailService: { provider: 'sendgrid' },
    database: { type: 'sqlite' },
    analytics: { provider: 'plausible' }
  });

  const { register, handleSubmit, formState: { errors } } = useForm<ServiceConfig>({
    resolver: zodResolver(ServiceConfigSchema),
    defaultValues: serviceConfig
  });

  const onSubmit = useCallback((data: ServiceConfig) => {
    // Validate and save configuration
    setServiceConfig(data);
    
    // Optional: Send configuration to backend for validation and storage
    try {
      // Placeholder for backend configuration update
      // configService.updateServiceConfiguration(data);
      alert('Service configuration updated successfully!');
    } catch (error) {
      console.error('Configuration update failed', error);
      alert('Failed to update configuration');
    }
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md space-y-6">
      <h2 className="text-2xl font-semibold text-wellconnect-secondary mb-4">
        Service Configuration
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* AI Service Configuration */}
        <div className="border-b pb-4">
          <h3 className="text-lg font-medium mb-3">AI Service</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Provider
              </label>
              <select 
                {...register('aiService.provider')}
                className="mt-1 block w-full rounded-md border-gray-300"
              >
                {['mistral', 'openai', 'huggingface', 'custom'].map(provider => (
                  <option key={provider} value={provider}>
                    {provider.charAt(0).toUpperCase() + provider.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                API Key (Optional)
              </label>
              <input 
                type="password"
                {...register('aiService.apiKey')}
                className="mt-1 block w-full rounded-md border-gray-300"
              />
            </div>
          </div>
        </div>

        {/* Similar sections for Email, Database, Analytics */}
        {/* ... (other service configuration sections) ... */}

        <div className="flex justify-end">
          <button 
            type="submit" 
            className="bg-wellconnect-primary text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
