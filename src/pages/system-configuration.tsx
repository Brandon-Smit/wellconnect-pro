import React, { useState } from 'react';
import { 
  Box, 
  VStack, 
  Heading, 
  FormControl, 
  FormLabel, 
  Input, 
  Button, 
  Select,
  Textarea,
  Checkbox,
  CheckboxGroup,
  Stack,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Tooltip,
  useToast
} from '@chakra-ui/react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import APIService from '@/lib/services/api-service';

// Comprehensive System Configuration Schema
const SystemConfigurationSchema = z.object({
  // Organization Details
  organizationProfile: z.object({
    name: z.string().min(2, 'Organization name is required'),
    industry: z.enum([
      'technology', 'healthcare', 'finance', 
      'education', 'manufacturing', 'consulting', 
      'other'
    ]),
    companySize: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']),
    employeeWellnessBudget: z.number().min(0).optional()
  }),

  // Email and Communication Configuration
  emailConfiguration: z.object({
    smtpProvider: z.enum(['smtp', 'sendgrid', 'mailgun', 'amazon-ses']),
    apiKey: z.string().optional(),
    dailyEmailLimit: z.number().min(1).max(1000).default(50),
    emailTemplatePreference: z.enum([
      'professional', 
      'empathetic', 
      'direct', 
      'supportive'
    ]).default('supportive')
  }),

  // Affiliate and Partnership Configuration
  affiliateSettings: z.object({
    mentalHealthServiceUrls: z.array(z.object({
      url: z.string().url('Invalid URL'),
      serviceName: z.string(),
      ethicalScore: z.number().min(0).max(10).optional(),
      specialization: z.string().optional()
    })).min(1, 'At least one mental health service URL is required'),
    commissionStructure: z.object({
      baseRate: z.number().min(0).max(50),
      performanceBonus: z.number().min(0).max(20).optional()
    }),
    targetIndustries: z.array(z.string()).min(1, 'Select at least one target industry')
  }),

  // Compliance and Ethical Guidelines
  complianceSettings: z.object({
    gdprCompliant: z.boolean().default(true),
    canSpamCompliant: z.boolean().default(true),
    privacyPolicyUrl: z.string().url('Invalid URL').optional(),
    consentManagement: z.object({
      explicitConsent: z.boolean().default(true),
      optOutMechanism: z.boolean().default(true)
    })
  }),

  // HR Department Targeting
  hrTargeting: z.object({
    targetCompanySizes: z.array(z.enum(['startup', 'small', 'medium', 'large', 'enterprise'])),
    targetCountries: z.array(z.string()).min(1, 'Select at least one country'),
    hrRoleFocus: z.array(z.enum([
      'HR Director', 
      'Chief People Officer', 
      'Wellness Coordinator', 
      'Employee Experience Manager'
    ])).min(1, 'Select at least one HR role')
  }),

  // Machine Learning and Personalization
  aiConfiguration: z.object({
    personalizedContentEnabled: z.boolean().default(true),
    mlModelTrainingUrls: z.array(z.object({
      url: z.string().url('Invalid URL'),
      category: z.enum([
        'mental_health_resources', 
        'workplace_wellness', 
        'employee_support'
      ])
    })).optional()
  })
});

type SystemConfigurationInputs = z.infer<typeof SystemConfigurationSchema>;

