import type { NextApiRequest, NextApiResponse } from 'next';
import { AffiliateLinkSchema } from '@/lib/validations';
import { withAuth } from '@/lib/auth';
import { withPerformanceTracking } from '@/lib/performance';

// In-memory storage (replace with database in production)
const affiliateLinks: any[] = [];

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = (req as any).user;

  switch (req.method) {
    case 'POST':
      try {
        // Validate input
        const validatedData = AffiliateLinkSchema.parse(req.body);
        
        // Create affiliate link
        const newLink = {
          ...validatedData,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          createdBy: user.id,
        };
        
        affiliateLinks.push(newLink);
        
        res.status(201).json(newLink);
      } catch (error) {
        res.status(400).json({ 
          error: 'Invalid input', 
          details: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
      break;

    case 'GET':
      // Return affiliate links (potentially filtered by user in production)
      res.status(200).json(affiliateLinks);
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default withAuth(withPerformanceTracking(handler));
