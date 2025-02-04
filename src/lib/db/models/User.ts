import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// Zod validation schema for user
export const UserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  role: z.enum(['admin', 'user', 'affiliate']).default('user'),
  isVerified: z.boolean().default(false),
  organizationName: z.string().optional(),
  companySize: z.enum(['startup', 'small', 'medium', 'enterprise']).optional()
});

// Mongoose schema and model
const userMongooseSchema = new mongoose.Schema({
  email: {
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String, 
    required: true
  },
  firstName: {
    type: String, 
    required: true
  },
  lastName: {
    type: String, 
    required: true
  },
  role: {
    type: String, 
    enum: ['admin', 'user', 'affiliate'],
    default: 'user'
  },
  isVerified: {
    type: Boolean, 
    default: false
  },
  organizationName: String,
  companySize: {
    type: String,
    enum: ['startup', 'small', 'medium', 'enterprise']
  },
  lastLogin: Date,
  passwordResetToken: String,
  passwordResetExpires: Date
}, {
  timestamps: true
});

// Password hashing middleware
userMongooseSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified
  if (!this.isModified('password')) return next();

  try {
    // Generate a salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash the password
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as mongoose.CallbackError);
  }
});

// Method to check password
userMongooseSchema.methods.comparePassword = async function(candidatePassword: string) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Create the model
export const User = mongoose.model('User', userMongooseSchema);

// Type for TypeScript
export type UserDocument = mongoose.Document & {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user' | 'affiliate';
  isVerified: boolean;
  organizationName?: string;
  companySize?: 'startup' | 'small' | 'medium' | 'enterprise';
  comparePassword(candidatePassword: string): Promise<boolean>;
};
