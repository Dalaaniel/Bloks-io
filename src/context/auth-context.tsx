'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { type UserProfile } from '@/services/auth-service';
import { decrementOnlineUsers, getOnlineUsersCount, incrementOnlineUsers } from '@/services/online-counter-service';


export interface User extends FirebaseUser, Omit<UserProfile, 'email' | 'uid'> {}

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

  const fetchPlayerCount = useCallback(async () => {
    const count = await getOnlineUsersCount();
    setPlayerCount(count);
  }, []);


  useEffect(() => {
    const counterDocRef = doc(db, 'onlineCounter', 'singleton');
    const unsubscribeCounter = onSnapshot(counterDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPlayerCount(data.onlineUsers?.length || 0);
      }
    });


    const handleBeforeUnload = () => {
      if (auth.currentUser) {
        decrementOnlineUsers(auth.currentUser.uid);
      }
    };
    
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      window.removeEventListener('beforeunload', handleBeforeUnload);

      if (firebaseUser) {
        await incrementOnlineUsers(firebaseUser.uid);
        window.addEventListener('beforeunload', handleBeforeUnload);

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeProfile = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const userProfile = doc.data() as UserProfile;
            const fullUser: User = { ...firebaseUser, ...userProfile };
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
          window.removeEventListener('beforeunload', handleBeforeUnload);
        };

      } else {
        if (user) { 
          await decrementOnlineUsers(user.uid);
        }
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeCounter();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    if (!user) return;
    try {
      await auth.signOut();
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
