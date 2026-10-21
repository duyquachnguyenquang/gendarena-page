import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getAppUrl(): string {
  // 1. Trình duyệt (Client-side)
  if (typeof window !== 'undefined') {
    const { hostname, port, origin } = window.location
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return `http://${hostname}${port ? `:${port}` : ''}`
    }
    return origin
  }

  // 2. Server-side / Build time
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || ''
  if (siteUrl) {
    const cleanUrl = siteUrl.replace(/\/$/, '')
    try {
      const parsed = new URL(cleanUrl)
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return `http://${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`
      }
      return cleanUrl
    } catch {
      // Fallback below
    }
  }

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000'
  }

  return 'https://gendarena.com'
}

/**
 * Chuyển đổi ngày sinh từ định dạng UI (DD/MM/YYYY hoặc biến thể) sang YYYY-MM-DD (Postgres DATE format)
 */
export function dobToDbFormat(dobStr?: string | null): string | null {
  if (!dobStr) return null
  const trimmed = dobStr.trim()
  if (!trimmed) return null

  // Đã ở dạng YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }

  // Dạng ISO 8601 (ví dụ 1990-01-01T00:00:00.000Z)
  if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
    return trimmed.slice(0, 10)
  }

  // Dạng DD/MM/YYYY hoặc D/M/YYYY
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/')
    if (parts.length === 3) {
      const [d, m, y] = parts
      if (y.length === 4 && d.length <= 2 && m.length <= 2) {
        const day = d.padStart(2, '0')
        const month = m.padStart(2, '0')
        return `${y}-${month}-${day}`
      }
    }
  }

  // Dạng DD-MM-YYYY
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split('-')
    const day = d.padStart(2, '0')
    const month = m.padStart(2, '0')
    return `${y}-${month}-${day}`
  }

  return null
}

/**
 * Chuyển đổi ngày sinh từ Postgres DATE format (YYYY-MM-DD hoặc ISO) sang UI format (DD/MM/YYYY)
 */
export function dobToUiFormat(dobStr?: string | null): string {
  if (!dobStr) return ''
  const trimmed = dobStr.trim()
  if (!trimmed) return ''

  // Dạng ISO 8601 (ví dụ 1990-01-01T00:00:00.000Z)
  let datePart = trimmed
  if (trimmed.includes('T')) {
    datePart = trimmed.split('T')[0]
  }

  // Dạng YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const [y, m, d] = datePart.split('-')
    return `${d}/${m}/${y}`
  }

  // Nếu đã ở dạng DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return trimmed
  }

  return trimmed
}

export function formatDob(val: string): string {
  if (!val) return ''
  // Convert YYYY-MM-DD to DD/MM/YYYY if pre-existing in old format
  if (/^\d{4}-\d{2}-\d{2}/.test(val)) {
    return dobToUiFormat(val)
  }
  const clean = val.replace(/\D/g, '').slice(0, 8)
  if (clean.length > 4) {
    return `${clean.slice(0, 2)}/${clean.slice(2, 4)}/${clean.slice(4)}`
  }
  if (clean.length > 2) {
    return `${clean.slice(0, 2)}/${clean.slice(2)}`
  }
  return clean
}

/**
 * Chuẩn hóa URL video embed cho iframe từ YouTube hoặc Google Drive
 */
export function getVideoEmbedUrl(url?: string | null): string {
  if (!url) return ''
  const trimmed = url.trim()

  // Google Drive
  if (trimmed.includes('drive.google.com')) {
    if (trimmed.includes('/preview')) return trimmed
    // Replace /view or /edit with /preview
    return trimmed.replace(/\/(view|edit)(\?.*)?$/, '/preview')
  }

  // YouTube
  if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
    if (trimmed.includes('autoplay=')) return trimmed
    const sep = trimmed.includes('?') ? '&' : '?'
    return `${trimmed}${sep}autoplay=1&rel=0&modestbranding=1`
  }

  return trimmed
}

