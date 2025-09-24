'use server';
import { NextResponse } from 'next/server';

// This route is not strictly necessary with a client-side auth model,
// but can be useful if you need to perform server-side cleanup on logout.
// For now, it just clears the cookie, which might not even be in use anymore,
// but we'll keep it for completeness.
export async function POST() {
  const response = NextResponse.json({ success: true }, { status: 200 });

  // Instruct the browser to clear the cookie if it exists
  response.cookies.set({
    name: 'firebaseIdToken',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV !== 'development',
    maxAge: -1, // Expire immediately
    path: '/',
  });

  return response;
}
