'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const ERROR_MESSAGES = {
    // PKCE Flow Errors
    'AUTH.CODE_MISSING': 'Authentication code is missing. Please try signing in again.',
    'AUTH.SESSION_MISSING': 'Could not establish a secure session. Please try again.',
    'AUTH.CALLBACK_ERROR': 'Authentication process failed. Please try signing in again.',
    
    // Session Errors
    'AUTH.SESSION_ERROR': 'Your session has expired or is invalid. Please sign in again.',
    'AUTH.PROFILE_ERROR': 'Could not access your profile. Please try signing in again.',
    
    // General Auth Errors
    'AUTH.UNAUTHORIZED': 'You are not authorized to access this resource.',
    'AUTH.INVALID_CREDENTIALS': 'Invalid credentials provided. Please check and try again.',
    'AUTH.ACCOUNT_EXISTS': 'An account with this email already exists.',
    
    // Default Error
    'AUTH.DEFAULT': 'An authentication error occurred. Please try again.',
} as const;

type ErrorCode = keyof typeof ERROR_MESSAGES;

export default function AuthError() {
    const searchParams = useSearchParams();
    const errorCode = searchParams.get('message') as ErrorCode;
    
    const getErrorMessage = (code: string) => {
        return ERROR_MESSAGES[code as ErrorCode] || ERROR_MESSAGES['AUTH.DEFAULT'];
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-sm">
                <h1 className="mb-4 text-2xl font-bold text-red-600">Authentication Error</h1>
                <p className="mb-6 text-gray-600">{getErrorMessage(errorCode)}</p>
                <div className="space-y-4">
                    <Link 
                        href="/sign-in"
                        className="block w-full rounded-md bg-blue-600 px-4 py-2 text-center text-white hover:bg-blue-700"
                    >
                        Return to Sign In
                    </Link>
                    <Link
                        href="/sign-up"
                        className="block w-full rounded-md border border-gray-300 px-4 py-2 text-center text-gray-700 hover:bg-gray-50"
                    >
                        Create an Account
                    </Link>
                </div>
            </div>
        </div>
    );
} 