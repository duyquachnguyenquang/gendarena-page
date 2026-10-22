import React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  resolveBoothTeam,
  getBoothVotingDashboardData,
  evaluateBoothGateStatus,
} from '@/lib/booth-voting'
import BoothVoteClient from '../booth/[teamKey]/booth-vote-client'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ teamKey: string }>
}): Promise<Metadata> {
  const { teamKey } = await params
  const team = resolveBoothTeam(teamKey)

  if (!team) {
    return {
      title: 'Bình chọn Gian hàng Chung kết — GenD Arena 2026',
    }
  }

  return {
    title: `Bình chọn Đội #${team.msbc} ${team.name} — Chung Kết GenD Arena 2026`,
    description: `Bình chọn trực tiếp cho gian hàng đội ${team.name} (${team.institution}) tại Vòng Chung Kết GenD Arena 2026 (14:00 – 15:30 ngày 08/11/2026).`,
    openGraph: {
      title: `Bình chọn Gian hàng #${team.msbc}: ${team.name} — GenD Arena 2026`,
      description: team.summary,
      images: [team.posterUrl],
      type: 'website',
    },
  }
}

export default async function DirectTeamVoteAliasPage({
  params,
}: {
  params: Promise<{ teamKey: string }>
}) {
  const { teamKey } = await params
  const team = resolveBoothTeam(teamKey)

  if (!team) {
    notFound()
  }

  const dashboard = await getBoothVotingDashboardData()
  const gate = evaluateBoothGateStatus(dashboard.settings)

  return (
    <BoothVoteClient
      team={team}
      initialGate={gate}
      initialSettings={{
        start_time: dashboard.settings.start_time,
        end_time: dashboard.settings.end_time,
      }}
    />
  )
}
