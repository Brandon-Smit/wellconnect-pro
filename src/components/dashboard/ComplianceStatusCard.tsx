import React from 'react';
import { complianceRuleEngine } from '../../compliance/complianceRuleEngine';
import { consentManagement } from '../../compliance/consentManagement';

export const ComplianceStatusCard: React.FC = () => {
  const complianceReport = complianceRuleEngine.generateComplianceReport();
  const consentReport = consentManagement.generateConsentReport();

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Compliance Status</h2>
      <div className="space-y-4">
        <div>
          <h3 className="font-medium">Compliance Rules</h3>
          <div className="flex justify-between">
            <span>Total Rules</span>
            <span className="font-bold">{complianceReport.totalRules}</span>
          </div>
          {Object.entries(complianceReport.rulesByRegulation).map(([reg, count]) => (
            <div key={reg} className="flex justify-between text-sm text-gray-600">
              <span>{reg}</span>
              <span>{count}</span>
            </div>
          ))}
        </div>
        <div>
          <h3 className="font-medium">Consent Management</h3>
          <div className="flex justify-between">
            <span>Total Consents</span>
            <span className="font-bold">{consentReport.totalConsents}</span>
          </div>
          {Object.entries(consentReport.consentsByStatus).map(([status, count]) => (
            <div key={status} className="flex justify-between text-sm text-gray-600">
              <span>{status}</span>
              <span>{count}</span>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <h3 className="font-medium mb-2">Compliance Alerts</h3>
          <ul className="text-sm text-gray-600">
            {complianceReport.recentViolations.slice(0, 3).map((violation, index) => (
              <li key={index} className="py-1 text-red-600">
                {violation.dataType} - {violation.violations.length} violations
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
