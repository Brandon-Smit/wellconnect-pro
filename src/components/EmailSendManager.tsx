import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import APIService from '../lib/services/api-service';
import { useToast } from '@chakra-ui/react';
import { emailService } from '@/lib/api';
import { AffiliateEmailGenerationAgent } from '@/lib/agents/AffiliateEmailAgent';
import { emailDispatchModule } from '@/dispatch/emailDispatchModule';
import { EmailDiscoveryAgent } from '@/agents/emailDiscoveryAgent';

// Email send mode enum
enum EmailSendMode {
  MANUAL = 'manual',
  AUTONOMOUS = 'autonomous'
}

// Email send schema for validation
const EmailSendSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(10, 'Email body must be at least 10 characters'),
  campaignId: z.string().optional()
});

type EmailSendInput = z.infer<typeof EmailSendSchema>;

export default function EmailSendManager() {
  // Mode state
  const [sendMode, setSendMode] = useState<EmailSendMode>(EmailSendMode.MANUAL);
  const [isAutonomousMode, setIsAutonomousMode] = useState(false);
  
  // Current email state for manual mode
  const [currentEmail, setCurrentEmail] = useState<{
    to: string;
    subject: string;
    body: string;
    affiliateLink?: string;
  } | null>(null);

  // State management
  const [emailPreview, setEmailPreview] = useState<EmailSendInput | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Form management
  const { 
    register, 
    handleSubmit, 
    setValue,
    formState: { errors }, 
    reset 
  } = useForm<EmailSendInput>({
    resolver: zodResolver(EmailSendSchema)
  });

  const toast = useToast();

  // Compliance check before sending
  const checkComplianceAndSend = useCallback(async (data: EmailSendInput) => {
    try {
      // Validate email data
      const validatedData = EmailSendSchema.parse(data);
      
      // First, check compliance
      setIsLoading(true);
      const complianceResult = await APIService.checkComplianceStatus(validatedData.body);
      
      if (!complianceResult.isCompliant) {
        toast({
          title: 'Compliance Check Failed',
          description: complianceResult.reason,
          status: 'warning',
          duration: 5000,
          isClosable: true,
        });
        setIsLoading(false);
        return;
      }

      // If compliant, proceed with email campaign
      const campaignResult = await APIService.createEmailCampaign({
        targetIndustry: 'HR',
        companySize: 'medium',
        dailyEmailLimit: 50,
        ethicalGuidelines: true
      });

      // Send email with campaign tracking
      await APIService.sendEmail({
        ...validatedData,
        campaignId: campaignResult.campaignId
      });

      toast({
        title: 'Email Sent Successfully',
        description: 'Your email has been sent and tracked',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      // Centralized error handling
      APIService.handleError(error);
      
      toast({
        title: 'Email Send Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Generate alternative email
  const generateAlternativeEmail = useCallback(async () => {
    setIsGenerating(true);
    try {
      const emailAgent = new AffiliateEmailGenerationAgent();
      const generatedEmail = await emailAgent.generateEmail();
      
      // Update form with new email
      setValue('subject', generatedEmail.subject);
      setValue('body', generatedEmail.body);
      setEmailPreview(generatedEmail);
    } catch (error) {
      console.error('Failed to generate alternative email', error);
      alert('Failed to generate alternative email');
    } finally {
      setIsGenerating(false);
    }
  }, [setValue]);

  // Fetch next email draft in manual mode
  const fetchNextEmailDraft = async () => {
    setIsLoading(true);
    try {
      const discoveryAgent = new EmailDiscoveryAgent();
      const emailDraft = await discoveryAgent.generateEmailDraft();
      
      setCurrentEmail({
        to: emailDraft.to,
        subject: emailDraft.subject,
        body: emailDraft.body,
        affiliateLink: emailDraft.affiliateLink
      });
    } catch (error) {
      console.error('Failed to fetch email draft', error);
      alert('Failed to generate email draft');
    } finally {
      setIsLoading(false);
    }
  };

  // Send current email draft
  const sendCurrentEmailDraft = async () => {
    if (!currentEmail) return;

    setIsProcessing(true);
    try {
      await emailDispatchModule.sendSingleEmail({
        to: currentEmail.to,
        subject: currentEmail.subject,
        body: currentEmail.body,
        affiliateLink: currentEmail.affiliateLink
      });
      
      alert('Email sent successfully!');
      // Fetch next draft after sending
      await fetchNextEmailDraft();
    } catch (error) {
      console.error('Failed to send email', error);
      alert('Failed to send email');
    } finally {
      setIsProcessing(false);
    }
  };

  // Send email
  const onSubmit = async (data: EmailSendInput) => {
    try {
      await checkComplianceAndSend(data);
    } catch (error) {
      console.error('Failed to send email', error);
      alert('Failed to send email');
    }
  };

  // Toggle between autonomous and manual modes
  const toggleMode = () => {
    setIsAutonomousMode(!isAutonomousMode);
    setSendMode(isAutonomousMode ? EmailSendMode.MANUAL : EmailSendMode.AUTONOMOUS);
  };

  // Start autonomous or manual mode on component mount
  useEffect(() => {
    if (!isAutonomousMode) {
      fetchNextEmailDraft();
    } else {
      // Start autonomous email dispatch
      emailDispatchModule.startEmailCampaign();
    }

    // Cleanup function
    return () => {
      emailDispatchModule.stopEmailCampaign();
    };
  }, [isAutonomousMode]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-wellconnect-secondary">
          Email Send Manager
        </h2>
        <div className="flex items-center space-x-4">
          <span>
            Current Mode: {isAutonomousMode ? 'Autonomous' : sendMode.charAt(0).toUpperCase() + sendMode.slice(1)}
          </span>
          <button 
            onClick={toggleMode}
            className="bg-wellconnect-primary text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            Switch to {isAutonomousMode ? 'Manual' : 'Autonomous'}
          </button>
        </div>
      </div>

      {sendMode === EmailSendMode.MANUAL && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Recipient Email
            </label>
            <input 
              {...register('to')}
              placeholder="recipient@example.com"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wellconnect-primary"
            />
            {errors.to && (
              <p className="text-red-500 text-sm">
                {errors.to.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Subject
            </label>
            <input 
              {...register('subject')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wellconnect-primary"
            />
            {errors.subject && (
              <p className="text-red-500 text-sm">
                {errors.subject.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email Body
            </label>
            <textarea 
              {...register('body')}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-wellconnect-primary"
            />
            {errors.body && (
              <p className="text-red-500 text-sm">
                {errors.body.message}
              </p>
            )}
          </div>

          <div className="flex space-x-4">
            <button 
              type="submit" 
              className="flex-1 bg-wellconnect-primary text-white py-2 rounded-md hover:bg-blue-600 transition-colors"
            >
              Send Email
            </button>
            <button 
              type="button"
              onClick={generateAlternativeEmail}
              disabled={isGenerating}
              className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
            >
              {isGenerating ? 'Generating...' : 'Generate Alternative'}
            </button>
          </div>
        </form>
      )}

      {isAutonomousMode && (
        <div className="space-y-4">
          {currentEmail && (
            <div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient
                </label>
                <input 
                  value={currentEmail.to}
                  readOnly
                  className="block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <input 
                  value={currentEmail.subject}
                  readOnly
                  className="block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Body
                </label>
                <textarea 
                  value={currentEmail.body}
                  readOnly
                  rows={6}
                  className="block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm"
                />
              </div>

              <div className="flex space-x-4">
                <button 
                  onClick={fetchNextEmailDraft}
                  disabled={isLoading}
                  className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-md hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Generating...' : 'Next Draft'}
                </button>
                <button 
                  onClick={sendCurrentEmailDraft}
                  disabled={isProcessing || !currentEmail}
                  className="flex-1 bg-wellconnect-primary text-white py-2 rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
