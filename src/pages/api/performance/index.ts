import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/auth';
import { performanceTracker } from '@/lib/performance';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = (req as any).user;

  switch (req.method) {
    case 'GET':
      try {
        // Get performance summary for the authenticated user
        const summary = performanceTracker.generatePerformanceSummary(user.id);
        res.status(200).json(summary);
      } catch (error) {
        res.status(500).json({ 
          error: 'Failed to retrieve performance metrics', 
          details: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
      break;

    default:
      res.setHeader('Allow', ['GET']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default withAuth(handler);
