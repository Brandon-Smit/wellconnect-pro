import mongoose from 'mongoose';
import { authService } from '@/lib/services/auth-service';
import { User } from '@/lib/db/models/User';

describe('Authentication Service', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'StrongPassword123!',
    firstName: 'Test',
    lastName: 'User'
  };

  beforeAll(async () => {
    const mongoUri = global.__MONGO_URI__;
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  }, 30000);

  afterAll(async () => {
    await mongoose.disconnect();
  }, 30000);

  beforeEach(async () => {
    await User.deleteMany({});
  }, 30000);

  test('registers a new user successfully', async () => {
    const result = await authService.register(testUser);

    expect(result.token).toBeTruthy();
    expect(result.user.email).toBe(testUser.email);
    
    const savedUser = await User.findOne({ email: testUser.email });
    expect(savedUser).toBeTruthy();
    expect(savedUser?.isVerified).toBe(false);
  }, 30000);

  test('prevents registering a user with an existing email', async () => {
    // First registration
    await authService.register(testUser);

    // Second registration with same email
    await expect(authService.register(testUser)).rejects.toThrow('User already exists');
  }, 30000);

  test('logs in a registered user', async () => {
    // First register the user
    await authService.register(testUser);

    // Then login
    const result = await authService.login({
      email: testUser.email,
      password: testUser.password
    });

    expect(result.token).toBeTruthy();
    expect(result.user.email).toBe(testUser.email);
  }, 30000);

  test('fails login with incorrect password', async () => {
    // First register the user
    await authService.register(testUser);

    // Try login with wrong password
    await expect(authService.login({
      email: testUser.email,
      password: 'WrongPassword123!'
    })).rejects.toThrow('Failed to login');
  }, 30000);

  test('verifies a valid JWT token', async () => {
    // First register the user
    const { token } = await authService.register(testUser);

    // Verify the token
    const verifiedUser = await authService.verifyToken(token);

    expect(verifiedUser.email).toBe(testUser.email);
  }, 30000);

  test('initiates password reset', async () => {
    // First register the user
    await authService.register(testUser);

    // Initiate password reset
    const resetToken = await authService.resetPassword(testUser.email);

    expect(resetToken).toBeTruthy();
  }, 30000);

  test('confirms password reset', async () => {
    // First register the user
    await authService.register(testUser);

    // Initiate password reset
    const resetToken = await authService.resetPassword(testUser.email);

    // Confirm password reset
    const result = await authService.confirmPasswordReset(
      resetToken, 
      'NewStrongPassword456!'
    );

    expect(result).toBe(true);

    // Try logging in with new password
    const loginResult = await authService.login({
      email: testUser.email,
      password: 'NewStrongPassword456!'
    });

    expect(loginResult.user.email).toBe(testUser.email);
  }, 30000);
});
