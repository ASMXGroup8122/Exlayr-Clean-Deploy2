import { getCookie, setCookie, deleteCookie } from 'cookies-next'

export const customStorageAdapter = {
    getItem: (key: string) => {
        return getCookie(key)?.toString() || null
    },
    setItem: (key: string, value: string) => {
        setCookie(key, value, {
            path: '/',
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
        })
    },
    removeItem: (key: string) => {
        deleteCookie(key, { path: '/' })
    }
} 