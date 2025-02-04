import React, { useState } from 'react';
import { 
  MarketingCampaignInputSchema, 
  INITIAL_MARKETING_CAMPAIGN_STATE,
  FRONTEND_DROPDOWN_OPTIONS,
  MarketingCampaignFormProps
} from '../types/marketingCampaignTypes';
import { contentGenerationSystem } from '../services/contentGenerationSystem';
import autonomousMarketingOrchestrator from '../services/autonomousMarketingOrchestrator';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

// Email Preview Component
const EmailPreviewModal: React.FC<{
  previews: z.infer<typeof contentGenerationSystem.EmailPreviewSchema>;
  onClose: () => void;
}> = ({ previews, onClose }) => {
  const [selectedVariant, setSelectedVariant] = useState(previews.previewVariants[0]);

  return (
    <div className="email-preview-modal">
      <div className="modal-content">
        <h2>Email Preview</h2>
        <div className="preview-selector">
          {previews.previewVariants.map(variant => (
            <button 
              key={variant.id}
              onClick={() => setSelectedVariant(variant)}
              className={selectedVariant.id === variant.id ? 'active' : ''}
            >
              {variant.tone.charAt(0).toUpperCase() + variant.tone.slice(1)} Tone
            </button>
          ))}
        </div>
        
        <div className="preview-details">
          <h3>Subject: {selectedVariant.subject}</h3>
          <div className="preview-body">
            {selectedVariant.body.split('\n').map((line, index) => (
              <p key={index}>{line}</p>
            ))}
          </div>
          
          <div className="preview-metadata">
            <p><strong>Tone:</strong> {selectedVariant.tone}</p>
            <p><strong>Ethical Score:</strong> {previews.ethicalScore.toFixed(2)}</p>
          </div>
        </div>
        
        <button onClick={onClose} className="close-btn">Close Preview</button>
      </div>
    </div>
  );
};

