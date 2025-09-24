
'use server';

import { NextRequest, NextResponse } from 'next/server';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDocs, collection, query, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { type Team } from '@/lib/blocks';
import { type UserProfile } from '@/services/auth-service';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const idToken = await user.getIdToken();

    // --- Assign team logic (moved from auth-service) ---
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

    const response = NextResponse.json({ success: true, uid: user.uid }, { status: 200 });

    // Set the token in an HTTP-only cookie
    response.cookies.set({
      name: 'firebaseIdToken',
      value: idToken,
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 60 * 60 * 24, // 1 day
      path: '/',
    });
    
    return response;
  } catch (error: any) {
    let errorMessage = 'An unexpected error occurred.';
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'This email is already registered.';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'The password is too weak. It must be at least 6 characters long.';
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 400 });
  }
}
