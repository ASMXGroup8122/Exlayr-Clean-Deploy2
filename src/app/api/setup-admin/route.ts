import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { email, password, setupKey } = await request.json();

        if (setupKey !== process.env.ADMIN_SETUP_KEY) {
            return NextResponse.json({ error: 'Invalid setup key' }, { status: 401 });
        }

        const cookieStore = cookies();
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

        // Create the admin user in auth.users
        const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    role: 'admin',
                    is_admin: true
                }
            }
        });

        if (signUpError || !data.user) {
            throw signUpError || new Error('Failed to create user');
        }

        // Set the user's role in auth.users metadata
        await supabase.auth.updateUser({
            data: { role: 'admin', is_admin: true }
        });

        return NextResponse.json({ 
            success: true,
            message: 'Admin created successfully'
        });

    } catch (error: any) {
        console.error('Admin setup error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
} 