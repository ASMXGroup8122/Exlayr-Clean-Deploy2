import { cache } from 'react'
import { createClient } from '@/utils/supabase/server'

// Cached authentication functions to prevent duplicate calls within request cycles
export const getCachedUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
})

export const getCachedSession = cache(async () => {
  const supabase = await createClient()
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
})

// Fast session check for non-critical operations (uses cached session data)
export const getFastSession = cache(async () => {
  const supabase = await createClient()
  // Use getSession for faster results as recommended by Supabase docs
  // "For faster results, getSession().session.user is recommended"
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, user: session?.user || null, error }
})

// Secure user check for critical operations (validates JWT)
export const getSecureUser = cache(async () => {
  const supabase = await createClient()
  // Use getUser for most current and validated user data
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}) 