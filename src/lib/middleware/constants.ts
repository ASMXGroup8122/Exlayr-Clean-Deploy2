export const PUBLIC_PATHS = [
    '/_next',
    '/api',
    '/static',
    '/images',
    '/favicon.ico',
    '/register-organization',
    '/create-sponsor',
    '/create-issuer',
    '/create-exchange'
] as const;

export const AUTH_PATHS = [
    '/sign-in',
    '/sign-up',
    '/auth/callback',
    '/auth/error',
    '/auth/verify-email',
    '/approval-pending',
    '/organization-pending'
] as const;

export const SESSION_CONFIG = {
    REFRESH_THRESHOLD_SECONDS: 300, // Refresh token if less than 5 minutes remaining
    COOKIE_OPTIONS: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7 // 7 days
    }
} as const; 