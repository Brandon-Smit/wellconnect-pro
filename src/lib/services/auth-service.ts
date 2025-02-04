import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { User, UserDocument } from '@/lib/db/models/User';
import { complianceService } from './compliance-service';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development';
const JWT_EXPIRATION = '7d';

// Input Schemas
export const RegisterInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  organizationName: z.string().optional(),
  companySize: z.enum(['startup', 'small', 'medium', 'enterprise']).optional()
});

export const LoginInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export type RegisterInput = z.infer<typeof RegisterInputSchema>;
export type LoginInput = z.infer<typeof LoginInputSchema>;

export class AuthService {
  async register(input: RegisterInput) {
    // Validate input
    const validatedInput = RegisterInputSchema.parse(input);

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: validatedInput.email });
      if (existingUser) {
        throw new Error('User already exists');
      }

      // Create new user
      const user = new User({
        ...validatedInput,
        isVerified: false
      });

      const savedUser = await user.save();

      // Log user registration
      await complianceService.logAction({
        campaignId: 'user-registration',
        action: 'registered',
        metadata: {
          userId: savedUser._id,
          email: savedUser.email
        }
      });

      return this.generateAuthToken(savedUser);
    } catch (error) {
      console.error('Registration Error:', error);
      throw new Error('Failed to register user');
    }
  }

  async login(input: LoginInput) {
    // Validate input
    const validatedInput = LoginInputSchema.parse(input);

    try {
      // Find user by email
      const user = await User.findOne({ email: validatedInput.email });
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check password
      const isMatch = await user.comparePassword(validatedInput.password);
      if (!isMatch) {
        throw new Error('Invalid credentials');
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Log user login
      await complianceService.logAction({
        campaignId: 'user-login',
        action: 'logged_in',
        metadata: {
          userId: user._id,
          email: user.email
        }
      });

      return this.generateAuthToken(user);
    } catch (error) {
      console.error('Login Error:', error);
      throw new Error('Failed to login');
    }
  }

  private generateAuthToken(user: UserDocument) {
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id, 
        email: user.email, 
        role: user.role 
      }, 
      JWT_SECRET, 
      { expiresIn: JWT_EXPIRATION }
    );

    return {
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    };
  }

  async verifyToken(token: string) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { 
        id: string, 
        email: string, 
        role: string 
      };

      // Find user
      const user = await User.findById(decoded.id);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user._id,
        email: user.email,
        role: user.role
      };
    } catch (error) {
      console.error('Token Verification Error:', error);
      throw new Error('Invalid or expired token');
    }
  }

  async resetPassword(email: string) {
    try {
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('User not found');
      }

      // Generate password reset token
      const resetToken = jwt.sign(
        { id: user._id }, 
        JWT_SECRET, 
        { expiresIn: '1h' }
      );

      // Store reset token and expiration
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = new Date(Date.now() + 3600000); // 1 hour
      await user.save();

      // Log password reset request
      await complianceService.logAction({
        campaignId: 'password-reset',
        action: 'reset_requested',
        metadata: {
          userId: user._id,
          email: user.email
        }
      });

      return resetToken;
    } catch (error) {
      console.error('Password Reset Error:', error);
      throw new Error('Failed to initiate password reset');
    }
  }

  async confirmPasswordReset(token: string, newPassword: string) {
    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

      const user = await User.findOne({ 
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() }
      });

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      // Update password
      user.password = newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      // Log password reset
      await complianceService.logAction({
        campaignId: 'password-reset',
        action: 'reset_completed',
        metadata: {
          userId: user._id,
          email: user.email
        }
      });

      return true;
    } catch (error) {
      console.error('Password Reset Confirmation Error:', error);
      throw new Error('Failed to reset password');
    }
  }
}

export const authService = new AuthService();
