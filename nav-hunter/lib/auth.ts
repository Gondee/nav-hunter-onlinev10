import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { JWTPayload } from '@/types/auth';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'nav-hunter-secret-key-change-in-production'
);

const alg = 'HS256';

export async function createToken(): Promise<string> {
  const jwt = await new SignJWT({ authenticated: true })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
  
  return jwt;
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: [alg],
    });
    
    return payload as unknown as JWTPayload;
  } catch (error) {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth-token');
  
  if (!token) {
    return null;
  }
  
  return verifyToken(token.value);
}

export function validatePassword(password: string): boolean {
  const appPassword = process.env.APP_PASSWORD || 'navhunter2024';
  
  if (!appPassword) {
    console.error('APP_PASSWORD environment variable is not set');
    return false;
  }
  
  return password === appPassword;
}