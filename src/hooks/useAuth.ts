import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, isFirebaseInitialized } from '../lib/firebase';
import { useState, useEffect, useCallback } from 'react';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  emailVerified?: boolean;
  createdAt?: Date;
  lastLoginAt?: Date;
  plan?: 'free' | 'pro';
  partnerUid?: string;
  settings?: {
    theme?: 'light' | 'dark' | 'auto';
    language?: 'pl' | 'en';
    notifications?: boolean;
  };
}

export interface AuthState {
  user: UserProfile | null;
  loading: boolean;
  error: Error | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
}

export function useAuth() {
  const [user, loading, error] = useAuthState(auth);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<Error | null>(null);

  // Enhanced user profile creation
  const createUserProfile = useCallback((firebaseUser: any): UserProfile => {
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
      photoURL: firebaseUser.photoURL || undefined,
      emailVerified: firebaseUser.emailVerified || false,
      createdAt: firebaseUser.metadata?.creationTime ? new Date(firebaseUser.metadata.creationTime) : new Date(),
      lastLoginAt: firebaseUser.metadata?.lastSignInTime ? new Date(firebaseUser.metadata.lastSignInTime) : new Date(),
      plan: 'free', // Default plan
      settings: {
        theme: 'auto',
        language: 'pl',
        notifications: true
      }
    };
  }, []);

  // Update profile when user changes
  useEffect(() => {
    if (user && !loading) {
      const userProfile = createUserProfile(user);
      setProfile(userProfile);
      setProfileError(null);
    } else if (!user && !loading) {
      setProfile(null);
    }
  }, [user, loading, createUserProfile]);

  // Enhanced error handling
  useEffect(() => {
    if (error) {
      setProfileError(error);
    }
  }, [error]);

  // Computed states
  const isAuthenticated = !!user && !loading;
  const isInitialized = isFirebaseInitialized;

  // Helper functions
  const getUserInitial = useCallback(() => {
    return profile?.displayName?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'U';
  }, [profile]);

  const getUserDisplayName = useCallback(() => {
    return profile?.displayName || profile?.email || 'User';
  }, [profile]);

  const isEmailVerified = useCallback(() => {
    return profile?.emailVerified || false;
  }, [profile]);

  const getUserPlan = useCallback(() => {
    return profile?.plan || 'free';
  }, [profile]);

  return {
    // Core auth state
    user,
    loading,
    error,
    
    // Enhanced profile state
    profile,
    profileLoading,
    profileError,
    
    // Computed states
    isAuthenticated,
    isInitialized,
    
    // Helper functions
    getUserInitial,
    getUserDisplayName,
    isEmailVerified,
    getUserPlan,
    
    // Raw Firebase user (if needed)
    firebaseUser: user
  };
}
