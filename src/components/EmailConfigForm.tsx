import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { EmailConfigSchema } from '@/lib/validations';
import { emailService } from '@/lib/api';

export default function EmailConfigForm() {
  const { 
    register, 
    handleSubmit, 
    formState: { errors }, 
    reset 
  } = useForm({
    resolver: zodResolver(EmailConfigSchema)
  });

  const onSubmit = async (data) => {
    try {
      await emailService.configureSmtp(data);
      alert('Email configuration saved successfully!');
      reset();
    } catch (error) {
      alert('Failed to save email configuration');
    }
  };

  return (
    <form 
      onSubmit={handleSubmit(onSubmit)} 
      className="bg-white p-6 rounded-lg shadow-md space-y-4"
    >
      <h2 className="text-2xl font-semibold text-wellconnect-secondary mb-4">
        Email SMTP Configuration
      </h2>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          SMTP Host
        </label>
        <input 
          {...register('smtpHost')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wellconnect-primary"
        />
        {errors.smtpHost && (
          <p className="text-red-500 text-sm">
            {errors.smtpHost.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          SMTP Port
        </label>
        <input 
          type="number"
          {...register('smtpPort', { valueAsNumber: true })}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wellconnect-primary"
        />
        {errors.smtpPort && (
          <p className="text-red-500 text-sm">
            {errors.smtpPort.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Username
        </label>
        <input 
          {...register('username')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wellconnect-primary"
        />
        {errors.username && (
          <p className="text-red-500 text-sm">
            {errors.username.message}
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input 
          type="password"
          {...register('password')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wellconnect-primary"
        />
        {errors.password && (
          <p className="text-red-500 text-sm">
            {errors.password.message}
          </p>
        )}
      </div>

      <div className="flex items-center">
        <input 
          type="checkbox"
          {...register('useTLS')}
          className="h-4 w-4 text-wellconnect-primary focus:ring-wellconnect-primary border-gray-300 rounded"
        />
        <label className="ml-2 block text-sm text-gray-900">
          Use TLS
        </label>
      </div>

      <button 
        type="submit" 
        className="w-full bg-wellconnect-primary text-white py-2 rounded-md hover:bg-blue-600 transition-colors"
      >
        Save Email Configuration
      </button>
    </form>
  );
}
