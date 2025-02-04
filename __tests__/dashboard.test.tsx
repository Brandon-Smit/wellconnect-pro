import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '@/pages/dashboard';
import { AuthProvider } from '@/lib/context/AuthContext';
import { EmailCampaign, ComplianceLog } from '@/lib/db/models';

// Mock dependencies
jest.mock('@/lib/db/models', () => ({
  EmailCampaign: {
    find: jest.fn().mockResolvedValue([
      {
        _id: 'test-campaign-1',
        name: 'Test Campaign 1',
        status: 'draft',
        performanceMetrics: { openRate: 50, clickRate: 25 }
      }
    ])
  },
  ComplianceLog: {
    find: jest.fn().mockResolvedValue([
      {
        _id: 'test-log-1',
        action: 'sent',
        timestamp: new Date(),
        campaignId: 'test-campaign-1'
      }
    ])
  }
}));

jest.mock('@/lib/context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({
    user: {
      email: 'test@wellconnect.pro',
      name: 'Test User'
    },
    logout: jest.fn()
  })
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    render(
      <AuthProvider>
        <Dashboard />
      </AuthProvider>
    );
  });

  test('Renders Dashboard Elements', async () => {
    await waitFor(() => {
      expect(screen.getByText(/WellConnect Pro Dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/test@wellconnect.pro/i)).toBeInTheDocument();
      expect(screen.getByText(/Create New Campaign/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('Displays Campaign Information', async () => {
    await waitFor(() => {
      expect(screen.getByText(/Test Campaign 1/i)).toBeInTheDocument();
      expect(screen.getByText(/Open Rate: 50%/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('Displays Compliance Logs', async () => {
    await waitFor(() => {
      expect(screen.getByText(/Campaign: test-campaign-1/i)).toBeInTheDocument();
      expect(screen.getByText(/Action: sent/i)).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});
