
'use client';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type UserCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { type Team, type BlockId } from '@/lib/blocks';
import { incrementOnlineUsers } from './online-counter-service';

export type UserInventory = { [key in BlockId]: number };

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

export async function signUp(email: string, password: string): Promise<UserCredential> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const { user } = userCredential;

  const team: Team = Math.random() > 0.5 ? 'red' : 'blue';

  const userProfile: UserProfile = {
    uid: user.uid,
    email: user.email,
    team: team,
    createdAt: serverTimestamp(),
    inventory: defaultInventory,
  };

  await setDoc(doc(db, 'users', user.uid), userProfile);
  await incrementOnlineUsers(user.uid);
  return userCredential;
}

export async function signIn(email: string, password: string): Promise<UserCredential> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const { user } = userCredential;
  await incrementOnlineUsers(user.uid);
  return userCredential;
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
