
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth, db, rtdb } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { type UserProfile } from '@/services/auth-service';
import { useRouter } from 'next/navigation';
import { ref, set, onValue, onDisconnect, serverTimestamp, goOffline, goOnline } from 'firebase/database';

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
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const userStatusDatabaseRef = ref(rtdb, '/status/' + firebaseUser.uid);
        const isOfflineForDatabase = { state: 'offline', last_changed: serverTimestamp() };
        const isOnlineForDatabase = { state: 'online', last_changed: serverTimestamp() };
        
        const connectedRef = ref(rtdb, '.info/connected');
        onValue(connectedRef, (snapshot) => {
          if (snapshot.val() === false) {
            return;
          }
          onDisconnect(userStatusDatabaseRef).set(isOfflineForDatabase).then(() => {
            set(userStatusDatabaseRef, isOnlineForDatabase);
          });
        });

        // Listen for profile changes
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
          goOffline(rtdb);
        };

      } else {
        // User is signed out
        if (user) {
          const userStatusDatabaseRef = ref(rtdb, '/status/' + user.uid);
          set(userStatusDatabaseRef, { state: 'offline', last_changed: serverTimestamp() });
        }
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    try {
      if (auth.currentUser) {
        const userStatusDatabaseRef = ref(rtdb, '/status/' + auth.currentUser.uid);
        set(userStatusDatabaseRef, { state: 'offline', last_changed: serverTimestamp() });
      }
      goOffline(rtdb);
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
