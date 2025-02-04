import { BaseAgent } from './BaseAgent';
import { AffiliateAgent } from './AffiliateAgent';
import { EmailAgent } from './EmailAgent';
import { ResearchAgent } from './ResearchAgent';
import { ContentGenerationAgent } from './ContentGenerationAgent';
import { DispatchAgent } from './DispatchAgent';
import { ComplianceAgent } from './ComplianceAgent';

export class AgentOrchestrator {
  private agents: Map<string, BaseAgent> = new Map();

  constructor() {
    // Initialize all agents
    const agents = [
      new AffiliateAgent({
        id: 'affiliate-agent',
        name: 'Affiliate Management Agent',
        capabilities: ['create_link', 'list_links', 'analyze_performance']
      }),
      new EmailAgent({
        id: 'email-agent',
        name: 'Email Configuration Agent',
        capabilities: ['configure_email', 'validate_config', 'send_email']
      }),
      new ResearchAgent({
        id: 'research-agent',
        name: 'Web Research Agent',
        capabilities: ['web_research', 'email_discovery', 'context_gathering']
      }),
      new ContentGenerationAgent({
        id: 'content-agent',
        name: 'Content Generation Agent',
        capabilities: ['email_template_creation', 'personalization', 'adaptive_messaging']
      }),
      new DispatchAgent({
        id: 'dispatch-agent',
        name: 'Email Dispatch Agent',
        capabilities: ['email_sending', 'rate_limiting', 'delivery_tracking']
      }),
      new ComplianceAgent({
        id: 'compliance-agent',
        name: 'Ethical Compliance Agent',
        capabilities: ['ethical_guidelines_enforcement', 'opt_out_management', 'legal_boundary_monitoring']
      })
    ];

    agents.forEach(agent => this.registerAgent(agent));
  }

  registerAgent(agent: BaseAgent) {
    this.agents.set(agent.config.id, agent);
    agent.initialize();
  }

  getAgent(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  async orchestrateAction(
    sourceAgentId: string, 
    targetAgentId: string, 
    action: string, 
    payload?: any
  ) {
    const sourceAgent = this.getAgent(sourceAgentId);
    const targetAgent = this.getAgent(targetAgentId);

    if (!sourceAgent || !targetAgent) {
      throw new Error('Agent not found');
    }

    try {
      // Simulate inter-agent communication
      const result = await sourceAgent.communicate(targetAgent, {
        action,
        payload
      });

      return result;
    } catch (error) {
      console.error('Orchestration error:', error);
      throw error;
    }
  }

  // Advanced workflow coordination
  async coordinateWorkflow(workflow: {
    steps: Array<{
      agentId: string;
      action: string;
      payload?: any;
    }>;
  }) {
    const results: any[] = [];

    for (const step of workflow.steps) {
      const agent = this.getAgent(step.agentId);
      
      if (!agent) {
        throw new Error(`Agent ${step.agentId} not found`);
      }

      const result = await agent.process({
        action: step.action,
        data: step.payload
      });

      results.push(result);
    }

    return results;
  }

  // Workflow example for email outreach
  async emailOutreachWorkflow(companyData: any) {
    try {
      // Coordinated workflow across multiple agents
      const workflow = {
        steps: [
          // Research company details
          { 
            agentId: 'research-agent', 
            action: 'research', 
            payload: companyData 
          },
          // Generate personalized content
          { 
            agentId: 'content-agent', 
            action: 'generate_template', 
            payload: companyData 
          },
          // Check compliance
          { 
            agentId: 'compliance-agent', 
            action: 'check_compliance', 
            payload: companyData 
          },
          // Send email if compliant
          { 
            agentId: 'dispatch-agent', 
            action: 'send_email', 
            payload: companyData 
          }
        ]
      };

      return await this.coordinateWorkflow(workflow);
    } catch (error) {
      console.error('Email outreach workflow failed:', error);
      throw error;
    }
  }
}
