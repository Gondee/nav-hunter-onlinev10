export interface JWTPayload {
  authenticated: boolean;
  exp?: number;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
}

export interface LoginRequest {
  password: string;
}