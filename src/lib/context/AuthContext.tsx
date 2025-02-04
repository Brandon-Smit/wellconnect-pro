import React, { createContext, useState, useContext, useEffect } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile, User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, firestore } from '@/lib/firebase/clientApp';

// Enhanced user profile interface
interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  role: 'admin' | 'user' | 'hr_professional';
  companyName?: string;
  companySize?: number;
  industry?: string;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  ethicalMarketingPreferences: {
    mentalHealthFocus: boolean;
    communicationConsent: boolean;
  };
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    additionalInfo: Partial<UserProfile>
  ) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signUp: async () => { },
  signIn: async () => { },
  logout: async () => { },
  resetPassword: async () => { },
  updateUserProfile: async () => { }
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        await fetchUserProfile(firebaseUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const fetchUserProfile = async (firebaseUser: FirebaseUser) => {
    try {
      const userDocRef = doc(firestore, 'users', firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const profileData = userDoc.data() as UserProfile;
        setUser({
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || profileData.displayName,
          ...profileData
        });
      } else {
        // Create default profile if not exists
        const defaultProfile: UserProfile = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || '',
          role: 'user',
          subscriptionTier: 'free',
          ethicalMarketingPreferences: {
            mentalHealthFocus: true,
            communicationConsent: true
          }
        };
        await setDoc(userDocRef, defaultProfile);
        setUser(defaultProfile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    additionalInfo: Partial<UserProfile>
  ) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const firebaseUser = userCredential.user;

      // Update Firebase profile
      await updateProfile(firebaseUser, {
        displayName: additionalInfo.displayName
      });

      // Create Firestore user profile
      const userProfile: UserProfile = {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        displayName: additionalInfo.displayName || '',
        role: additionalInfo.role || 'user',
        companyName: additionalInfo.companyName,
        companySize: additionalInfo.companySize,
        industry: additionalInfo.industry,
        subscriptionTier: 'free',
        ethicalMarketingPreferences: {
          mentalHealthFocus: true,
          communicationConsent: true
        }
      };

      await setDoc(
        doc(firestore, 'users', firebaseUser.uid),
        userProfile
      );

      setUser(userProfile);
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('No user logged in');

    try {
      const userDocRef = doc(firestore, 'users', user.id);
      await setDoc(userDocRef, { ...user, ...updates }, { merge: true });

      // Update local state
      setUser(prev => prev ? { ...prev, ...updates } : null);
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    logout,
    resetPassword,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Custom hook for using the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
