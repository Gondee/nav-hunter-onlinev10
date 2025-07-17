import { SignJWT, jwtVerify } from 'jose';
import { JWTPayload } from '@/types/auth';

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'nav-hunter-secret-key-change-in-production'
);

const alg = 'HS256';

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