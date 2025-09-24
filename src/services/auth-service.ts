'use server';

import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import {
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type UserCredential
} from 'firebase/auth';
import { type Team } from '@/lib/blocks';

export interface UserProfile {
  uid: string;
  email: string;
  team: Team;
}

export async function signIn(email: string, password: string): Promise<UserCredential> {
    return await signInWithEmailAndPassword(auth, email, password);
}

export async function signUp(email: string, password: string): Promise<UserCredential> {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // --- Assign team logic ---
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('team', 'desc'), limit(1));
    
    let newTeam: Team = 'blue';
    try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            const lastUser = querySnapshot.docs[0].data();
            if (lastUser.team) {
                newTeam = lastUser.team === 'blue' ? 'red' : 'blue';
            }
        }
    } catch (error) {
        console.error("Could not determine team, defaulting to blue. Error: ", error);
    }

    const userProfile: UserProfile = {
        uid: user.uid,
        email: user.email!,
        team: newTeam,
    };
    await setDoc(doc(db, 'users', user.uid), userProfile);
    // --- End of team logic ---
    
    return userCredential;
}


export async function signOut(): Promise<void> {
  // Also clear the server-side cookie if it exists
  await fetch('/api/logout', { method: 'POST' });
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
