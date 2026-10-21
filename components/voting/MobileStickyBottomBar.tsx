'use client'

import React from 'react'
import { ArrowUpRight, Play, Clock, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TeamVote, VotingPhaseStatus } from '@/types/voting'

interface MobileStickyBottomBarProps {
  currentTeam: TeamVote | null
  status: VotingPhaseStatus
  onOpenDetail: (team: TeamVote) => void
  onVoteDirect: (team: TeamVote) => void
}

export default function MobileStickyBottomBar({
  currentTeam,
  status,
  onOpenDetail,
  onVoteDirect,
}: MobileStickyBottomBarProps) {
  if (!currentTeam) return null

  const isVotingActive = status === 'ACTIVE'
  const isUpcoming = status === 'UPCOMING'
  const isEnded = status === 'ENDED'

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-surface-raised border-t border-surface-border p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur-md">
      <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
        {/* Team Preview info */}
        <div
          onClick={() => onOpenDetail(currentTeam)}
          className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
        >
          <span className="font-mono text-xs font-semibold px-2 py-1 rounded-[3px] bg-surface-overlay text-brand-cyan border border-surface-border shrink-0">
            {currentTeam.msbc}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-text-primary truncate">
              {currentTeam.name}
            </p>
            <p className="text-[10px] text-text-tertiary truncate">
              {currentTeam.institution}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="shrink-0 flex items-center gap-1.5">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onOpenDetail(currentTeam)}
            className="h-8 px-2.5 text-xs rounded-[4px]"
            title="Xem video pitch"
          >
            <Play className="size-3 fill-current" />
          </Button>

          {isVotingActive && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onVoteDirect(currentTeam)}
              className="h-8 px-3 text-xs font-bold uppercase tracking-wide gap-1 rounded-[4px]"
            >
              <span>Vote ngay</span>
              <ArrowUpRight className="size-3.5" />
            </Button>
          )}

          {isUpcoming && (
            <Button
              variant="secondary"
              size="sm"
              disabled
              className="h-8 px-2.5 text-[11px] text-text-disabled rounded-[4px]"
            >
              <Clock className="size-3 text-semantic-warning mr-1" />
              <span>Chưa mở</span>
            </Button>
          )}

          {isEnded && (
            <Button
              variant="secondary"
              size="sm"
              disabled
              className="h-8 px-2.5 text-[11px] text-text-disabled rounded-[4px]"
            >
              <Lock className="size-3 text-text-tertiary mr-1" />
              <span>Đã đóng</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
