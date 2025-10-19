
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { type UserProfile } from '@/services/auth-service';
import { useRouter } from 'next/navigation';
import { updateUserPresence, disconnectUserPresence } from '@/services/presence-service';

export interface User extends FirebaseUser, UserProfile {}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, now listen for profile changes
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeProfile = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const userProfile = doc.data() as UserProfile;
            const fullUser = { ...firebaseUser, ...userProfile };
            setUser(fullUser);
            updateUserPresence(fullUser); // Set user presence to online
          } else {
            console.warn(`No user profile found for UID: ${firebaseUser.uid}`);
            setUser(null);
          }
          setLoading(false);
        }, (error) => {
           console.error("Failed to fetch user profile:", error);
           setUser(null);
           setLoading(false);
        });

        // Return a cleanup function for the profile listener
        return () => unsubscribeProfile();

      } else {
        // User is signed out
        if (user) { // If there was a user before, mark them as offline
            disconnectUserPresence();
        }
        setUser(null);
        setLoading(false);
      }
    });

    // Handle user disconnecting (e.g. closing tab)
    const handleBeforeUnload = () => {
      if (auth.currentUser) {
        disconnectUserPresence();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Return a cleanup function for the auth state listener
    return () => {
      unsubscribeAuth();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    try {
      disconnectUserPresence(); // Mark user as offline before signing out
      await auth.signOut();
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
