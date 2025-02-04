import React from 'react';
import { 
  PerformanceCard, 
  CampaignOverviewCard, 
  ComplianceStatusCard, 
  RevenueCard 
} from '../../components/dashboard';
import { 
  Box, 
  Flex, 
  Heading, 
  VStack, 
  HStack, 
  Text, 
  Card, 
  CardHeader, 
  CardBody, 
  CardFooter, 
  Button, 
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Progress,
  Tooltip
} from '@chakra-ui/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  complianceService, 
  dispatchService, 
  contentGenerationService, 
  emailDiscoveryService 
} from '@/services';

// Dashboard component for WellConnect Pro
export default function DashboardPage() {
  // State management
  const [emailStats, setEmailStats] = useState({
    totalDispatched: 0,
    deliveryRate: 0,
    openRate: 0,
    clickRate: 0
  });

  const [complianceStats, setComplianceStats] = useState({
    blockedContacts: 0,
    ethicalScore: 0,
    sensitivityChecks: 0
  });

  const [contentGenerationStats, setContentGenerationStats] = useState({
    totalContentGenerated: 0,
    averageEthicalScore: 0,
    contentTypes: []
  });

  const [emailDiscoveryStats, setEmailDiscoveryStats] = useState({
    totalCompaniesDiscovered: 0,
    industriesReached: [],
    averageCompanyEthicalScore: 0
  });

  // Fetch dashboard data
  useEffect(() => {
    async function fetchDashboardData() {
      // Email dispatch statistics
      const dispatchStats = dispatchService.getDispatchStatistics();
      setEmailStats(dispatchStats);

      // Compliance statistics
      const blockedContacts = complianceService.getBlockedContacts().length;
      const ethicalScore = complianceService.getOverallEthicalScore();
      const sensitivityChecks = complianceService.getTotalSensitivityChecks();
      setComplianceStats({ 
        blockedContacts, 
        ethicalScore, 
        sensitivityChecks 
      });

      // Content generation statistics
      const generatedContent = contentGenerationService.getGeneratedContent();
      setContentGenerationStats({
        totalContentGenerated: generatedContent.length,
        averageEthicalScore: generatedContent.reduce((sum, content) => sum + content.ethicalScore, 0) / generatedContent.length,
        contentTypes: generatedContent.map(content => content.type)
      });

      // Email discovery statistics
      const discoveredCompanies = emailDiscoveryService.findCompanies({});
      setEmailDiscoveryStats({
        totalCompaniesDiscovered: discoveredCompanies.length,
        industriesReached: [...new Set(discoveredCompanies.map(company => company.industry))],
        averageCompanyEthicalScore: discoveredCompanies.reduce((sum, company) => sum + company.ethicalScore, 0) / discoveredCompanies.length
      });
    }

    fetchDashboardData();
  }, []);

  // Email dispatch performance data
  const emailPerformanceData = [
    { name: 'Week 1', dispatched: 100, delivered: 85, opened: 50, clicked: 20 },
    { name: 'Week 2', dispatched: 150, delivered: 130, opened: 80, clicked: 35 },
    { name: 'Week 3', dispatched: 200, delivered: 170, opened: 110, clicked: 55 },
    { name: 'Week 4', dispatched: 250, delivered: 210, opened: 140, clicked: 75 }
  ];

  return (
    <Box p={8} bg="gray.50" minHeight="100vh">
      <Heading mb={8} textAlign="center" color="blue.600">
        WellConnect Pro Dashboard
      </Heading>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={6}>
        <PerformanceCard />
        <CampaignOverviewCard />
        <ComplianceStatusCard />
        <RevenueCard />
        
        {/* Additional Widgets */}
        <div className="md:col-span-2 lg:col-span-4">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={emailPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <RechartsTooltip />
              <Legend />
              <Line type="monotone" dataKey="dispatched" stroke="#8884d8" />
              <Line type="monotone" dataKey="delivered" stroke="#82ca9d" />
              <Line type="monotone" dataKey="opened" stroke="#ffc658" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="md:col-span-2">
          <VStack align="stretch" spacing={4}>
            <Stat>
              <StatLabel>Blocked Contacts</StatLabel>
              <StatNumber>{complianceStats.blockedContacts}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Ethical Score</StatLabel>
              <StatNumber>{complianceStats.ethicalScore.toFixed(2)}/10</StatNumber>
              <Progress 
                value={complianceStats.ethicalScore * 10} 
                colorScheme={complianceStats.ethicalScore > 7 ? 'green' : 'yellow'} 
              />
            </Stat>
            <Stat>
              <StatLabel>Sensitivity Checks</StatLabel>
              <StatNumber>{complianceStats.sensitivityChecks}</StatNumber>
            </Stat>
          </VStack>
        </div>
        
        <div className="md:col-span-2">
          <VStack align="stretch" spacing={4}>
            <Stat>
              <StatLabel>Total Content Generated</StatLabel>
              <StatNumber>{contentGenerationStats.totalContentGenerated}</StatNumber>
            </Stat>
            <Stat>
              <StatLabel>Average Ethical Score</StatLabel>
              <StatNumber>{contentGenerationStats.averageEthicalScore.toFixed(2)}/10</StatNumber>
              <Progress 
                value={contentGenerationStats.averageEthicalScore * 10} 
                colorScheme={contentGenerationStats.averageEthicalScore > 7 ? 'green' : 'yellow'} 
              />
            </Stat>
            <Stat>
              <StatLabel>Content Types</StatLabel>
              <Text>{contentGenerationStats.contentTypes.join(', ')}</Text>
            </Stat>
          </VStack>
        </div>
      </SimpleGrid>
    </Box>
  );
}
