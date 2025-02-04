import React, { useState } from 'react';
import { z } from 'zod';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Comprehensive Input Validation Schema
const SystemSetupSchema = z.object({
  // User Account Setup
  userAccount: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])/, 'Password must include letters, numbers, and special characters'),
    fullName: z.string().min(2, 'Full name is required')
  }),

  // Affiliate Link Variations
  affiliateLinkVariations: z.array(z.object({
    baseUrl: z.string().url('Invalid URL'),
    trackingParameters: z.array(z.object({
      key: z.string(),
      value: z.string()
    })).optional(),
    description: z.string().optional()
  })).min(1, 'At least one affiliate link is required'),

  // URL Uploads for Machine Learning
  serviceUrls: z.array(z.object({
    url: z.string().url('Invalid URL'),
    category: z.enum([
      'mental_health', 
      'wellness', 
      'corporate_services', 
      'employee_support'
    ]),
    priority: z.number().min(1).max(10).optional()
  })).min(1, 'At least one service URL is required'),

  // Country Inputs for HR Department Targeting
  targetCountries: z.array(z.object({
    countryCode: z.string().length(2, 'Use 2-letter country code'),
    industryFocus: z.array(z.string()).optional(),
    companySizeTarget: z.enum(['small', 'medium', 'large', 'all']).optional()
  })).min(1, 'Select at least one target country')
});

type SystemSetupInputs = z.infer<typeof SystemSetupSchema>;

export const SystemSetupInterface: React.FC = () => {
  const [affiliateLinks, setAffiliateLinks] = useState<SystemSetupInputs['affiliateLinkVariations']>([
    { baseUrl: '', trackingParameters: [], description: '' }
  ]);

  const [serviceUrls, setServiceUrls] = useState<SystemSetupInputs['serviceUrls']>([
    { url: '', category: 'mental_health', priority: 5 }
  ]);

  const [targetCountries, setTargetCountries] = useState<SystemSetupInputs['targetCountries']>([
    { countryCode: '', industryFocus: [], companySizeTarget: 'all' }
  ]);

  const { 
    control, 
    register, 
    handleSubmit, 
    formState: { errors, isValid }, 
    reset 
  } = useForm<SystemSetupInputs>({
    resolver: zodResolver(SystemSetupSchema),
    mode: 'onChange'
  });

  const onSubmit = async (data: SystemSetupInputs) => {
    try {
      console.log('System Setup Submission:', data);
      // Implement submission logic
      // Potential API calls to backend services
      reset();
    } catch (error) {
      console.error('System Setup Error', error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white shadow-2xl rounded-xl">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">
        WellConnect Pro: System Configuration
      </h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* User Account Setup Section */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            User Account Setup
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                {...register('userAccount.fullName')}
                type="text"
                placeholder="John Doe"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              />
              {errors.userAccount?.fullName && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.userAccount.fullName.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                {...register('userAccount.email')}
                type="email"
                placeholder="john.doe@example.com"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              />
              {errors.userAccount?.email && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.userAccount.email.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                {...register('userAccount.password')}
                type="password"
                placeholder="Strong password"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              />
              {errors.userAccount?.password && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.userAccount.password.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Affiliate Link Variations Section */}
        <div className="bg-blue-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            Affiliate Link Configurations
          </h2>
          {affiliateLinks.map((_, index) => (
            <div key={index} className="mb-4 p-4 border rounded-lg bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Base Affiliate URL
                  </label>
                  <input
                    {...register(`affiliateLinkVariations.${index}.baseUrl`)}
                    type="url"
                    placeholder="https://mentalhealth-service.com/affiliate"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <input
                    {...register(`affiliateLinkVariations.${index}.description`)}
                    type="text"
                    placeholder="Corporate mental health package"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Service URLs for Machine Learning */}
        <div className="bg-green-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            Service URLs for ML Training
          </h2>
          {serviceUrls.map((_, index) => (
            <div key={index} className="mb-4 p-4 border rounded-lg bg-white">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Service URL
                  </label>
                  <input
                    {...register(`serviceUrls.${index}.url`)}
                    type="url"
                    placeholder="https://example-mental-health-service.com"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <Controller
                    name={`serviceUrls.${index}.category`}
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                      >
                        <option value="mental_health">Mental Health</option>
                        <option value="wellness">Wellness</option>
                        <option value="corporate_services">Corporate Services</option>
                        <option value="employee_support">Employee Support</option>
                      </select>
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Priority (1-10)
                  </label>
                  <input
                    {...register(`serviceUrls.${index}.priority`, { 
                      setValueAs: v => v ? parseInt(v, 10) : undefined 
                    })}
                    type="number"
                    min="1"
                    max="10"
                    placeholder="ML Training Priority"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Country Targeting Section */}
        <div className="bg-purple-50 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            HR Department Targeting
          </h2>
          {targetCountries.map((_, index) => (
            <div key={index} className="mb-4 p-4 border rounded-lg bg-white">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Country Code
                  </label>
                  <input
                    {...register(`targetCountries.${index}.countryCode`)}
                    type="text"
                    placeholder="US"
                    maxLength={2}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Company Size Target
                  </label>
                  <Controller
                    name={`targetCountries.${index}.companySizeTarget`}
                    control={control}
                    render={({ field }) => (
                      <select
                        {...field}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                      >
                        <option value="all">All Sizes</option>
                        <option value="small">Small Companies</option>
                        <option value="medium">Medium Companies</option>
                        <option value="large">Large Companies</option>
                      </select>
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Industry Focus
                  </label>
                  <input
                    {...register(`targetCountries.${index}.industryFocus.0`)}
                    type="text"
                    placeholder="Technology, Healthcare"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Submit Button */}
        <div className="text-center">
          <button
            type="submit"
            disabled={!isValid}
            className={`px-8 py-3 rounded-lg text-white font-bold transition-all ${
              isValid 
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-lg' 
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            Configure System
          </button>
        </div>
      </form>
    </div>
  );
};

export default SystemSetupInterface;
