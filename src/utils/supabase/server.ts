import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export function createClient() {
    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return cookies().get(name)?.value
                },
                set(name: string, value: string, options: any) {
                    cookies().set(name, value, options)
                },
                remove(name: string, options: any) {
                    cookies().delete(name)
                },
            },
        }
    )
} 