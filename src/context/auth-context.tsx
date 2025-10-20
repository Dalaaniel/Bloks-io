
'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { type UserProfile } from '@/services/auth-service';
import { useRouter } from 'next/navigation';
import { decrementOnlineUsers, getOnlineUsersCount } from '@/services/online-counter-service';


export interface User extends FirebaseUser, UserProfile {}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  playerCount: number;
  fetchPlayerCount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [playerCount, setPlayerCount] = useState(0);
  const router = useRouter();

  const fetchPlayerCount = useCallback(async () => {
    const count = await getOnlineUsersCount();
    setPlayerCount(count);
  }, []);

  useEffect(() => {
    fetchPlayerCount();
    // Set up an interval to refresh the count periodically,
    // to catch cases where other users connect/disconnect.
    const interval = setInterval(fetchPlayerCount, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [fetchPlayerCount]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeProfile = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const userProfile = doc.data() as UserProfile;
            const fullUser = { ...firebaseUser, ...userProfile };
            setUser(fullUser);
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

        return () => {
          unsubscribeProfile();
        };

      } else {
        // User is signed out
        setUser(null);
        setLoading(false);
      }
    });

    // Cleanup function for when the AuthProvider unmounts
    return () => {
      if (auth.currentUser) {
        // This is a failsafe for when the component unmounts, e.g., navigating away
        // Note: this won't cover all cases like browser close
        decrementOnlineUsers(auth.currentUser.uid);
      }
      unsubscribeAuth();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    if (!user) return;
    try {
      await decrementOnlineUsers(user.uid);
      await fetchPlayerCount();
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
    playerCount,
    fetchPlayerCount,
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
