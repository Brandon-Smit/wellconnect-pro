import { z } from 'zod';
import { logger } from '../core/loggingSystem';
import { eventBus, EventTypes } from '../core/eventBus';
import { configManager } from '../core/configurationManager';

// Compliance Rule Schema
const ComplianceRuleSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  regulation: z.enum([
    'GDPR', 
    'CAN-SPAM', 
    'CCPA', 
    'HIPAA', 
    'TCPA', 
    'CASL'
  ]),
  category: z.enum([
    'data_privacy', 
    'consent', 
    'communication', 
    'data_retention', 
    'user_rights'
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum([
      'equals', 
      'not_equals', 
      'contains', 
      'not_contains', 
      'greater_than', 
      'less_than'
    ]),
    value: z.any()
  })),
  action: z.enum([
    'block', 
    'flag', 
    'anonymize', 
    'require_consent', 
    'log'
  ]),
  remediation: z.string().optional()
});

// Compliance Check Result Schema
const ComplianceCheckResultSchema = z.object({
  passed: z.boolean(),
  violations: z.array(z.object({
    ruleId: z.string(),
    ruleName: z.string(),
    severity: z.string(),
    details: z.record(z.string(), z.any())
  })),
  timestamp: z.date(),
  dataType: z.string(),
  dataSource: z.string()
});

class ComplianceRuleEngine {
  private static instance: ComplianceRuleEngine;
  private rules: Map<string, z.infer<typeof ComplianceRuleSchema>> = new Map();
  private complianceConfig: any;

  private constructor() {
    this.complianceConfig = configManager.get('compliance') || {};
    this.initializeStandardRules();
  }

  // Singleton instance
  public static getInstance(): ComplianceRuleEngine {
    if (!ComplianceRuleEngine.instance) {
      ComplianceRuleEngine.instance = new ComplianceRuleEngine();
    }
    return ComplianceRuleEngine.instance;
  }

