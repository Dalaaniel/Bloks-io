
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const idToken = await user.getIdToken();

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
    // Provide more specific error messages
    if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      errorMessage = 'Invalid email or password.';
    } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many login attempts. Please try again later.'
    }
    return NextResponse.json({ success: false, error: errorMessage }, { status: 401 });
  }
}
