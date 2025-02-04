import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface ComplianceReport {
  totalContacts: number;
  blockedContacts: number;
  optedOutContacts: number;
  recentLogs: Array<{
    timestamp: Date;
    action: string;
    reason: string;
    contactEmail: string;
  }>;
}

interface CompliancePanelProps {
  complianceReport: ComplianceReport | null;
}

const CompliancePanel: React.FC<CompliancePanelProps> = ({ complianceReport }) => {
  if (!complianceReport) {
    return <div>Loading compliance data...</div>;
  }

  // Prepare data for compliance chart
  const complianceData = [
    { 
      name: 'Total Contacts', 
      value: complianceReport.totalContacts,
      fill: '#8884d8'
    },
    { 
      name: 'Blocked Contacts', 
      value: complianceReport.blockedContacts,
      fill: '#FF6384'
    },
    { 
      name: 'Opted Out Contacts', 
      value: complianceReport.optedOutContacts,
      fill: '#FFCE56'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold text-wellconnect-primary mb-4">
        Compliance Dashboard
      </h2>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Compliance Visualization */}
        <div>
          <h3 className="text-lg font-medium mb-2">Compliance Overview</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={complianceData}>
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Compliance Logs */}
        <div>
          <h3 className="text-lg font-medium mb-2">Recent Compliance Actions</h3>
          <div className="max-h-[250px] overflow-y-auto">
            {complianceReport.recentLogs.map((log, index) => (
              <div 
                key={index} 
                className="bg-gray-100 p-3 rounded-md mb-2 last:mb-0"
              >
                <div className="flex justify-between">
                  <span className={`font-medium ${
                    log.action === 'block' 
                      ? 'text-red-600' 
                      : log.action === 'allow'
                      ? 'text-green-600'
                      : 'text-yellow-600'
                  }`}>
                    {log.action}
                  </span>
                  <span className="text-sm text-gray-500">
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mt-1">
                  {log.reason}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Contact: {log.contactEmail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Compliance Summary */}
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="bg-green-50 p-3 rounded-md text-center">
          <h4 className="font-semibold text-green-800">Total Contacts</h4>
          <p className="text-2xl text-green-600">
            {complianceReport.totalContacts}
          </p>
        </div>
        <div className="bg-red-50 p-3 rounded-md text-center">
          <h4 className="font-semibold text-red-800">Blocked</h4>
          <p className="text-2xl text-red-600">
            {complianceReport.blockedContacts}
          </p>
        </div>
        <div className="bg-yellow-50 p-3 rounded-md text-center">
          <h4 className="font-semibold text-yellow-800">Opted Out</h4>
          <p className="text-2xl text-yellow-600">
            {complianceReport.optedOutContacts}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CompliancePanel;
