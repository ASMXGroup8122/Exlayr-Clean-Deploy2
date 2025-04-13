'use client';

import React, { useState, FormEvent, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isTokenProcessed, setIsTokenProcessed] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const hash = window.location.hash;
        if (hash.includes('access_token')) {
            supabase.auth.onAuthStateChange((event, session) => {
                if (event === 'PASSWORD_RECOVERY') {
                    console.log("Password recovery event received, session:", session);
                    setIsTokenProcessed(true);
                } else if (event === 'SIGNED_IN' && session?.user) {
                    console.log("User already signed in during password recovery attempt:", session);
                    setIsTokenProcessed(true);
                } else if (!session) {
                    console.error("No session found after processing password recovery hash.");
                    setError("Invalid or expired password recovery link. Please request a new one.");
                    setIsTokenProcessed(true);
                }
            });
        } else {
            setError("Invalid access: No password recovery token found. Please use the link sent to your email.");
            setIsTokenProcessed(true);
        }
    }, []);

    const handlePasswordUpdate = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return;
        }

        setLoading(true);
        setMessage(null);
        setError(null);

        try {
            const { error: updateError } = await supabase.auth.updateUser({ password: password });

            if (updateError) {
                throw updateError;
            }

            setMessage('Your password has been successfully updated! You can now sign in with your new password.');
            setTimeout(() => {
                router.push('/sign-in');
            }, 3000);

        } catch (err: any) {
            console.error("Error updating password:", err);
            setError(`Failed to update password: ${err.message || 'Unknown error'}. Please try again.`);
        } finally {
            setLoading(false);
        }
    };

    if (!isTokenProcessed) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <form onSubmit={handlePasswordUpdate} className="w-full max-w-sm">
                <Card className="w-full">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-bold">Reset Your Password</CardTitle>
                        <CardDescription>Enter your new password below.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="password">New Password</Label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="pl-10"
                                    disabled={loading || !!message}
                                />
                            </div>
                        </div>
                         <div className="grid gap-2">
                            <Label htmlFor="confirm-password">Confirm New Password</Label>
                             <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="pl-10"
                                    disabled={loading || !!message}
                                />
                            </div>
                        </div>
                        {message && <p className="text-sm text-green-600 text-center">{message}</p>}
                        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
                    </CardContent>
                    <CardFooter>
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={loading || !password || password !== confirmPassword || !!message || !!error}
                        >
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Update Password'}
                         </Button>
                    </CardFooter>
                </Card>
            </form>
        </div>
    );
} 