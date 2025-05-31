'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';

export default function HangDebugger() {
    const { user, loading, initialized, session } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [events, setEvents] = useState<string[]>([]);
    const startTime = useRef(Date.now());
    const lastEventTime = useRef(Date.now());

    const addEvent = (event: string) => {
        const now = Date.now();
        const totalTime = now - startTime.current;
        const deltaTime = now - lastEventTime.current;
        lastEventTime.current = now;
        
        const eventWithTime = `[${totalTime}ms / +${deltaTime}ms] ${event}`;
        console.log('HANG DEBUG:', eventWithTime);
        setEvents(prev => [...prev.slice(-20), eventWithTime]); // Keep last 20 events
    };

    useEffect(() => {
        addEvent(`🏁 HangDebugger mounted on ${pathname}`);
    }, [pathname]);

    useEffect(() => {
        addEvent(`🔄 Auth loading: ${loading ? 'YES' : 'NO'}`);
    }, [loading]);

    useEffect(() => {
        addEvent(`✅ Auth initialized: ${initialized ? 'YES' : 'NO'}`);
    }, [initialized]);

    useEffect(() => {
        addEvent(`👤 User: ${user ? `${user.email} (${user.account_type})` : 'NONE'}`);
    }, [user]);

    useEffect(() => {
        addEvent(`🎫 Session: ${session ? 'EXISTS' : 'NONE'}`);
    }, [session]);

    // Monitor if we're stuck for more than 15 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading && !initialized) {
                addEvent('🚨 STUCK IN LOADING STATE FOR 15+ SECONDS');
            }
        }, 15000);

        return () => clearTimeout(timer);
    }, [loading, initialized]);

    // Monitor if we're stuck for more than 30 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            if (loading && !initialized) {
                addEvent('💀 STUCK IN LOADING STATE FOR 30+ SECONDS - INVESTIGATE NETWORK/SUPABASE');
            }
        }, 30000);

        return () => clearTimeout(timer);
    }, [loading, initialized]);

    const timeSinceStart = Date.now() - startTime.current;

    return (
        <div className="fixed top-4 left-4 bg-black text-white p-4 rounded-lg text-xs font-mono max-w-md max-h-96 overflow-auto z-50">
            <div className="font-bold mb-2">🐛 HANG DEBUGGER</div>
            <div className="mb-2">
                <strong>Time:</strong> {timeSinceStart}ms
            </div>
            <div className="mb-2">
                <strong>Status:</strong> {loading ? '⏳ LOADING' : initialized ? '✅ READY' : '❌ ERROR'}
            </div>
            {timeSinceStart > 30000 && (
                <div className="mb-2 text-red-400 font-bold">
                    🚨 HANGING FOR 30+ SECONDS
                </div>
            )}
            <div className="space-y-1">
                {events.map((event, index) => (
                    <div key={index} className="text-xs">
                        {event}
                    </div>
                ))}
            </div>
        </div>
    );
} 