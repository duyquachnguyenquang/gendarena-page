import React, { Suspense } from 'react'
import type { Metadata } from 'next'
import { VOTING_CONFIG } from '@/config/voting'
import { getVotingTeams } from '@/services/voting'
import VoteClient from './vote-client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `${VOTING_CONFIG.title} — ${VOTING_CONFIG.competitionName}`,
  description: `Cổng bình chọn chính thức Vòng 3 cuộc thi khởi nghiệp công nghệ ${VOTING_CONFIG.competitionName}. Khám phá đề án và bình chọn cho Top 10 dự án xuất sắc nhất trên nền tảng Eventista từ 20:00 25/10 đến 23:59 02/11/2026.`,
  openGraph: {
    title: `${VOTING_CONFIG.title} — ${VOTING_CONFIG.competitionName}`,
    description: `Bình chọn Top 10 Đội thi được yêu thích nhất - Vòng 3 GenD Arena 2026 trên nền tảng Eventista.`,
    type: 'website',
  },
}


export default async function VotePage() {
  const teams = await getVotingTeams()

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-surface-base flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="size-10 rounded-full border-2 border-brand-cyan border-t-transparent animate-spin" />
            <span className="text-xs font-mono text-text-tertiary">Đang tải cổng bình chọn...</span>
          </div>
        </div>
      }
    >
      <VoteClient initialTeams={teams} />
    </Suspense>
  )
}