const MarketingCampaignForm: React.FC<MarketingCampaignFormProps> = ({ 
  onSubmit, 
  initialData = {} 
}) => {
  // Merge initial data with default state
  const [formData, setFormData] = useState<Partial<z.infer<typeof MarketingCampaignInputSchema>>>({
    ...INITIAL_MARKETING_CAMPAIGN_STATE,
    ...initialData
  });

  // Form validation state
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // New state for email previews
  const [emailPreviews, setEmailPreviews] = useState<z.infer<typeof contentGenerationSystem.EmailPreviewSchema> | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New state for autonomous workflow
  const [selectedEmailVariant, setSelectedEmailVariant] = useState<any>(null);
  const [autonomousWorkflowStatus, setAutonomousWorkflowStatus] = useState<{
    status: 'idle' | 'running' | 'completed' | 'error';
    insights?: any;
    recommendations?: string[];
  }>({ status: 'idle' });

  // Handle input changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validate form data
      const validatedData = MarketingCampaignInputSchema.parse(formData);
      
      // Clear previous validation errors
      setValidationErrors({});
      
      // Submit to parent component
      await onSubmit(validatedData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Transform Zod errors into user-friendly messages
        const errors: Record<string, string> = {};
        error.errors.forEach(err => {
          errors[err.path[0] as string] = err.message;
        });
        setValidationErrors(errors);
      }
    }
  };

  // Generate email previews
  const generateEmailPreviews = async () => {
    // Validate required fields before generating previews
    const requiredFields = [
      'affiliateLink', 
      'targetIndustry', 
      'companySize', 
      'contactEmail'
    ];

    const missingFields = requiredFields.filter(field => !formData[field]);

    if (missingFields.length > 0) {
      setError(`Please fill in the following fields: ${missingFields.join(', ')}`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const previews = await contentGenerationSystem.generateEmailPreviews({
        affiliateLink: formData.affiliateLink!,
        targetIndustry: formData.targetIndustry!,
        companySize: formData.companySize!,
        contentType: formData.contentType,
        ethicalGuidelines: formData.ethicalGuidelines,
        companyName: formData.companyName
      });

      setEmailPreviews(previews);
    } catch (err) {
      setError('Failed to generate email previews. Please check your inputs.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // New method for autonomous workflow
  const initiateAutonomousWorkflow = async () => {
    if (!emailPreviews || !selectedEmailVariant) {
      setError('Please generate and select an email preview first.');
      return;
    }

    try {
      setAutonomousWorkflowStatus({ status: 'running' });

      const workflowResult = await autonomousMarketingOrchestrator.initiateAutonomousMarketingWorkflow({
        campaignId: uuidv4(),
        selectedEmailVariant: selectedEmailVariant,
        affiliateLink: formData.affiliateLink!,
        targetIndustry: formData.targetIndustry!,
        companySize: formData.companySize!,
        ethicalScore: emailPreviews.ethicalScore
      });

      if (workflowResult.success) {
        setAutonomousWorkflowStatus({
          status: 'completed',
          insights: workflowResult.enhancementInsights,
          recommendations: workflowResult.recommendedOptimizations
        });
      } else {
        setAutonomousWorkflowStatus({ status: 'error' });
        setError('Autonomous workflow encountered an error.');
      }
    } catch (err) {
      console.error(err);
      setAutonomousWorkflowStatus({ status: 'error' });
      setError('Failed to initiate autonomous workflow.');
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="marketing-campaign-form">
        {/* Affiliate Link Input */}
        <div className="form-group">
          <label htmlFor="affiliateLink">Affiliate Link</label>
          <input
            type="url"
            id="affiliateLink"
            name="affiliateLink"
            value={formData.affiliateLink || ''}
            onChange={handleChange}
            placeholder="Enter mental health service URL"
            required
          />
          {validationErrors.affiliateLink && (
            <span className="error">{validationErrors.affiliateLink}</span>
          )}
        </div>

        {/* Industry Dropdown */}
        <div className="form-group">
          <label htmlFor="targetIndustry">Target Industry</label>
          <select
            id="targetIndustry"
            name="targetIndustry"
            value={formData.targetIndustry || ''}
            onChange={handleChange}
            required
          >
            <option value="">Select Industry</option>
            {FRONTEND_DROPDOWN_OPTIONS.industries.map(industry => (
              <option key={industry.value} value={industry.value}>
                {industry.label}
              </option>
            ))}
          </select>
          {validationErrors.targetIndustry && (
            <span className="error">{validationErrors.targetIndustry}</span>
          )}
        </div>

        {/* Company Size Dropdown */}
        <div className="form-group">
          <label htmlFor="companySize">Company Size</label>
          <select
            id="companySize"
            name="companySize"
            value={formData.companySize || ''}
            onChange={handleChange}
            required
          >
            <option value="">Select Company Size</option>
            {FRONTEND_DROPDOWN_OPTIONS.companySizes.map(size => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>
          {validationErrors.companySize && (
            <span className="error">{validationErrors.companySize}</span>
          )}
        </div>

        {/* Content Type Dropdown */}
        <div className="form-group">
          <label htmlFor="contentType">Content Type</label>
          <select
            id="contentType"
            name="contentType"
            value={formData.contentType || 'mental-health'}
            onChange={handleChange}
          >
            {FRONTEND_DROPDOWN_OPTIONS.contentTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Contact Email */}
        <div className="form-group">
          <label htmlFor="contactEmail">HR Contact Email</label>
          <input
            type="email"
            id="contactEmail"
            name="contactEmail"
            value={formData.contactEmail || ''}
            onChange={handleChange}
            placeholder="Enter HR contact email"
            required
          />
          {validationErrors.contactEmail && (
            <span className="error">{validationErrors.contactEmail}</span>
          )}
        </div>

        {/* Optional: Company Name */}
        <div className="form-group">
          <label htmlFor="companyName">Company Name (Optional)</label>
          <input
            type="text"
            id="companyName"
            name="companyName"
            value={formData.companyName || ''}
            onChange={handleChange}
            placeholder="Enter company name"
          />
        </div>

        {/* Ethical Guidelines Toggle */}
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              name="ethicalGuidelines"
              checked={formData.ethicalGuidelines ?? true}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                ethicalGuidelines: e.target.checked
              }))}
            />
            Enable Ethical Guidelines
          </label>
        </div>

        {/* Tracking Preferences */}
        <div className="form-group">
          <fieldset>
            <legend>Tracking Preferences</legend>
            <label>
              <input
                type="checkbox"
                name="trackingPreferences.enableDetailedTracking"
                checked={formData.trackingPreferences?.enableDetailedTracking ?? true}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  trackingPreferences: {
                    ...prev.trackingPreferences,
                    enableDetailedTracking: e.target.checked
                  }
                }))}
              />
              Enable Detailed Tracking
            </label>
            <label>
              <input
                type="checkbox"
                name="trackingPreferences.trackOpenRate"
                checked={formData.trackingPreferences?.trackOpenRate ?? true}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  trackingPreferences: {
                    ...prev.trackingPreferences,
                    trackOpenRate: e.target.checked
                  }
                }))}
              />
              Track Open Rate
            </label>
            <label>
              <input
                type="checkbox"
                name="trackingPreferences.trackClickRate"
                checked={formData.trackingPreferences?.trackClickRate ?? true}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  trackingPreferences: {
                    ...prev.trackingPreferences,
                    trackClickRate: e.target.checked
                  }
                }))}
              />
              Track Click Rate
            </label>
          </fieldset>
        </div>

        {/* Preview Generation Button */}
        <div className="form-group preview-section">
          <button 
            type="button" 
            onClick={generateEmailPreviews} 
            disabled={isLoading}
            className="preview-btn"
          >
            {isLoading ? 'Generating Previews...' : 'Generate Email Previews'}
          </button>
          
          {error && <div className="error-message">{error}</div>}
        </div>

        {/* Autonomous Workflow Section */}
        {emailPreviews && (
          <div className="autonomous-workflow-section">
            <h3>Autonomous Marketing Workflow</h3>
            
            {/* Email Variant Selection */}
            <div className="email-variant-selection">
              <h4>Select Email Variant</h4>
              {emailPreviews.previewVariants.map(variant => (
                <div 
                  key={variant.id} 
                  className={`variant-option ${selectedEmailVariant?.id === variant.id ? 'selected' : ''}`}
                  onClick={() => setSelectedEmailVariant(variant)}
                >
                  <span>{variant.tone} Tone</span>
                  <p>{variant.subject}</p>
                </div>
              ))}
            </div>

            {/* Autonomous Workflow Button */}
            <button 
              type="button" 
              onClick={initiateAutonomousWorkflow}
              disabled={!selectedEmailVariant || autonomousWorkflowStatus.status === 'running'}
              className="autonomous-workflow-btn"
            >
              {autonomousWorkflowStatus.status === 'running' 
                ? 'Enhancing Campaign...' 
                : 'Start Autonomous Enhancement'}
            </button>
          </div>
        )}

        {/* Submit Button */}
        <button type="submit" className="submit-btn">
          Create Marketing Campaign
        </button>
      </form>

      {/* Autonomous Workflow Results Modal */}
      {autonomousWorkflowStatus.status === 'completed' && (
        <div className="autonomous-workflow-results-modal">
          <h2>Autonomous Marketing Workflow Results</h2>
          
          <section className="workflow-insights">
            <h3>Performance Insights</h3>
            <pre>{JSON.stringify(autonomousWorkflowStatus.insights, null, 2)}</pre>
          </section>

          <section className="workflow-recommendations">
            <h3>Optimization Recommendations</h3>
            <ul>
              {autonomousWorkflowStatus.recommendations?.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </section>

          <button onClick={() => setAutonomousWorkflowStatus({ status: 'idle' })}>
            Close
          </button>
        </div>
      )}

      {/* Email Preview Modal */}
      {emailPreviews && (
        <EmailPreviewModal 
          previews={emailPreviews}
          onClose={() => setEmailPreviews(null)}
        />
      )}
    </>
  );
};

export default MarketingCampaignForm;
