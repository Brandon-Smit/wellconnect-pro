// Centralized Error Message Constants

export const ERROR_MESSAGES = {
  // Compliance Errors
  BLOCKED_CONTACT: 'Contact is blocked due to compliance issues',
  ETHICAL_THRESHOLD_VIOLATED: 'Ethical score does not meet minimum requirements',
  
  // Email Dispatch Errors
  EMAIL_DISPATCH_FAILED: 'Failed to dispatch email',
  SMTP_CONNECTION_ERROR: 'Unable to connect to SMTP server',
  
  // Content Generation Errors
  CONTENT_GENERATION_FAILED: 'Failed to generate content',
  AI_MODEL_UNAVAILABLE: 'No AI model available for content generation',
  
  // Email Discovery Errors
  EMAIL_DISCOVERY_FAILED: 'Failed to discover company contacts',
  INVALID_DOMAIN: 'Invalid domain for email discovery',
  
  // Affiliate Link Errors
  AFFILIATE_LINK_CREATION_FAILED: 'Failed to create affiliate link',
  INVALID_AFFILIATE_URL: 'Invalid URL for affiliate link',
  
  // Authentication Errors
  UNAUTHORIZED: 'Unauthorized access',
  AUTHENTICATION_FAILED: 'Authentication failed',
  
  // General Errors
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred',
  VALIDATION_ERROR: 'Invalid input data',
  
  // Ethical AI Errors
  TOXIC_CONTENT_DETECTED: 'Potentially harmful content detected',
  SENSITIVE_CONTENT_WARNING: 'Content may contain sensitive information'
};

export const WARNING_MESSAGES = {
  LOW_ETHICAL_SCORE: 'Content ethical score is below recommended threshold',
  HIGH_SENSITIVITY_DETECTED: 'High sensitivity content detected',
  POTENTIAL_COMPLIANCE_ISSUE: 'Potential compliance issue identified'
};

export const SUCCESS_MESSAGES = {
  EMAIL_DISPATCHED: 'Email dispatched successfully',
  CONTENT_GENERATED: 'Content generated successfully',
  AFFILIATE_LINK_CREATED: 'Affiliate link created successfully',
  COMPLIANCE_CHECK_PASSED: 'Compliance check passed'
};
