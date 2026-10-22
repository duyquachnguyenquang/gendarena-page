import fs from 'fs'
import path from 'path'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { siteConfig } from '@/config/site'
import LandingClient from '@/app/_landing/landing-client'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: `${siteConfig.name} — Đấu Trường Khởi Nghiệp Công Nghệ`,
  description: siteConfig.description,
  openGraph: {
    title: `${siteConfig.name} — Đấu Trường Khởi Nghiệp Công Nghệ`,
    description: siteConfig.description,
  },
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

function getSavedCountdownConfig() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'countdown_config.json')
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const data = JSON.parse(raw)
      if (data?.targetDate) return data
    }
  } catch (err) {
    console.error('Error reading countdown_config.json:', err)
  }
  return null
}

export default async function HomePage() {
  const supabase = await createSupabaseServerClient()
  const { data: phases } = await supabase
    .from('competition_phases')
    .select('*')
    .order('display_order', { ascending: true })

  const savedConfig = getSavedCountdownConfig()

  // Find the active countdown phase dynamically
  const targetPhase =
    (savedConfig?.phaseId ? phases?.find((p) => p.id === savedConfig.phaseId) : null) ||
    phases?.find((p) => p.status === 'active') ||
    phases?.find((p) => p.submission_open) ||
    phases?.find(
      (p) =>
        p.title?.toLowerCase().includes('mở đơn') ||
        p.title?.toLowerCase().includes('đăng ký') ||
        p.title?.toLowerCase().includes('sơ loại') ||
        p.title?.toLowerCase().includes('dream')
    ) ||
    phases?.[0]

  const now = new Date().getTime()
  const opensAt = targetPhase?.submission_opens_at ? new Date(targetPhase.submission_opens_at).getTime() : 0
  const closesAt = targetPhase?.submission_closes_at ? new Date(targetPhase.submission_closes_at).getTime() : 0

  const targetDate = savedConfig?.targetDate || '2026-11-08T13:00:00+07:00'
  const phaseTitle = savedConfig?.phaseTitle || 'Vòng 3: Chung Kết'
  const label = savedConfig?.label || 'Đếm ngược Vòng 3: Chung Kết'

  return (
    <LandingClient
      targetDate={targetDate}
      phaseTitle={phaseTitle}
      label={label}
      phases={phases || []}
    />
  )
}