import React from 'react';
import Link from 'next/link';
import { 
  DashboardIcon, 
  CampaignIcon, 
  AnalyticsIcon, 
  ComplianceIcon, 
  SettingsIcon 
} from './Icons';

const Sidebar: React.FC = () => {
  const menuItems = [
    { 
      label: 'Dashboard', 
      href: '/dashboard', 
      icon: <DashboardIcon /> 
    },
    { 
      label: 'Campaigns', 
      href: '/campaigns', 
      icon: <CampaignIcon /> 
    },
    { 
      label: 'Analytics', 
      href: '/analytics', 
      icon: <AnalyticsIcon /> 
    },
    { 
      label: 'Compliance', 
      href: '/compliance', 
      icon: <ComplianceIcon /> 
    },
    { 
      label: 'Settings', 
      href: '/settings', 
      icon: <SettingsIcon /> 
    }
  ];

  return (
    <aside className="w-64 bg-white border-r shadow-md">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-8">
          WellConnect Pro
        </h1>
        <nav>
          {menuItems.map((item) => (
            <Link 
              key={item.href}
              href={item.href}
              className="flex items-center p-3 hover:bg-gray-100 rounded-lg transition-colors group"
            >
              <span className="mr-4 text-gray-500 group-hover:text-blue-600">
                {item.icon}
              </span>
              <span className="text-gray-700 group-hover:text-blue-600">
                {item.label}
              </span>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
