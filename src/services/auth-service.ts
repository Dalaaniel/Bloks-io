
'use client';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type UserCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { type Team, type BlockId } from '@/lib/blocks';

export type UserInventory = { [key in BlockId]?: number };

export interface UserProfile {
  uid: string;
  email: string | null;
  team: Team;
  createdAt: any;
  inventory: UserInventory;
}

const defaultInventory: UserInventory = {
  i: 5, o: 5, t: 5, l: 5, j: 5, s: 5, z: 5
};

export async function signUp(email: string, password: string, team: Team): Promise<UserCredential> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const { user } = userCredential;

  const userProfile: UserProfile = {
    uid: user.uid,
    email: user.email,
    team: team,
    createdAt: serverTimestamp(),
    inventory: defaultInventory,
  };

  await setDoc(doc(db, 'users', user.uid), userProfile);
  return userCredential;
}

export async function signIn(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userDocRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userDocRef);

  if (userDoc.exists()) {
    return userDoc.data() as UserProfile;
  } else {
    console.warn(`No user profile found for UID: ${uid}`);
    return null;
  }
}

export async function getUserInventory(uid: string): Promise<UserInventory | null> {
    const profile = await getUserProfile(uid);
    return profile?.inventory || null;
}

export function listenToUserInventory(uid: string, callback: (inventory: UserInventory | null) => void): () => void {
    const userDocRef = doc(db, 'users', uid);
    return onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
            const data = doc.data() as UserProfile;
            callback(data.inventory || null);
        } else {
            callback(null);
        }
    });
}

export async function updateUserInventory(uid: string, newInventory: UserInventory): Promise<void> {
  try {
    const userDocRef = doc(db, 'users', uid);
    await updateDoc(userDocRef, {
      inventory: newInventory
    });
  } catch (error) {
    console.error("Error updating user inventory: ", error);
    throw new Error("Could not update inventory.");
  }
}
