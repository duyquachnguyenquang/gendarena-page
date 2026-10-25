'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import useSWR from 'swr'
import { VOTING_CONFIG } from '@/config/voting'
import { TeamVote, VotingPhaseStatus } from '@/types/voting'
import EditorialHeader from '@/components/voting/EditorialHeader'
import EditorialTeamCard, { LiveVoteInfo } from '@/components/voting/EditorialTeamCard'
import TeamSlideDrawer from '@/components/voting/TeamSlideDrawer'
import MinimalRulesModal from '@/components/voting/MinimalRulesModal'
import MobileStickyBottomBar from '@/components/voting/MobileStickyBottomBar'
import EventistaLogo from '@/components/voting/EventistaLogo'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface VoteClientProps {
  initialTeams?: TeamVote[]
}

interface VotesApiResponse {
  success: boolean
  totalVotes?: number
  votesByTeamId?: Record<string, LiveVoteInfo>
}

export default function VoteClient({ initialTeams }: VoteClientProps) {
  const searchParams = useSearchParams()

  const rawTeams = initialTeams && initialTeams.length > 0 ? initialTeams : VOTING_CONFIG.teams

  // Trang voting: Bỏ hẳn 2 đội SISO và Aqua Radar (không đủ điều kiện video)
  const teams = useMemo(() => {
    return rawTeams.filter(
      (t) =>
        !t.votingDisabled &&
        t.id !== 'd9f575a6-e2d6-42e6-bd4a-4f076dfa7f0e' && // SISO
        t.id !== '9e9103e9-a725-48cf-b4da-519f0b68e24a' // Aqua Radar
    )
  }, [rawTeams])

  const [selectedTeam, setSelectedTeam] = useState<TeamVote | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalTab, setModalTab] = useState<'guide' | 'rules'>('guide')

  // Nút chuyển hướng mở luôn theo yêu cầu BTC (việc setup thời gian do Eventista quản lý)
  const status: VotingPhaseStatus = 'ACTIVE'

  // Kéo dữ liệu số lượng vote trực tiếp từ Eventista định kỳ mỗi 30 giây
  const { data: voteData } = useSWR<VotesApiResponse>('/api/votes', fetcher, {
    refreshInterval: 30000,
    revalidateOnFocus: true,
  })

  const votesByTeamId = voteData?.votesByTeamId || {}

  // Open modal/drawer from URL params
  useEffect(() => {
    const param = searchParams.get('team')
    if (param) {
      const found = teams.find(
        (t) => t.id === param || t.msbc === param || t.msbc.replace('#', '') === param
      )
      if (found) {
        setSelectedTeam(found)
        setIsDrawerOpen(true)
      }
    }

    if (searchParams.get('guide') === 'true' || searchParams.get('huong-dan') === 'true') {
      setModalTab('guide')
      setIsModalOpen(true)
    } else if (searchParams.get('rules') === 'true' || searchParams.get('the-le') === 'true') {
      setModalTab('rules')
      setIsModalOpen(true)
    }
  }, [searchParams, teams])

  const handleOpenDrawer = (team: TeamVote) => {
    setSelectedTeam(team)
    setIsDrawerOpen(true)
  }

  const handleOpenGuide = () => {
    setModalTab('guide')
    setIsModalOpen(true)
  }

  const handleOpenRules = () => {
    setModalTab('rules')
    setIsModalOpen(true)
  }

  const handleVoteDirect = (team: TeamVote) => {
    if (team.votingDisabled) return
    window.open(team.eventistaUrl || 'https://gendarena.1vote.vn/', '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="min-h-screen bg-surface-base text-text-primary pb-28 md:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header — brutalist, zero prose, no redundant breadcrumbs or demo switchers */}
        <EditorialHeader
          status={status}
          onOpenGuide={handleOpenGuide}
          onOpenRules={handleOpenRules}
        />

        {/* Grid: 8 official voting teams */}
        <div className="py-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-3 sm:gap-4">
            {teams.map((team) => (
              <EditorialTeamCard
                key={team.id}
                team={team}
                status={status}
                liveVote={votesByTeamId[team.id]}
                onOpenDrawer={handleOpenDrawer}
                onVoteDirect={handleVoteDirect}
              />
            ))}
          </div>
        </div>

        {/* Minimal footer with Eventista brand info */}
        <footer className="pt-6 pb-4 border-t border-surface-border flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-text-tertiary">
          <div className="flex items-center gap-2">
            <span>1 tài khoản · 1 lượt vote · Bảo trợ công nghệ:</span>
            <EventistaLogo className="h-5" withLink />
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-mono">
            <a href="tel:+84832338688" className="hover:text-text-primary transition-colors">
              Hotline: (+84) 832 338 688
            </a>
            <span className="hidden sm:inline opacity-30">•</span>
            <a href="mailto:Contact@eventista.vn" className="hover:text-text-primary transition-colors">
              Contact@eventista.vn
            </a>
            <span className="hidden sm:inline opacity-30">•</span>
            <a
              href="https://www.facebook.com/eventista.vn/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-text-primary transition-colors"
            >
              Facebook ↗
            </a>
          </div>
        </footer>
      </div>

      {/* Slide Drawer */}
      <TeamSlideDrawer
        team={selectedTeam}
        teams={teams}
        status={status}
        liveVote={selectedTeam ? votesByTeamId[selectedTeam.id] : undefined}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelectTeam={(t) => setSelectedTeam(t)}
        onOpenGuide={handleOpenGuide}
      />

      {/* Guide & Rules Modal */}
      <MinimalRulesModal
        isOpen={isModalOpen}
        initialTab={modalTab}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Mobile Sticky Bar */}
      <MobileStickyBottomBar
        currentTeam={selectedTeam || teams[0]}
        status={status}
        onOpenDetail={handleOpenDrawer}
        onVoteDirect={handleVoteDirect}
      />
    </div>
  )
}
