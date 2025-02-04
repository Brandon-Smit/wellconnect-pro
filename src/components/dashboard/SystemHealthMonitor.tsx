import React from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon 
} from '@heroicons/react/24/solid';

interface SystemHealthStatus {
  emailDiscovery: {
    status: string;
    contactsDiscovered?: number;
    error?: string;
  };
  dispatch: {
    status: string;
    remainingEmailQuota: number;
  };
  compliance: {
    status: string;
    totalContacts: number;
    blockedContacts: number;
    optedOutContacts: number;
  };
  affiliateLinks: {
    status: string;
    totalEthicalLinks: number;
  };
}

interface SystemHealthMonitorProps {
  healthStatus: SystemHealthStatus | null;
}

const SystemHealthMonitor: React.FC<SystemHealthMonitorProps> = ({ healthStatus }) => {
  if (!healthStatus) {
    return <div>Loading system health...</div>;
  }

  // Status icon mapping
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />;
      case 'critical':
      case 'degraded':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      default:
        return null;
    }
  };

  // Render health component
  const HealthComponent = ({ 
    title, 
    status, 
    details 
  }: { 
    title: string; 
    status: string; 
    details: React.ReactNode 
  }) => (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        {getStatusIcon(status)}
      </div>
      <div className="text-sm text-gray-600">
        {details}
      </div>
    </div>
  );

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h2 className="text-2xl font-semibold text-wellconnect-primary mb-4">
        System Health Monitor
      </h2>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Email Discovery Health */}
        <HealthComponent 
          title="Email Discovery"
          status={healthStatus.emailDiscovery.status}
          details={
            healthStatus.emailDiscovery.status === 'healthy' ? (
              <p>
                Contacts Discovered: 
                {healthStatus.emailDiscovery.contactsDiscovered}
              </p>
            ) : (
              <p className="text-red-600">
                {healthStatus.emailDiscovery.error}
              </p>
            )
          }
        />

        {/* Dispatch Service Health */}
        <HealthComponent 
          title="Email Dispatch"
          status={healthStatus.dispatch.status}
          details={
            <p>
              Remaining Email Quota: 
              {healthStatus.dispatch.remainingEmailQuota}
            </p>
          }
        />

        {/* Compliance Health */}
        <HealthComponent 
          title="Compliance Management"
          status={healthStatus.compliance.status}
          details={
            <div>
              <p>Total Contacts: {healthStatus.compliance.totalContacts}</p>
              <p>Blocked Contacts: {healthStatus.compliance.blockedContacts}</p>
              <p>Opted Out Contacts: {healthStatus.compliance.optedOutContacts}</p>
            </div>
          }
        />

        {/* Affiliate Links Health */}
        <HealthComponent 
          title="Affiliate Links"
          status={healthStatus.affiliateLinks.status}
          details={
            <p>
              Ethical Links: 
              {healthStatus.affiliateLinks.totalEthicalLinks}
            </p>
          }
        />
      </div>

      {/* Overall System Status */}
      <div className="mt-6 bg-white p-4 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-2">
          Overall System Status
        </h3>
        <div className="flex items-center">
          {getStatusIcon(
            ['emailDiscovery', 'dispatch', 'compliance', 'affiliateLinks']
              .every(key => healthStatus[key].status === 'healthy') 
              ? 'healthy' 
              : 'warning'
          )}
          <span className="ml-2 text-gray-700">
            {['emailDiscovery', 'dispatch', 'compliance', 'affiliateLinks']
              .every(key => healthStatus[key].status === 'healthy') 
              ? 'All Systems Operational' 
              : 'Some Systems Require Attention'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthMonitor;
