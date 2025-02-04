import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

// In a real application, use a more secure method like JWT or OAuth
const MOCK_USERS = [
  {
    id: '1',
    email: 'admin@wellconnectpro.com',
    // Hashed password: 'wellconnect2025'
    passwordHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', 
    role: 'admin'
  }
];

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function authenticateUser(email: string, password: string) {
  const user = MOCK_USERS.find(u => u.email === email);
  if (!user) return null;

  const hashedPassword = hashPassword(password);
  return user.passwordHash === hashedPassword ? user : null;
}

export function withAuth(handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void> | void) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // In a real app, validate JWT or session token
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Basic auth simulation
    const [email, password] = Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    
    const user = authenticateUser(email, password);
    
    if (!user) {
      return res.status(403).json({ error: 'Invalid credentials' });
    }

    // Attach user to request
    (req as any).user = user;

    return handler(req, res);
  };
}

export function generateApiKey(userId: string): string {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(16).toString('hex');
  return crypto.createHash('sha256')
    .update(`${userId}-${timestamp}-${randomBytes}`)
    .digest('hex');
}
