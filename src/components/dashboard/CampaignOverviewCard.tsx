import React from 'react';
import { workflowOrchestrator } from '../../orchestration/workflowOrchestrator';

export const CampaignOverviewCard: React.FC = () => {
  const campaigns = workflowOrchestrator.listCampaigns();

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Campaign Overview</h2>
      <div className="space-y-4">
        <div className="flex justify-between">
          <span>Total Campaigns</span>
          <span className="font-bold">{campaigns.length}</span>
        </div>
        <div className="flex justify-between">
          <span>Active Campaigns</span>
          <span className="font-bold text-green-600">
            {campaigns.filter(c => c.status === 'active').length}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Paused Campaigns</span>
          <span className="font-bold text-yellow-600">
            {campaigns.filter(c => c.status === 'paused').length}
          </span>
        </div>
        <div className="mt-4">
          <h3 className="font-medium mb-2">Recent Campaigns</h3>
          <ul className="text-sm text-gray-600">
            {campaigns.slice(0, 3).map((campaign) => (
              <li key={campaign.id} className="py-1 flex justify-between">
                <span>{campaign.name}</span>
                <span 
                  className={`
                    px-2 py-1 rounded-full text-xs 
                    ${campaign.status === 'active' ? 'bg-green-100 text-green-800' : 
                      campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-gray-100 text-gray-800'}
                  `}
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