const SystemConfigurationPage: React.FC = () => {
  const toast = useToast();
  const { control, handleSubmit, formState: { errors } } = useForm<SystemConfigurationInputs>({
    resolver: zodResolver(SystemConfigurationSchema),
    defaultValues: {
      organizationProfile: {
        industry: 'technology',
        companySize: 'medium'
      },
      emailConfiguration: {
        smtpProvider: 'smtp',
        dailyEmailLimit: 50,
        emailTemplatePreference: 'supportive'
      },
      affiliateSettings: {
        mentalHealthServiceUrls: [{ url: '', serviceName: '' }],
        commissionStructure: {
          baseRate: 10
        },
        targetIndustries: ['healthcare']
      },
      complianceSettings: {
        gdprCompliant: true,
        canSpamCompliant: true,
        consentManagement: {
          explicitConsent: true,
          optOutMechanism: true
        }
      },
      hrTargeting: {
        targetCompanySizes: ['medium'],
        targetCountries: ['US'],
        hrRoleFocus: ['HR Director']
      },
      aiConfiguration: {
        personalizedContentEnabled: true
      }
    }
  });

  const onSubmit = async (data: SystemConfigurationInputs) => {
    try {
      // Comprehensive system configuration submission
      await APIService.updateSystemConfiguration(data);
      
      toast({
        title: "System Configuration Updated",
        description: "Your ethical mental health marketing system is now configured.",
        status: "success",
        duration: 5000,
        isClosable: true
      });
    } catch (error) {
      toast({
        title: "Configuration Error",
        description: "Unable to save system configuration",
        status: "error",
        duration: 5000,
        isClosable: true
      });
    }
  };

  return (
    <Box maxWidth="800px" margin="auto" p={6}>
      <Heading mb={6} textAlign="center">
        WellConnect Pro: System Configuration
      </Heading>

      <form onSubmit={handleSubmit(onSubmit)}>
        <VStack spacing={8}>
          {/* Organization Profile Section */}
          <Box width="full" p={4} borderWidth={1} borderRadius="lg">
            <Heading size="md" mb={4}>Organization Profile</Heading>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>Organization Name</FormLabel>
                <Controller
                  name="organizationProfile.name"
                  control={control}
                  render={({ field }) => (
                    <Input {...field} placeholder="Your Organization Name" />
                  )}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Industry</FormLabel>
                <Controller
                  name="organizationProfile.industry"
                  control={control}
                  render={({ field }) => (
                    <Select {...field}>
                      <option value="technology">Technology</option>
                      <option value="healthcare">Healthcare</option>
                      <option value="finance">Finance</option>
                      <option value="education">Education</option>
                      <option value="manufacturing">Manufacturing</option>
                      <option value="consulting">Consulting</option>
                      <option value="other">Other</option>
                    </Select>
                  )}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Company Size</FormLabel>
                <Controller
                  name="organizationProfile.companySize"
                  control={control}
                  render={({ field }) => (
                    <Select {...field}>
                      <option value="startup">Startup</option>
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                      <option value="enterprise">Enterprise</option>
                    </Select>
                  )}
                />
              </FormControl>
            </Stack>
          </Box>

          {/* Email Configuration Section */}
          <Box width="full" p={4} borderWidth={1} borderRadius="lg">
            <Heading size="md" mb={4}>Email Configuration</Heading>
            <Stack spacing={4}>
              <FormControl>
                <FormLabel>SMTP Provider</FormLabel>
                <Controller
                  name="emailConfiguration.smtpProvider"
                  control={control}
                  render={({ field }) => (
                    <Select {...field}>
                      <option value="smtp">Standard SMTP</option>
                      <option value="sendgrid">SendGrid</option>
                      <option value="mailgun">Mailgun</option>
                      <option value="amazon-ses">Amazon SES</option>
                    </Select>
                  )}
                />
              </FormControl>

              <FormControl>
                <FormLabel>Daily Email Limit</FormLabel>
                <Controller
                  name="emailConfiguration.dailyEmailLimit"
                  control={control}
                  render={({ field }) => (
                    <NumberInput 
                      {...field} 
                      min={1} 
                      max={1000}
                      onChange={(_, value) => field.onChange(value)}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                  )}
                />
              </FormControl>
            </Stack>
          </Box>

          {/* More sections would follow similar patterns */}
          
          <Button 
            type="submit" 
            colorScheme="blue" 
            width="full"
          >
            Save System Configuration
          </Button>
        </VStack>
      </form>
    </Box>
  );
};

export default SystemConfigurationPage;
