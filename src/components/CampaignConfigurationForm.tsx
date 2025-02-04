import React, { useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Box, 
  Button, 
  FormControl, 
  FormLabel, 
  Input, 
  VStack, 
  HStack, 
  Select, 
  Textarea, 
  Heading, 
  Tabs, 
  TabList, 
  TabPanels, 
  Tab, 
  TabPanel,
  Alert,
  AlertIcon
} from '@chakra-ui/react';
import { campaignExecutionManager } from '../services/campaignExecutionManager';
import { affiliateLinkOptimizer } from '../services/affiliateLinkOptimizer';
import { countries } from '../utils/countryData';

// Comprehensive Configuration Schema
const CampaignConfigSchema = z.object({
  // Affiliate Link Configuration
  affiliateLink: z.object({
    originalLink: z.string().url('Invalid affiliate link'),
    variations: z.array(z.object({
      url: z.string().url('Invalid URL variation'),
      type: z.enum(['default', 'tracking', 'campaign', 'source']),
      parameters: z.record(z.string(), z.string()).optional()
    })).min(1, 'At least one link variation is required')
  }),

  // Service URL Configuration
  serviceUrl: z.string().url('Invalid service URL'),

  // Targeting Configuration
  targeting: z.object({
    countries: z.array(z.object({
      countryCode: z.string().length(2),
      industryFocus: z.array(z.string()).optional(),
      companySizeTarget: z.enum(['small', 'medium', 'large', 'all']).optional()
    })).min(1, 'Select at least one country')
  }),

  // Email Platform Configuration
  emailPlatform: z.object({
    provider: z.enum([
      'smtp', 
      'sendgrid', 
      'mailgun', 
      'amazon_ses', 
      'zoho_mail',  
      'custom'
    ]),
    configuration: z.object({
      host: z.string().optional(),
      port: z.number().optional(),
      username: z.string().optional(),
      password: z.string().optional(),
      apiKey: z.string().optional(),
      region: z.string().optional(),
      zohoMailDomain: z.string().optional()
    }),
    dailyEmailLimit: z.number().min(1).max(50).default(50)
  })
});

