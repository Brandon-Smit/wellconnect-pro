import React from 'react';
import { affiliateLinkManager } from '../../affiliate/affiliateLinkManager';

export const RevenueCard: React.FC = () => {
  const affiliateReport = affiliateLinkManager.generatePerformanceReport();

  const totalRevenue = affiliateReport.linkPerformance.reduce(
    (total, link) => total + (link.conversionCount * 10), // Assuming $10 per conversion
    0
  );

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Affiliate Revenue</h2>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-lg">Total Revenue</span>
          <span className="text-2xl font-bold text-green-600">
            ${totalRevenue.toLocaleString()}
          </span>
        </div>
        <div>
          <h3 className="font-medium mb-2">Top Performing Categories</h3>
          {Object.entries(affiliateReport.topPerformingCategories)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([category, conversions]) => (
              <div 
                key={category} 
                className="flex justify-between text-sm text-gray-600 py-1"
              >
                <span className="capitalize">{category.replace('_', ' ')}</span>
                <span>{conversions} conversions</span>
              </div>
            ))}
        </div>
        <div className="mt-4">
          <h3 className="font-medium mb-2">Link Performance</h3>
          <ul className="text-sm text-gray-600">
            {affiliateReport.linkPerformance.slice(0, 3).map((link, index) => (
              <li 
                key={link.id} 
                className="py-1 flex justify-between items-center"
              >
                <span>{link.serviceCategory}</span>
                <span 
                  className={`
                    px-2 py-1 rounded-full text-xs 
                    ${link.conversionRate > 0.05 ? 'bg-green-100 text-green-800' : 
                      link.conversionRate > 0.02 ? 'bg-yellow-100 text-yellow-800' : 
                      'bg-red-100 text-red-800'}
                  `}
                >
                  {(link.conversionRate * 100).toFixed(2)}% CR
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
