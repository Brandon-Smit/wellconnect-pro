import type { NextApiRequest, NextApiResponse } from 'next';
import { EmailConfigSchema } from '@/lib/validations';
import { withAuth } from '@/lib/auth';
import { withPerformanceTracking } from '@/lib/performance';

// In-memory storage (replace with secure storage in production)
let emailConfig: any = null;

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = (req as any).user;

  switch (req.method) {
    case 'POST':
      try {
        // Validate input
        const validatedData = EmailConfigSchema.parse(req.body);
        
        // Store email configuration
        emailConfig = {
          ...validatedData,
          configuredAt: new Date().toISOString(),
          configuredBy: user.id,
        };
        
        res.status(200).json({ 
          message: 'Email configuration saved successfully',
          configuredAt: emailConfig.configuredAt 
        });
      } catch (error) {
        res.status(400).json({ 
          error: 'Invalid email configuration', 
          details: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
      break;

    case 'GET':
      // Return current email configuration (without sensitive details)
      if (emailConfig) {
        const { password, ...safeConfig } = emailConfig;
        res.status(200).json(safeConfig);
      } else {
        res.status(404).json({ error: 'No email configuration found' });
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default withAuth(withPerformanceTracking(handler));
