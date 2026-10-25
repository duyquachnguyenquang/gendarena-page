'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'

/**
 * Listens for Supabase auth state changes at the app level.
 *
 * When the Supabase SDK detects a stale/invalid refresh token or emits a
 * SIGNED_OUT event, this component clears the stale state and safely
 * navigates the user to the landing page `/` if they are on a protected route,
 * avoiding any redirect loops or unneeded refreshes.
 */
export default function AuthStateListener() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (pathname?.startsWith('/foh')) return
    const supabase = createClient()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        // Protected route prefixes that require redirection to '/' when signed out
        const protectedPrefixes = [
          '/dashboard',
          '/team',
          '/submissions',
          '/admin',
          '/profile',
        ]
        const isProtected = protectedPrefixes.some(
          (prefix) => pathname === prefix || pathname.startsWith(prefix + '/')
        )

        if (isProtected) {
          router.replace('/')
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, pathname])

  // Renders nothing — purely a side-effect component.
  return null
}
