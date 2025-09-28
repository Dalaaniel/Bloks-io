
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { type UserProfile } from '@/services/auth-service';
import { useRouter } from 'next/navigation';
import { addPlayer, removePlayer } from '@/services/game-state-service';

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
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const unsubscribeProfile = onSnapshot(userDocRef, async (doc) => {
          if (doc.exists()) {
            const userProfile = doc.data() as UserProfile;
            const fullUser = { ...firebaseUser, ...userProfile };
            setUser(fullUser);
            await addPlayer(fullUser);
          } else {
            setUser(null);
          }
          setLoading(false);
        });
        return () => unsubscribeProfile();
      } else {
        if (user) {
          removePlayer(user);
        }
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, [user]);

  const signOut = async () => {
    try {
      if(user) {
        await removePlayer(user);
      }
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

    