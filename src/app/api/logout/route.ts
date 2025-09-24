
'use server';
import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true }, { status: 200 });
  
  // Instruct the browser to clear the cookie
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
