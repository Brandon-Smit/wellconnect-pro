import React, { useState, useEffect } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Box, 
  VStack, 
  HStack, 
  Text, 
  Heading, 
  Badge, 
  Tooltip as ChakraTooltip 
} from '@chakra-ui/react';
import { InfoIcon } from '@chakra-ui/icons';

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

interface PerformanceInsightsPanelProps {
  workflowName: string;
  performanceMetrics: PerformanceMetric[];
  performanceTrend: PerformanceTrend;
  futurePredictions: number[];
  components: ComponentPerformance[];
}

const PerformanceInsightsPanel: React.FC<PerformanceInsightsPanelProps> = ({
  workflowName,
  performanceMetrics,
  performanceTrend,
  futurePredictions,
  components
}) => {
  // Color palette for visualizations
  const COLORS = {
    openRate: '#3182CE',     // Chakra Blue
    clickRate: '#48BB78',    // Chakra Green
    conversionRate: '#ED64A6', // Chakra Pink
    ethicalScore: '#9F7AEA'  // Chakra Purple
  };

  // Trend color mapping
  const getTrendColor = (trend: PerformanceTrend['trend']) => {
    switch (trend) {
      case 'improving': return 'green';
      case 'declining': return 'red';
      default: return 'gray';
    }
  };

  // Performance trend badge
  const PerformanceTrendBadge = () => (
    <Badge 
      colorScheme={getTrendColor(performanceTrend.trend)}
      display="flex"
      alignItems="center"
    >
      {performanceTrend.trend.toUpperCase()} Performance
      <ChakraTooltip 
        label={`Open Rate Trend: ${performanceTrend.metrics.openRateTrend.toFixed(2)}
                Click Rate Trend: ${performanceTrend.metrics.clickRateTrend.toFixed(2)}
                Conversion Rate Trend: ${performanceTrend.metrics.conversionRateTrend.toFixed(2)}`}
      >
        <InfoIcon ml={2} />
      </ChakraTooltip>
    </Badge>
  );

  // Performance Metrics Line Chart
  const PerformanceMetricsChart = () => (
    <Box width="100%" height="300px">
      <ResponsiveContainer>
        <LineChart data={performanceMetrics}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="timestamp" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="openRate" 
            stroke={COLORS.openRate} 
            name="Open Rate" 
          />
          <Line 
            type="monotone" 
            dataKey="clickRate" 
            stroke={COLORS.clickRate} 
            name="Click Rate" 
          />
          <Line 
            type="monotone" 
            dataKey="conversionRate" 
            stroke={COLORS.conversionRate} 
            name="Conversion Rate" 
          />
          <Line 
            type="monotone" 
            dataKey="ethicalScore" 
            stroke={COLORS.ethicalScore} 
            name="Ethical Score" 
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );

  // Component Performance Bar Chart
  const ComponentPerformanceChart = () => (
    <Box width="100%" height="300px">
      <ResponsiveContainer>
        <BarChart data={components}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar 
            dataKey="performanceMetrics.successRate" 
            fill={COLORS.openRate} 
            name="Success Rate" 
          />
          <Bar 
            dataKey="performanceMetrics.averageExecutionTime" 
            fill={COLORS.clickRate} 
            name="Avg. Execution Time (ms)" 
          />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );

  // Future Predictions Pie Chart
  const FuturePredictionsChart = () => (
    <Box width="100%" height="300px">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={[
              { name: 'Open Rate Prediction', value: futurePredictions[0] },
              { name: 'Click Rate Prediction', value: futurePredictions[1] },
              { name: 'Conversion Rate Prediction', value: futurePredictions[2] }
            ]}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {[0, 1, 2].map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={Object.values(COLORS)[index]} 
              />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );

  return (
    <VStack 
      spacing={6} 
      align="stretch" 
      width="100%" 
      p={6} 
      bg="white" 
      borderRadius="md" 
      boxShadow="md"
    >
      <HStack justifyContent="space-between" alignItems="center">
        <Heading size="md">
          Performance Insights: {workflowName}
        </Heading>
        <PerformanceTrendBadge />
      </HStack>

      <HStack spacing={6}>
        <VStack flex={1} spacing={4}>
          <Text fontWeight="bold">Performance Metrics</Text>
          <PerformanceMetricsChart />
        </VStack>
        
        <VStack flex={1} spacing={4}>
          <Text fontWeight="bold">Component Performance</Text>
          <ComponentPerformanceChart />
        </VStack>
      </HStack>

      <VStack spacing={4}>
        <Text fontWeight="bold">Future Performance Predictions</Text>
        <FuturePredictionsChart />
      </VStack>
    </VStack>
  );
};

export default PerformanceInsightsPanel;
