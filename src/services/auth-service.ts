'use server';

import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { type Team } from '@/lib/blocks';

export interface UserProfile {
  uid: string;
  email: string;
  team: Team;
}

export async function signUp(email: string, password: string): Promise<UserProfile> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;

  // Assign team to new user
  const usersRef = collection(db, 'users');
  const q = query(usersRef, orderBy('team', 'desc'), limit(1));
  const querySnapshot = await getDocs(q);
  
  let newTeam: Team = 'blue';
  if (!querySnapshot.empty) {
    const lastUser = querySnapshot.docs[0].data();
    newTeam = lastUser.team === 'blue' ? 'red' : 'blue';
  }

  const userProfile: UserProfile = {
    uid: user.uid,
    email: user.email!,
    team: newTeam,
  };

  await setDoc(doc(db, 'users', user.uid), userProfile);
  return userProfile;
}

export async function signIn(email: string, password: string): Promise<UserProfile> {
  await signInWithEmailAndPassword(auth, email, password);
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not found after sign-in');
  }
  return await getUserProfile(user.uid);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export async function getUserProfile(uid: string): Promise<UserProfile> {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (userDoc.exists()) {
    return userDoc.data() as UserProfile;
  } else {
    throw new Error('User profile not found');
  }
}
