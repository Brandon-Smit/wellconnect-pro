import React from 'react';
import { performanceDashboard } from '../../performance/performanceDashboard';

export const PerformanceCard: React.FC = () => {
  const performanceReport = performanceDashboard.generatePerformanceReport();

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">System Performance</h2>
      <div className="space-y-4">
        <div>
          <p>CPU Usage: {performanceReport.systemOverview.cpuUsage.toFixed(2)}%</p>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{width: `${performanceReport.systemOverview.cpuUsage}%`}}
            ></div>
          </div>
        </div>
        <div>
          <p>Memory Usage: {performanceReport.systemOverview.memoryUsage.toFixed(2)}%</p>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-green-600 h-2.5 rounded-full" 
              style={{width: `${performanceReport.systemOverview.memoryUsage}%`}}
            ></div>
          </div>
        </div>
        <div>
          <h3 className="font-medium">Recent Alerts</h3>
          <ul className="text-sm text-gray-600">
            {performanceReport.alerts.slice(0, 3).map((alert, index) => (
              <li key={index} className="py-1">
                {alert.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
