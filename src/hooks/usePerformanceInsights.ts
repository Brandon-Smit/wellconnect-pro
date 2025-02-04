import { useState, useEffect } from 'react';
import { orchestrationLayer } from '@/core/orchestrationLayer';

// Performance Insights Types
interface PerformanceMetric {
  timestamp: string;
  openRate: number;
  clickRate: number;
  conversionRate: number;
  ethicalScore: number;
}

interface PerformanceTrend {
  trend: 'improving' | 'stable' | 'declining';
  metrics: {
    openRateTrend: number;
    clickRateTrend: number;
    conversionRateTrend: number;
  };
}

interface ComponentPerformance {
  name: string;
  type: string;
  performanceMetrics: {
    successRate: number;
    averageExecutionTime: number;
    totalExecutions: number;
  };
}

interface PerformanceInsights {
  workflowName: string;
  performanceMetrics: PerformanceMetric[];
  performanceTrend: PerformanceTrend;
  futurePredictions: number[];
  components: ComponentPerformance[];
}

// Custom hook for fetching and managing performance insights
export const usePerformanceInsights = (workflowId: string) => {
  const [insights, setInsights] = useState<PerformanceInsights | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPerformanceInsights = async () => {
      try {
        setIsLoading(true);
        
        // Fetch performance insights from Orchestration Layer
        const performanceInsights = orchestrationLayer.getWorkflowPerformanceInsights(workflowId);

        // Transform insights to match frontend requirements
        const transformedInsights: PerformanceInsights = {
          workflowName: performanceInsights.workflowName,
          performanceMetrics: generateMockPerformanceMetrics(),
          performanceTrend: performanceInsights.performanceTrend,
          futurePredictions: performanceInsights.futurePredictions,
          components: performanceInsights.components
        };

        setInsights(transformedInsights);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchPerformanceInsights();
  }, [workflowId]);

  // Generate mock performance metrics for visualization
  const generateMockPerformanceMetrics = (): PerformanceMetric[] => {
    const metrics: PerformanceMetric[] = [];
    const now = new Date();

    for (let i = 0; i < 10; i++) {
      const timestamp = new Date(now.getTime() - i * 24 * 60 * 60 * 1000).toISOString();
      metrics.push({
        timestamp,
        openRate: 20 + Math.random() * 30,
        clickRate: 5 + Math.random() * 15,
        conversionRate: 1 + Math.random() * 5,
        ethicalScore: 7 + Math.random() * 3
      });
    }

    return metrics.reverse(); // Chronological order
  };

  // Method to manually refresh insights
  const refreshInsights = () => {
    if (workflowId) {
      const fetchPerformanceInsights = async () => {
        try {
          setIsLoading(true);
          const performanceInsights = orchestrationLayer.getWorkflowPerformanceInsights(workflowId);

          const transformedInsights: PerformanceInsights = {
            workflowName: performanceInsights.workflowName,
            performanceMetrics: generateMockPerformanceMetrics(),
            performanceTrend: performanceInsights.performanceTrend,
            futurePredictions: performanceInsights.futurePredictions,
            components: performanceInsights.components
          };

          setInsights(transformedInsights);
        } catch (err) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        } finally {
          setIsLoading(false);
        }
      };

      fetchPerformanceInsights();
    }
  };

  return {
    insights,
    isLoading,
    error,
    refreshInsights
  };
};

export type { PerformanceInsights };
