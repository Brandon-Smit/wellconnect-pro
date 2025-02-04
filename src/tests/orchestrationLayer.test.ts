import { orchestrationLayer } from '../core/orchestrationLayer';
import { expect } from 'chai';
import sinon from 'sinon';

describe('Orchestration Layer', () => {
  beforeEach(() => {
    // Reset the orchestration layer before each test
    (orchestrationLayer as any).components.clear();
    (orchestrationLayer as any).workflows.clear();
    (orchestrationLayer as any).errorLogs = [];
    (orchestrationLayer as any).dependencyContainer.clear();
  });

  describe('Component Management', () => {
    it('should register a new component', () => {
      const component = orchestrationLayer.registerComponent({
        name: 'Test Component',
        type: 'discovery'
      });

      expect(component).to.have.property('id');
      expect(component.name).to.equal('Test Component');
      expect(component.type).to.equal('discovery');
      expect(component.status).to.equal('inactive');
    });

    it('should activate and deactivate a component', () => {
      const component = orchestrationLayer.registerComponent({
        name: 'Test Component',
        type: 'discovery'
      });

      const activatedComponent = orchestrationLayer.activateComponent(component.id);
      expect(activatedComponent.status).to.equal('active');

      const deactivatedComponent = orchestrationLayer.deactivateComponent(component.id);
      expect(deactivatedComponent.status).to.equal('inactive');
    });

    it('should throw error when activating non-existent component', () => {
      expect(() => {
        orchestrationLayer.activateComponent('non-existent-id');
      }).to.throw('Component non-existent-id not found');
    });
  });

  describe('Workflow Execution', () => {
    it('should create a workflow', () => {
      const discoveryComponent = orchestrationLayer.registerComponent({
        name: 'Discovery Component',
        type: 'discovery'
      });

      const contentComponent = orchestrationLayer.registerComponent({
        name: 'Content Component',
        type: 'content_generation'
      });

      const workflow = orchestrationLayer.createWorkflow({
        name: 'Email Campaign Workflow',
        steps: [
          {
            componentId: discoveryComponent.id,
            action: 'discover_contacts',
            order: 1,
            required: true
          },
          {
            componentId: contentComponent.id,
            action: 'generate_content',
            order: 2,
            required: true
          }
        ]
      });

      expect(workflow).to.have.property('id');
      expect(workflow.name).to.equal('Email Campaign Workflow');
      expect(workflow.steps).to.have.lengthOf(2);
      expect(workflow.status).to.equal('pending');
    });

    it('should execute a workflow', async () => {
      const discoveryComponent = orchestrationLayer.registerComponent({
        name: 'Discovery Component',
        type: 'discovery'
      });
      orchestrationLayer.activateComponent(discoveryComponent.id);

      const contentComponent = orchestrationLayer.registerComponent({
        name: 'Content Component',
        type: 'content_generation'
      });
      orchestrationLayer.activateComponent(contentComponent.id);

      const workflow = orchestrationLayer.createWorkflow({
        name: 'Email Campaign Workflow',
        steps: [
          {
            componentId: discoveryComponent.id,
            action: 'discover_contacts',
            order: 1,
            required: true
          },
          {
            componentId: contentComponent.id,
            action: 'generate_content',
            order: 2,
            required: true
          }
        ]
      });

      const executeStepSpy = sinon.spy(orchestrationLayer as any, 'executeWorkflowStep');

      const executedWorkflow = await orchestrationLayer.executeWorkflow(workflow.id);

      expect(executedWorkflow.status).to.equal('completed');
      expect(executeStepSpy.callCount).to.equal(2);
      
      executeStepSpy.restore();
    });

    it('should handle workflow step errors', async () => {
      const errorComponent = orchestrationLayer.registerComponent({
        name: 'Error Component',
        type: 'dispatch'
      });
      orchestrationLayer.activateComponent(errorComponent.id);

      const workflow = orchestrationLayer.createWorkflow({
        name: 'Failing Workflow',
        steps: [
          {
            componentId: errorComponent.id,
            action: 'cause_error',
            order: 1,
            required: true
          }
        ]
      });

      // Mock executeWorkflowStep to throw an error
      const executeStepStub = sinon.stub(orchestrationLayer as any, 'executeWorkflowStep').throws(new Error('Test error'));
      const logErrorSpy = sinon.spy(orchestrationLayer, 'logError');

      try {
        await orchestrationLayer.executeWorkflow(workflow.id);
      } catch (error) {
        expect(error).to.be.an('error');
        expect(logErrorSpy.calledOnce).to.be.true;
        
        const errorLogs = orchestrationLayer.getErrorLogs();
        expect(errorLogs).to.have.lengthOf(1);
        expect(errorLogs[0].severity).to.equal('critical');
      } finally {
        executeStepStub.restore();
        logErrorSpy.restore();
      }
    });
  });

  describe('Dependency Injection', () => {
    it('should register and resolve dependencies', () => {
      const testDependency = { name: 'Test Service' };
      
      orchestrationLayer.registerDependency('testService', testDependency);
      
      const resolvedDependency = orchestrationLayer.resolveDependency('testService');
      
      expect(resolvedDependency).to.deep.equal(testDependency);
    });

    it('should throw error when resolving non-existent dependency', () => {
      expect(() => {
        orchestrationLayer.resolveDependency('non-existent-dependency');
      }).to.throw('Dependency non-existent-dependency not found');
    });
  });

  describe('Error Logging', () => {
    it('should log errors with context', () => {
      const errorLog = orchestrationLayer.logError({
        componentId: 'test-component',
        severity: 'medium',
        message: 'Test error message',
        context: { additionalInfo: 'details' }
      });

      expect(errorLog).to.have.property('id');
      expect(errorLog.componentId).to.equal('test-component');
      expect(errorLog.severity).to.equal('medium');
      expect(errorLog.message).to.equal('Test error message');
      expect(errorLog.context).to.deep.equal({ additionalInfo: 'details' });
    });

    it('should filter error logs', () => {
      // Log multiple errors
      orchestrationLayer.logError({
        componentId: 'component1',
        severity: 'low',
        message: 'Low severity error'
      });

      orchestrationLayer.logError({
        componentId: 'component2',
        severity: 'high',
        message: 'High severity error'
      });

      const highSeverityLogs = orchestrationLayer.getErrorLogs({
        severity: 'high'
      });

      expect(highSeverityLogs).to.have.lengthOf(1);
      expect(highSeverityLogs[0].severity).to.equal('high');
    });
  });

  describe('Enhanced Orchestration Layer', () => {
    let workflowId: string;

    beforeEach(() => {
      // Reset services and create a new workflow
      const workflow = orchestrationLayer.createWorkflow('Test Workflow', [
        'Email Discovery',
        'Content Generation',
        'Dispatch',
        'Compliance'
      ]);
      workflowId = workflow.id;
    });

    describe('Component Registration', () => {
      it('should register a new component', () => {
        const component = orchestrationLayer.registerComponent(
          'Test Component', 
          'content_generation'
        );

        expect(component).to.exist;
        expect(component.name).to.equal('Test Component');
        expect(component.type).to.equal('content_generation');
        expect(component.status).to.equal('active');
      });
    });

    describe('Workflow Execution', () => {
      it('should execute a workflow with performance tracking', async () => {
        // Mock service methods to avoid actual external calls
        const mockDiscoverContacts = (orchestrationLayer as any).emailDiscoveryService.discoverContacts = async () => {};
        const mockGenerateContent = (orchestrationLayer as any).contentGenerationService.generateContent = async () => {};
        const mockSendEmails = (orchestrationLayer as any).dispatchService.sendEmails = async () => {};
        const mockRunComplianceChecks = (orchestrationLayer as any).complianceService.runComplianceChecks = async () => {};

        const workflow = await orchestrationLayer.executeWorkflow(workflowId);

        expect(workflow).to.exist;
        expect(workflow.status).to.equal('completed');
        expect(workflow.endTime).to.exist;
      });

      it('should track performance metrics during workflow execution', async () => {
        // Mock service methods
        (orchestrationLayer as any).emailDiscoveryService.discoverContacts = async () => {};
        (orchestrationLayer as any).contentGenerationService.generateContent = async () => {};
        (orchestrationLayer as any).dispatchService.sendEmails = async () => {};
        (orchestrationLayer as any).complianceService.runComplianceChecks = async () => {};

        const workflow = await orchestrationLayer.executeWorkflow(workflowId);

        // Verify performance campaign was created
        expect(workflow.performanceCampaignId).to.exist;

        // Retrieve performance insights
        const insights = orchestrationLayer.getWorkflowPerformanceInsights(workflowId);

        expect(insights).to.exist;
        expect(insights.workflowName).to.equal('Test Workflow');
        expect(insights.performanceTrend).to.exist;
        expect(insights.futurePredictions).to.exist;
        expect(insights.components).to.have.lengthOf(4);
      });
    });

    describe('Performance Insights', () => {
      it('should generate performance recommendations', async () => {
        // Mock service methods
        (orchestrationLayer as any).emailDiscoveryService.discoverContacts = async () => {};
        (orchestrationLayer as any).contentGenerationService.generateContent = async () => {};
        (orchestrationLayer as any).dispatchService.sendEmails = async () => {};
        (orchestrationLayer as any).complianceService.runComplianceChecks = async () => {};

        // Execute multiple workflows to generate meaningful recommendations
        for (let i = 0; i < 10; i++) {
          const workflow = orchestrationLayer.createWorkflow(`Test Workflow ${i}`, [
            'Email Discovery',
            'Content Generation',
            'Dispatch',
            'Compliance'
          ]);
          await orchestrationLayer.executeWorkflow(workflow.id);
        }

        const insights = orchestrationLayer.getWorkflowPerformanceInsights(workflowId);

        expect(insights.performanceTrend).to.exist;
        expect(insights.futurePredictions).to.exist;
      });
    });

    describe('Error Handling', () => {
      it('should handle workflow execution errors', async () => {
        // Mock a service method to throw an error
        (orchestrationLayer as any).emailDiscoveryService.discoverContacts = async () => {
          throw new Error('Simulated discovery error');
        };

        try {
          await orchestrationLayer.executeWorkflow(workflowId);
          expect.fail('Workflow execution should have failed');
        } catch (error) {
          expect(error).to.exist;
          expect(error.message).to.include('Simulated discovery error');
        }

        // Verify workflow status is updated to failed
        const insights = orchestrationLayer.getWorkflowPerformanceInsights(workflowId);
        expect(insights.components[0].performanceMetrics?.successRate).to.equal(0);
      });

      it('should throw error for non-existent workflow', () => {
        expect(() => {
          orchestrationLayer.getWorkflowPerformanceInsights('non-existent-id');
        }).to.throw('Workflow with ID non-existent-id not found');
      });
    });
  });
});
