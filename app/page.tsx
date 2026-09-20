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

  let computedDate = '2026-09-22T23:59:59+07:00'
  let computedLabel = 'Đếm ngược đóng cổng nộp bài'

  if (opensAt && now < opensAt) {
    computedDate = targetPhase.submission_opens_at
    computedLabel = 'Đếm ngược mở đơn'
  } else if (closesAt && now < closesAt) {
    computedDate = targetPhase.submission_closes_at
    computedLabel = 'Đếm ngược đóng cổng nộp bài'
  } else if (targetPhase?.end_date) {
    computedDate = `${targetPhase.end_date}T23:59:59+07:00`
    computedLabel = 'Đếm ngược kết thúc vòng'
  }

  const targetDate = savedConfig?.targetDate || computedDate
  const phaseTitle = savedConfig?.phaseTitle || targetPhase?.title || 'Gia hạn đăng ký vòng Sơ loại: DREAM'
  const label = savedConfig?.label || computedLabel

  return (
    <LandingClient
      targetDate={targetDate}
      phaseTitle={phaseTitle}
      label={label}
      phases={phases || []}
    />
  )
}