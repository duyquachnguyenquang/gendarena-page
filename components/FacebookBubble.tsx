'use client'

import { usePathname } from 'next/navigation'
import { siteConfig } from '@/config/site'

const FACEBOOK_URL = siteConfig.socials?.facebook || 'https://www.facebook.com/gend.arena'

export default function FacebookBubble() {
  const pathname = usePathname()

  if (pathname?.startsWith('/foh')) {
    return null
  }

  return (
    <aside
      aria-label="Liên hệ Fanpage"
      className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-40 select-none"
    >
      <a
        href={FACEBOOK_URL}
        target="_blank"
        rel="noopener noreferrer"
        title="Fanpage GenD Arena"
        aria-label="Fanpage GenD Arena trên Facebook"
        className="flex items-center justify-center size-12 sm:size-13 rounded-full bg-[#1877F2] text-white shadow-lg hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all duration-200"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className="size-6 sm:size-7 fill-current"
        >
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </a>
    </aside>
  )
}
