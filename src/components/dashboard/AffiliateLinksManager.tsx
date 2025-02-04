import React, { useState } from 'react';
import { affiliateLinkService } from '@/services';

interface AffiliateLink {
  id: string;
  serviceName: string;
  affiliateUrl: string;
  ethicalScore: number;
  performanceMetrics: {
    totalClicks: number;
    totalConversions: number;
    revenue: number;
  };
}

interface AffiliateLinksManagerProps {
  links: AffiliateLink[];
}

const AffiliateLinksManager: React.FC<AffiliateLinksManagerProps> = ({ links }) => {
  const [newLink, setNewLink] = useState({
    serviceName: '',
    affiliateUrl: '',
    description: ''
  });

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await affiliateLinkService.createLink(newLink);
      // Reset form or show success message
      setNewLink({
        serviceName: '',
        affiliateUrl: '',
        description: ''
      });
    } catch (error) {
      console.error('Failed to create affiliate link:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-semibold text-wellconnect-primary mb-4">
        Affiliate Links
      </h2>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Existing Links */}
        <div>
          <h3 className="text-lg font-medium mb-2">Current Links</h3>
          <ul className="space-y-2">
            {links.map(link => (
              <li 
                key={link.id} 
                className="bg-gray-100 p-3 rounded-md flex justify-between items-center"
              >
                <div>
                  <p className="font-semibold">{link.serviceName}</p>
                  <p className="text-sm text-gray-600 truncate">{link.affiliateUrl}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${
                    link.ethicalScore >= 7 
                      ? 'text-green-600' 
                      : link.ethicalScore >= 5 
                      ? 'text-yellow-600' 
                      : 'text-red-600'
                  }`}>
                    Ethical Score: {link.ethicalScore}/10
                  </p>
                  <p className="text-sm text-gray-500">
                    Clicks: {link.performanceMetrics.totalClicks}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Create New Link Form */}
        <div>
          <h3 className="text-lg font-medium mb-2">Add New Link</h3>
          <form onSubmit={handleCreateLink} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Service Name
              </label>
              <input
                type="text"
                value={newLink.serviceName}
                onChange={(e) => setNewLink(prev => ({
                  ...prev, 
                  serviceName: e.target.value
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Affiliate URL
              </label>
              <input
                type="url"
                value={newLink.affiliateUrl}
                onChange={(e) => setNewLink(prev => ({
                  ...prev, 
                  affiliateUrl: e.target.value
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={newLink.description}
                onChange={(e) => setNewLink(prev => ({
                  ...prev, 
                  description: e.target.value
                }))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                rows={3}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-wellconnect-secondary text-white py-2 rounded-md hover:bg-blue-600 transition-colors"
            >
              Create Affiliate Link
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AffiliateLinksManager;
