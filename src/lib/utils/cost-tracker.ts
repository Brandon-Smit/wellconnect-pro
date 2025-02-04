export class CostTracker {
  private static instance: CostTracker;
  
  // Service usage tracking
  private apiCalls: number = 0;
  private aiInferenceCalls: number = 0;
  private emailsSent: number = 0;
  private emailVerifications: number = 0;
  private databaseQueries: number = 0;

  // Cost rates (configurable)
  private static COST_RATES = {
    openAI: {
      tokenCost: 0.0015 / 1000,  // $0.0015 per 1K tokens
      maxTokensPerCall: 4000
    },
    smtp: {
      costPerEmail: 0.0001,  // Estimated SendGrid cost
      baseMonthlyFee: 89.95
    },
    emailVerification: {
      costPerVerification: 0.02
    },
    database: {
      queryCost: 0.00001  // Estimated cost per query
    }
  };

  private constructor() {}

  public static getInstance(): CostTracker {
    if (!CostTracker.instance) {
      CostTracker.instance = new CostTracker();
    }
    return CostTracker.instance;
  }

  // Record methods with optional metadata
  recordAPICall(metadata?: Record<string, unknown>): void {
    this.apiCalls++;
  }

  recordAIInference(tokens: number = 1000): void {
    this.aiInferenceCalls++;
  }

  recordEmailSent(metadata?: { 
    recipient?: string, 
    campaignId?: string 
  }): void {
    this.emailsSent++;
  }

  recordEmailVerification(): void {
    this.emailVerifications++;
  }

  recordDatabaseQuery(): void {
    this.databaseQueries++;
  }

  // Comprehensive cost estimation
  getCostEstimate(month: number = 1): { 
    totalMonthlyCost: number, 
    serviceCosts: Record<string, number>,
    usage: Record<string, number>
  } {
    const openAICost = 
      this.aiInferenceCalls * 
      CostTracker.COST_RATES.openAI.tokenCost * 
      CostTracker.COST_RATES.openAI.maxTokensPerCall;

    const smtpCost = 
      CostTracker.COST_RATES.smtp.baseMonthlyFee + 
      (this.emailsSent * CostTracker.COST_RATES.smtp.costPerEmail);

    const emailVerificationCost = 
      this.emailVerifications * CostTracker.COST_RATES.emailVerification.costPerVerification;

    const databaseCost = 
      this.databaseQueries * CostTracker.COST_RATES.database.queryCost;

    const totalMonthlyCost = 
      openAICost + smtpCost + emailVerificationCost + databaseCost;

    return {
      totalMonthlyCost,
      serviceCosts: {
        openAI: openAICost,
        smtp: smtpCost,
        emailVerification: emailVerificationCost,
        database: databaseCost
      },
      usage: {
        apiCalls: this.apiCalls,
        aiInferences: this.aiInferenceCalls,
        emailsSent: this.emailsSent,
        emailVerifications: this.emailVerifications,
        databaseQueries: this.databaseQueries
      }
    };
  }

  // Update cost rates dynamically
  static updateCostRates(
    service: keyof typeof CostTracker.COST_RATES, 
    newRates: Partial<Record<string, number>>
  ): void {
    Object.assign(CostTracker.COST_RATES[service], newRates);
  }

  // Reset tracking
  reset(): void {
    this.apiCalls = 0;
    this.aiInferenceCalls = 0;
    this.emailsSent = 0;
    this.emailVerifications = 0;
    this.databaseQueries = 0;
  }
}
