
'use server';

import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import {
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { type Team } from '@/lib/blocks';

export interface UserProfile {
  uid: string;
  email: string;
  team: Team;
}


export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function getUserProfile(uid: string): Promise<UserProfile> {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (userDoc.exists()) {
    return userDoc.data() as UserProfile;
  } else {
    // This can happen briefly during signup before the profile is created.
    // Let's try waiting a bit and fetching again.
    await new Promise(resolve => setTimeout(resolve, 1500));
     const userDocAgain = await getDoc(doc(db, 'users', uid));
     if(userDocAgain.exists()){
        return userDocAgain.data() as UserProfile;
     }
    throw new Error('User profile not found');
  }
}
