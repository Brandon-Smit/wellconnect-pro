import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface Campaign {
  id: string;
  name: string;
  status: string;
  performanceMetrics: {
    openRate: number;
    clickRate: number;
    conversionRate: number;
  };
}

interface CampaignOverviewProps {
  campaigns: Campaign[];
  onCreateCampaign: () => void;
}

const CampaignOverview: React.FC<CampaignOverviewProps> = ({ 
  campaigns, 
  onCreateCampaign 
}) => {
  // Performance status colors
  const COLORS = {
    high: '#4CAF50',   // Green
    medium: '#FFC107', // Yellow
    low: '#F44336'     // Red
  };

  // Categorize campaign performance
  const getCampaignPerformanceStatus = (campaign: Campaign) => {
    const avgPerformance = (
      campaign.performanceMetrics.openRate + 
      campaign.performanceMetrics.clickRate + 
      campaign.performanceMetrics.conversionRate
    ) / 3;

    if (avgPerformance > 0.7) return 'high';
    if (avgPerformance > 0.3) return 'medium';
    return 'low';
  };

  // Prepare data for performance chart
  const performanceData = campaigns.map(campaign => ({
    name: campaign.name,
    value: campaign.performanceMetrics.conversionRate * 100,
    status: getCampaignPerformanceStatus(campaign)
  }));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold text-wellconnect-primary">
          Campaign Overview
        </h2>
        <button 
          onClick={onCreateCampaign}
          className="bg-wellconnect-secondary text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
        >
          Create New Campaign
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-medium mb-2">Campaign Performance</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={performanceData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {performanceData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[entry.status]} 
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Campaign Summary</h3>
          <ul className="space-y-2">
            {campaigns.map(campaign => (
              <li 
                key={campaign.id} 
                className="flex justify-between items-center bg-gray-100 p-2 rounded"
              >
                <span>{campaign.name}</span>
                <span 
                  className={`px-2 py-1 rounded text-xs ${
                    getCampaignPerformanceStatus(campaign) === 'high' 
                      ? 'bg-green-200 text-green-800'
                      : getCampaignPerformanceStatus(campaign) === 'medium'
                      ? 'bg-yellow-200 text-yellow-800'
                      : 'bg-red-200 text-red-800'
                  }`}
                >
                  {campaign.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CampaignOverview;
