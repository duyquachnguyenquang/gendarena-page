'use client'

import React, { useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { VOTING_CONFIG } from '@/config/voting'
import { TeamVote, VotingPhaseStatus } from '@/types/voting'
import EditorialHeader from '@/components/voting/EditorialHeader'
import EditorialTeamCard from '@/components/voting/EditorialTeamCard'
import TeamSlideDrawer from '@/components/voting/TeamSlideDrawer'
import MinimalRulesModal from '@/components/voting/MinimalRulesModal'
import MobileStickyBottomBar from '@/components/voting/MobileStickyBottomBar'
import EventistaLogo from '@/components/voting/EventistaLogo'

interface VoteClientProps {
  initialTeams?: TeamVote[]
}

export default function VoteClient({ initialTeams }: VoteClientProps) {
  const searchParams = useSearchParams()

  const teams = initialTeams && initialTeams.length > 0 ? initialTeams : VOTING_CONFIG.teams

  const [demoMode, setDemoMode] = useState<'AUTO' | 'UPCOMING' | 'ACTIVE' | 'ENDED'>('AUTO')
  const [selectedTeam, setSelectedTeam] = useState<TeamVote | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isRulesOpen, setIsRulesOpen] = useState(false)

  const autoStatus: VotingPhaseStatus = useMemo(() => {
    const now = Date.now()
    const start = new Date(VOTING_CONFIG.startDate).getTime()
    const end = new Date(VOTING_CONFIG.endDate).getTime()
    if (now < start) return 'UPCOMING'
    if (now > end) return 'ENDED'
    return 'ACTIVE'
  }, [])

  const status: VotingPhaseStatus = demoMode === 'AUTO' ? autoStatus : demoMode

  // Open drawer from URL param
  React.useEffect(() => {
    const param = searchParams.get('team')
    if (!param) return
    const found = teams.find(
      (t) => t.id === param || t.msbc === param || t.msbc.replace('#', '') === param
    )
    if (found) { setSelectedTeam(found); setIsDrawerOpen(true) }
  }, [searchParams, teams])

  const handleOpenDrawer = (team: TeamVote) => { setSelectedTeam(team); setIsDrawerOpen(true) }
  const handleVoteDirect = (team: TeamVote) => window.open(team.eventistaUrl, '_blank', 'noopener,noreferrer')

  return (
    <div className="min-h-screen bg-surface-base text-text-primary pb-28 md:pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="pt-6 text-xs font-mono text-text-tertiary flex items-center gap-1.5">
          <Link href="/" className="hover:text-text-secondary transition-colors">GenD Arena 2026</Link>
          <span>/</span>
          <span>Bình Chọn Vòng 3</span>
        </nav>

        {/* Header — brutalist, no prose */}
        <EditorialHeader
          status={status}
          demoMode={demoMode}
          onDemoModeChange={setDemoMode}
          onOpenRules={() => setIsRulesOpen(true)}
        />

        {/* Grid: 10 teams, no filter, no search */}
        <div className="py-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
            {teams.map((team) => (
              <EditorialTeamCard
                key={team.id}
                team={team}
                status={status}
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
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelectTeam={(t) => setSelectedTeam(t)}
      />

      {/* Rules Modal */}
      <MinimalRulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
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
