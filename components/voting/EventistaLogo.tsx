import React from 'react'

interface EventistaLogoProps {
  className?: string
  variant?: 'full' | 'badge' | 'lockup'
  alt?: string
  withLink?: boolean
}

/**
 * Official Eventista Brand Identity Logo
 * Source: Eventista (https://eventistax.com/vi/)
 * Tagline: VOTE - TICKET - MERCHANDISE
 * Primary Color: #EE1D23 (Vivid Red)
 */
export default function EventistaLogo({
  className = 'h-5 w-auto',
  variant = 'full',
  alt = 'Eventista — Vote · Ticket · Merchandise',
  withLink = false,
}: EventistaLogoProps) {
  const content = (() => {
    if (variant === 'badge') {
      return (
        <img
          src="/logo/eventista-badge.png"
          alt={alt}
          className={`${className} object-contain rounded-[4px] shrink-0`}
          loading="eager"
        />
      )
    }

    if (variant === 'lockup') {
      return (
        <div className={`inline-flex items-center gap-2 select-none ${className}`}>
          <img
            src="/logo/eventista-badge.png"
            alt={alt}
            className="h-full w-auto aspect-square object-contain rounded-[3px] shrink-0"
            loading="eager"
          />
          <div className="flex flex-col leading-none justify-center">
            <span className="font-sans font-black text-xs sm:text-sm tracking-wide text-white uppercase flex items-center">
              EVENT<span className="text-[#EE1D23]">ISTA</span>
            </span>
            <span className="text-[7.5px] sm:text-[8px] font-mono tracking-widest text-text-tertiary uppercase mt-0.5">
              Vote · Ticket · Merchandise
            </span>
          </div>
        </div>
      )
    }

    // Default 'full': Official horizontal brand logo with tagline
    return (
      <img
        src="/logo/eventista-full.png"
        alt={alt}
        className={`${className} object-contain shrink-0`}
        loading="eager"
      />
    )
  })()

  if (withLink) {
    return (
      <a
        href="https://eventistax.com/vi/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center hover:opacity-90 transition-opacity"
        title="Eventista — Nền tảng bảo trợ & vận hành bình chọn trực tuyến"
      >
        {content}
      </a>
    )
  }

  return <span className="inline-flex items-center">{content}</span>
}
