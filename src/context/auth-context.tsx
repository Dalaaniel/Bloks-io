
"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { type UserProfile, signUp as authSignUp, signIn as authSignIn, signOut as authSignOut, getUserProfile } from '@/services/auth-service';
import { saveCanvasState, loadCanvasState } from '@/services/canvas-service';
import { type Team } from '@/lib/blocks';
import { type Body } from 'matter-js';

// TYPES
interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  team: Team | null;
  loading: boolean;
  ownedBlocks: { [key: string]: number };
  zoom: number;
  canvasState: SerializedCanvasState | null;
  setZoom: (zoom: number) => void;
  addBlockToInventory: (blockId: string) => void;
  useBlockFromInventory: (blockId: string) => boolean;
  returnBlockToInventory: (blockId: string) => void;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  saveState: (state: SerializedCanvasState) => void;
}

export interface SerializedBody {
  id: number;
  label: string;
  position: { x: number; y: number };
  angle: number;
  vertices: { x: number, y: number }[];
  velocity: { x: number; y: number };
  angularVelocity: number;
  isStatic: boolean;
  parts: SerializedBody[];
  restitution: number;
  friction: number;
  render: {
    fillStyle?: string;
    strokeStyle?: string;
    lineWidth?: number;
  };
   initialOverlapWhitelist?: number[];
}

export interface SerializedCanvasState {
  bodies: SerializedBody[];
  zoom: number;
  viewCenter: { x: number; y: number };
}

// CONTEXT
const AuthContext = createContext<AuthContextType | undefined>(undefined);


// PROVIDER
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [ownedBlocks, setOwnedBlocks] = useState<{ [key: string]: number }>({
    i: 5, o: 5, t: 5, l: 5, j: 5, s: 5, z: 5,
  });
  const [zoom, setZoom] = useState(0.5);
  const [canvasState, setCanvasState] = useState<SerializedCanvasState | null>(null);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // AUTH and USER PROFILE
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        getUserProfile(firebaseUser.uid)
          .then(profile => {
            setUserProfile(profile);
            setLoading(false);
          })
          .catch(async (e) => {
            console.error("Failed to fetch user profile, signing out.", e);
            await authSignOut();
          });
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // CANVAS STATE
   useEffect(() => {
    const fetchCanvasState = async () => {
      const state = await loadCanvasState();
      if (state) {
        setCanvasState(state);
        setZoom(state.zoom || 0.5);
      }
    };
    fetchCanvasState();
  }, []);

  const saveState = (newState: SerializedCanvasState) => {
    setCanvasState(newState); // Optimistic update
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    const timeout = setTimeout(() => {
      saveCanvasState(newState).catch(err => {
        console.error("Failed to save canvas state:", err);
        // Potentially handle failed save, e.g., show a toast
      });
    }, 1000); // Debounce saves to every 1 second
    setSaveTimeout(timeout);
  };


  const signUp = async (email: string, password: string) => {
    await authSignUp(email, password);
  };

  const signIn = async (email: string, password: string) => {
    await authSignIn(email, password);
  };

  const signOut = async () => {
    await authSignOut();
    setUser(null);
    setUserProfile(null);
    setLoading(true); // Set loading to true to show spinner while state clears
  };

  // INVENTORY
  const addBlockToInventory = useCallback((blockId: string) => {
    setOwnedBlocks(prev => ({
      ...prev,
      [blockId]: (prev[blockId] || 0) + 1,
    }));
  }, []);

  const useBlockFromInventory = useCallback((blockId: string) => {
    if (ownedBlocks[blockId] && ownedBlocks[blockId] > 0) {
      setOwnedBlocks(prev => ({
        ...prev,
        [blockId]: prev[blockId] - 1,
      }));
      return true;
    }
    return false;
  }, [ownedBlocks]);

  const returnBlockToInventory = useCallback((blockId: string) => {
    setOwnedBlocks(prev => ({
      ...prev,
      [blockId]: (prev[blockId] || 0) + 1,
    }));
  }, []);

  const value = {
    user,
    userProfile,
    team: userProfile?.team || null,
    loading,
    ownedBlocks,
    zoom,
    setZoom,
    addBlockToInventory,
    useBlockFromInventory,
    returnBlockToInventory,
    signUp,
    signIn,
    signOut,
    canvasState,
    saveState,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// HOOK
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