  // Initialize standard compliance rules
  private initializeStandardRules(): void {
    const standardRules = [
      // GDPR Consent Rule
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'GDPR Explicit Consent',
        description: 'Ensure explicit consent for data processing',
        regulation: 'GDPR',
        category: 'consent',
        severity: 'critical',
        conditions: [
          {
            field: 'consent_given',
            operator: 'equals',
            value: true
          },
          {
            field: 'consent_timestamp',
            operator: 'less_than',
            value: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // 1 year
          }
        ],
        action: 'require_consent',
        remediation: 'Request renewed consent from user'
      },
      // CAN-SPAM Unsubscribe Rule
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'CAN-SPAM Unsubscribe Mechanism',
        description: 'Provide clear unsubscribe option',
        regulation: 'CAN-SPAM',
        category: 'communication',
        severity: 'high',
        conditions: [
          {
            field: 'unsubscribe_link',
            operator: 'contains',
            value: 'unsubscribe'
          }
        ],
        action: 'block',
        remediation: 'Add clear unsubscribe mechanism to email'
      }
    ];

    standardRules.forEach(rule => {
      this.registerRule(rule);
    });
  }

  // Register a new compliance rule
  public registerRule(
    rule: Omit<z.infer<typeof ComplianceRuleSchema>, 'id'> & { 
      id?: string 
    }
  ): string {
    const ruleWithId = {
      ...rule,
      id: rule.id || crypto.randomUUID()
    };

    const validatedRule = ComplianceRuleSchema.parse(ruleWithId);
    
    this.rules.set(validatedRule.id, validatedRule);

    logger.log('info', 'Compliance Rule Registered', {
      ruleName: validatedRule.name,
      regulation: validatedRule.regulation
    });

    // Publish rule registration event
    eventBus.publish(EventTypes.COMPLIANCE_RULE_REGISTERED, validatedRule);

    return validatedRule.id;
  }

  // Perform compliance check on data
  public checkCompliance(
    data: Record<string, any>,
    options: {
      dataType: string;
      dataSource: string;
      regulations?: Array<z.infer<typeof ComplianceRuleSchema>['regulation']>;
    }
  ): z.infer<typeof ComplianceCheckResultSchema> {
    const { 
      dataType, 
      dataSource, 
      regulations = ['GDPR', 'CAN-SPAM', 'CCPA'] 
    } = options;

    const violations: any[] = [];

    // Filter rules by specified regulations
    const applicableRules = Array.from(this.rules.values()).filter(
      rule => regulations.includes(rule.regulation)
    );

    applicableRules.forEach(rule => {
      const ruleViolation = this.evaluateRule(rule, data);
      if (ruleViolation) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          details: ruleViolation
        });
      }
    });

    const complianceResult = ComplianceCheckResultSchema.parse({
      passed: violations.length === 0,
      violations,
      timestamp: new Date(),
      dataType,
      dataSource
    });

    // Log compliance check
    logger.log('info', 'Compliance Check Completed', {
      dataType,
      passed: complianceResult.passed,
      violationCount: violations.length
    });

    // Publish compliance check event
    eventBus.publish(EventTypes.COMPLIANCE_CHECK_COMPLETED, complianceResult);

    // Handle violations based on severity
    this.handleViolations(complianceResult);

    return complianceResult;
  }

  // Evaluate a single compliance rule
  private evaluateRule(
    rule: z.infer<typeof ComplianceRuleSchema>,
    data: Record<string, any>
  ): Record<string, any> | null {
    const violationDetails: Record<string, any> = {};

    for (const condition of rule.conditions) {
      const dataValue = data[condition.field];

      const checkResult = this.evaluateCondition(
        condition.operator, 
        dataValue, 
        condition.value
      );

      if (!checkResult) {
        violationDetails[condition.field] = {
          expected: condition.value,
          actual: dataValue
        };
      }
    }

    return Object.keys(violationDetails).length > 0 
      ? violationDetails 
      : null;
  }

  // Evaluate a single condition
  private evaluateCondition(
    operator: z.infer<typeof ComplianceRuleSchema>['conditions'][0]['operator'],
    actual: any,
    expected: any
  ): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'not_equals':
        return actual !== expected;
      case 'contains':
        return String(actual).includes(String(expected));
      case 'not_contains':
        return !String(actual).includes(String(expected));
      case 'greater_than':
        return actual > expected;
      case 'less_than':
        return actual < expected;
      default:
        return false;
    }
  }

  // Handle compliance violations
  private handleViolations(
    complianceResult: z.infer<typeof ComplianceCheckResultSchema>
  ): void {
    if (complianceResult.violations.length === 0) return;

    // Group violations by severity
    const severityGroups = complianceResult.violations.reduce(
      (groups, violation) => {
        if (!groups[violation.severity]) {
          groups[violation.severity] = [];
        }
        groups[violation.severity].push(violation);
        return groups;
      },
      {} as Record<string, any[]>
    );

    // Log and potentially block based on severity
    Object.entries(severityGroups).forEach(([severity, violations]) => {
      switch (severity) {
        case 'critical':
          logger.log('error', 'Critical Compliance Violations', {
            violationCount: violations.length,
            details: violations
          });
          // Potentially halt processing or send urgent notification
          break;
        case 'high':
          logger.log('warn', 'High Severity Compliance Violations', {
            violationCount: violations.length,
            details: violations
          });
          break;
        default:
          logger.log('info', 'Compliance Violations Detected', {
            severity,
            violationCount: violations.length
          });
      }
    });
  }

  // Get all registered rules
  public getRules(): Array<z.infer<typeof ComplianceRuleSchema>> {
    return Array.from(this.rules.values());
  }

  // Remove a specific rule
  public removeRule(ruleId: string): boolean {
    const rule = this.rules.get(ruleId);
    
    if (rule) {
      this.rules.delete(ruleId);
      
      logger.log('info', 'Compliance Rule Removed', {
        ruleName: rule.name
      });

      // Publish rule removal event
      eventBus.publish(EventTypes.COMPLIANCE_RULE_REMOVED, rule);

      return true;
    }

    return false;
  }

  // Generate compliance report
  public generateComplianceReport(
    options: {
      startDate?: Date;
      endDate?: Date;
      regulations?: Array<z.infer<typeof ComplianceRuleSchema>['regulation']>;
    } = {}
  ): {
    totalRules: number;
    rulesByRegulation: Record<string, number>;
    recentViolations: Array<z.infer<typeof ComplianceCheckResultSchema>>;
  } {
    const { 
      startDate, 
      endDate, 
      regulations 
    } = options;

    // Placeholder for actual violation tracking
    const recentViolations: z.infer<typeof ComplianceCheckResultSchema>[] = [];

    const report = {
      totalRules: this.rules.size,
      rulesByRegulation: this.getRuleCountByRegulation(regulations),
      recentViolations
    };

    // Log compliance report generation
    logger.log('info', 'Compliance Report Generated', {
      totalRules: report.totalRules
    });

    // Publish compliance report event
    eventBus.publish(EventTypes.COMPLIANCE_REPORT_GENERATED, report);

    return report;
  }

  // Count rules by regulation
  private getRuleCountByRegulation(
    regulations?: Array<z.infer<typeof ComplianceRuleSchema>['regulation']>
  ): Record<string, number> {
    const ruleCounts: Record<string, number> = {};

    this.rules.forEach(rule => {
      if (!regulations || regulations.includes(rule.regulation)) {
        ruleCounts[rule.regulation] = 
          (ruleCounts[rule.regulation] || 0) + 1;
      }
    });

    return ruleCounts;
  }
}

// Export singleton instance
export const complianceRuleEngine = ComplianceRuleEngine.getInstance();
