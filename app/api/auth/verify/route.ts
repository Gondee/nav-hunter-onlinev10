import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session || !session.authenticated) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Check if token is expired
    if (session.exp && session.exp * 1000 < Date.now()) {
      return NextResponse.json(
        { success: false, message: 'Token expired' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({ 
      success: true, 
      authenticated: true,
      expiresAt: session.exp ? new Date(session.exp * 1000).toISOString() : null
    });
  } catch (error) {
    console.error('Token verification failed:', error);
    return NextResponse.json(
      { success: false, message: 'Token verification failed' },
      { status: 500 }
    );
  }
}