import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AffiliateLinkSchema } from '@/lib/validations';
import { affiliateService } from '@/lib/api';

export default function AffiliateLinkForm() {
  const { 
    register, 
    handleSubmit, 
    formState: { errors }, 
    reset 
  } = useForm({
    resolver: zodResolver(AffiliateLinkSchema)
  });

  const onSubmit = async (data) => {
    try {
      await affiliateService.createLink(data);
      alert('Affiliate link created successfully!');
      reset();
    } catch (error) {
      alert('Failed to create affiliate link');
    }
  };

  return (
    <form 
      onSubmit={handleSubmit(onSubmit)} 
      className="bg-white p-6 rounded-lg shadow-md space-y-4"
    >
      <h2 className="text-2xl font-semibold text-wellconnect-secondary mb-4">
        Create Affiliate Link
      </h2>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Company Name
        </label>
        <input 
          {...register('companyName')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wellconnect-primary"
        />
        {errors.companyName && (
          <p className="text-red-500 text-sm">
            {errors.companyName.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Contact Email
        </label>
        <input 
          type="email"
          {...register('contactEmail')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wellconnect-primary"
        />
        {errors.contactEmail && (
          <p className="text-red-500 text-sm">
            {errors.contactEmail.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Referral Link
        </label>
        <input 
          type="url"
          {...register('referralLink')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wellconnect-primary"
        />
        {errors.referralLink && (
          <p className="text-red-500 text-sm">
            {errors.referralLink.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Description (Optional)
        </label>
        <textarea 
          {...register('description')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wellconnect-primary"
        />
      </div>

      <button 
        type="submit" 
        className="w-full bg-wellconnect-primary text-white py-2 rounded-md hover:bg-blue-600 transition-colors"
      >
        Create Affiliate Link
      </button>
    </form>
  );
}