export const CampaignConfigurationForm: React.FC = () => {
  const [configurationStep, setConfigurationStep] = useState(0);
  const [configurationErrors, setConfigurationErrors] = useState<string[]>([]);

  const { 
    control, 
    handleSubmit, 
    formState: { errors }, 
    trigger,
    getValues
  } = useForm({
    resolver: zodResolver(CampaignConfigSchema),
    mode: 'onChange'
  });

  const handleConfigurationSubmit = useCallback(async (data: z.infer<typeof CampaignConfigSchema>) => {
    try {
      // Clear previous errors
      setConfigurationErrors([]);

      // 1. Add Affiliate Link Variations
      const affiliateLinkConfig = affiliateLinkOptimizer.addAffiliateLinkConfiguration(
        data.affiliateLink.originalLink,
        data.serviceUrl,
        data.affiliateLink.variations
      );

      // 2. Create Campaign
      const campaign = campaignExecutionManager.createCampaign({
        affiliateLinkId: affiliateLinkConfig.id,
        serviceUrl: data.serviceUrl,
        targetCountries: data.targeting.countries,
        dailyEmailLimit: data.emailPlatform.dailyEmailLimit
      });

      // Optional: Configure email platform settings
      // This would typically involve setting up the email transport 
      // in the campaignExecutionManager based on the selected provider

      // Success notification or redirect
      console.log('Campaign Configured Successfully', campaign);
    } catch (error) {
      // Handle configuration errors
      const errorMessages = error instanceof Error 
        ? [error.message] 
        : ['An unexpected error occurred'];
      
      setConfigurationErrors(errorMessages);
    }
  }, []);

  const renderAffiliateLinksSection = () => (
    <VStack spacing={4} align="stretch">
      <Heading size="md">Affiliate Link Configuration</Heading>
      
      <Controller
        name="affiliateLink.originalLink"
        control={control}
        render={({ field }) => (
          <FormControl isInvalid={!!errors.affiliateLink?.originalLink}>
            <FormLabel>Original Affiliate Link</FormLabel>
            <Input 
              {...field} 
              placeholder="https://mentalhealth-service.com/affiliate" 
            />
          </FormControl>
        )}
      />

      <Controller
        name="affiliateLink.variations"
        control={control}
        render={({ field }) => (
          <FormControl>
            <FormLabel>Link Variations</FormLabel>
            <VStack>
              {field.value?.map((variation, index) => (
                <HStack key={index} width="full">
                  <Select 
                    placeholder="Variation Type"
                    value={variation.type}
                    onChange={(e) => {
                      const newVariations = [...field.value];
                      newVariations[index].type = e.target.value;
                      field.onChange(newVariations);
                    }}
                  >
                    <option value="default">Default</option>
                    <option value="tracking">Tracking</option>
                    <option value="campaign">Campaign</option>
                    <option value="source">Source</option>
                  </Select>
                  <Input 
                    placeholder="Variation URL" 
                    value={variation.url}
                    onChange={(e) => {
                      const newVariations = [...field.value];
                      newVariations[index].url = e.target.value;
                      field.onChange(newVariations);
                    }}
                  />
                </HStack>
              ))}
              <Button 
                onClick={() => {
                  const currentVariations = field.value || [];
                  field.onChange([
                    ...currentVariations, 
                    { url: '', type: 'default' }
                  ]);
                }}
              >
                Add Variation
              </Button>
            </VStack>
          </FormControl>
        )}
      />
    </VStack>
  );

  const renderTargetingSection = () => (
    <VStack spacing={4} align="stretch">
      <Heading size="md">Targeting Configuration</Heading>
      
      <Controller
        name="targeting.countries"
        control={control}
        render={({ field }) => (
          <FormControl>
            <FormLabel>Target Countries</FormLabel>
            <Select 
              multiple 
              placeholder="Select Countries"
              onChange={(e) => {
                const selectedCountries = Array.from(e.target.selectedOptions).map(
                  option => ({
                    countryCode: option.value,
                    industryFocus: [], // Can be expanded later
                    companySizeTarget: 'all'
                  })
                );
                field.onChange(selectedCountries);
              }}
            >
              {countries.map(country => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </Select>
          </FormControl>
        )}
      />
    </VStack>
  );

  const renderEmailPlatformSection = () => (
    <VStack spacing={4} align="stretch">
      <Heading size="md">Email Platform Configuration</Heading>
      
      <Controller
        name="emailPlatform.provider"
        control={control}
        render={({ field }) => (
          <FormControl>
            <FormLabel>Email Service Provider</FormLabel>
            <Select 
              {...field}
              placeholder="Select Email Provider"
            >
              <option value="smtp">SMTP</option>
              <option value="sendgrid">SendGrid</option>
              <option value="mailgun">Mailgun</option>
              <option value="amazon_ses">Amazon SES</option>
              <option value="zoho_mail">Zoho Mail</option>
              <option value="custom">Custom</option>
            </Select>
          </FormControl>
        )}
      />

      <Controller
        name="emailPlatform.configuration"
        control={control}
        render={({ field }) => (
          <VStack spacing={3}>
            {field.value?.host && (
              <FormControl>
                <FormLabel>SMTP Host</FormLabel>
                <Input 
                  placeholder="smtp.example.com"
                  value={field.value.host}
                  onChange={(e) => {
                    field.onChange({
                      ...field.value,
                      host: e.target.value
                    });
                  }}
                />
              </FormControl>
            )}
            
            {field.value?.apiKey && (
              <FormControl>
                <FormLabel>API Key</FormLabel>
                <Input 
                  type="password"
                  placeholder="Enter API Key"
                  value={field.value.apiKey}
                  onChange={(e) => {
                    field.onChange({
                      ...field.value,
                      apiKey: e.target.value
                    });
                  }}
                />
              </FormControl>
            )}
            
            {field.value?.provider === 'zoho_mail' && (
              <>
                <FormControl>
                  <FormLabel>Zoho Mail Domain</FormLabel>
                  <Input 
                    placeholder="yourdomain.com"
                    value={field.value.zohoMailDomain}
                    onChange={(e) => {
                      field.onChange({
                        ...field.value,
                        zohoMailDomain: e.target.value
                      });
                    }}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Zoho Mail Username</FormLabel>
                  <Input 
                    placeholder="your_email@yourdomain.com"
                    value={field.value.username}
                    onChange={(e) => {
                      field.onChange({
                        ...field.value,
                        username: e.target.value
                      });
                    }}
                  />
                </FormControl>
                
                <FormControl>
                  <FormLabel>Zoho Mail App Password</FormLabel>
                  <Input 
                    type="password"
                    placeholder="Enter Zoho Mail App Password"
                    value={field.value.password}
                    onChange={(e) => {
                      field.onChange({
                        ...field.value,
                        password: e.target.value
                      });
                    }}
                  />
                </FormControl>
              </>
            )}
          </VStack>
        )}
      />

      <Controller
        name="emailPlatform.dailyEmailLimit"
        control={control}
        render={({ field }) => (
          <FormControl>
            <FormLabel>Daily Email Limit</FormLabel>
            <Input 
              type="number"
              min={1}
              max={50}
              {...field}
              onChange={(e) => field.onChange(Number(e.target.value))}
            />
          </FormControl>
        )}
      />
    </VStack>
  );

  return (
    <Box maxWidth="600px" margin="auto">
      {configurationErrors.length > 0 && (
        <Alert status="error">
          <AlertIcon />
          {configurationErrors.map((error, index) => (
            <Box key={index}>{error}</Box>
          ))}
        </Alert>
      )}

      <Tabs>
        <TabList>
          <Tab>Affiliate Links</Tab>
          <Tab>Targeting</Tab>
          <Tab>Email Platform</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>{renderAffiliateLinksSection()}</TabPanel>
          <TabPanel>{renderTargetingSection()}</TabPanel>
          <TabPanel>{renderEmailPlatformSection()}</TabPanel>
        </TabPanels>
      </Tabs>

      <Button 
        colorScheme="blue" 
        onClick={handleSubmit(handleConfigurationSubmit)}
      >
        Start Campaign
      </Button>
    </Box>
  );
};

// Utility file for country data
export const countries = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  // Add more countries as needed
];
