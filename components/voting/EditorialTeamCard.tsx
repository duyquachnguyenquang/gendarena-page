'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpRight, Info, Heart } from 'lucide-react'
import { TeamVote, VotingPhaseStatus } from '@/types/voting'

export interface LiveVoteInfo {
  votes: number
  rank: number
  oneVoteId?: string
}

interface EditorialTeamCardProps {
  team: TeamVote
  status: VotingPhaseStatus
  liveVote?: LiveVoteInfo
  onOpenDrawer: (team: TeamVote) => void
  onVoteDirect?: (team: TeamVote) => void
}

export default function EditorialTeamCard({
  team,
  status,
  liveVote,
  onOpenDrawer,
  onVoteDirect,
}: EditorialTeamCardProps) {
  const isActive = status === 'ACTIVE'

  // Micro-interaction: local like (cosmetic only)
  const [hasLiked, setHasLiked] = useState(false)
  const [showPop, setShowPop] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(`gendarena_liked_${team.id}`) === 'true') setHasLiked(true)
    } catch {}
  }, [team.id])

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation()
    const next = !hasLiked
    setHasLiked(next)
    if (next) {
      setShowPop(true)
      setTimeout(() => setShowPop(false), 700)
      try {
        localStorage.setItem(`gendarena_liked_${team.id}`, 'true')
      } catch {}
    } else {
      try {
        localStorage.removeItem(`gendarena_liked_${team.id}`)
      } catch {}
    }
  }

  const handleVote = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (team.votingDisabled) {
      onOpenDrawer(team)
      return
    }
    if (isActive && team.eventistaUrl) {
      onVoteDirect ? onVoteDirect(team) : window.open(team.eventistaUrl, '_blank', 'noopener,noreferrer')
    } else {
      onOpenDrawer(team)
    }
  }

  return (
    <article className="group flex flex-col bg-surface-raised border border-surface-border rounded-lg overflow-hidden hover:border-brand-cyan/40 hover:shadow-[0_4px_24px_rgba(0,0,0,0.35)] transition-all duration-200">
      {/* ── Image 4:3 landscape to fit team members ── */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-overlay">
        <img
          src={team.avatarUrl || team.posterUrl}
          alt={team.name}
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />

        {/* Gradient vignette bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        {/* Top-left: Order number + Live Vote count */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
          <span className="font-mono text-[11px] font-semibold text-text-primary bg-black/75 border border-white/15 px-2 py-0.5 rounded-[3px] select-none backdrop-blur-sm">
            {team.msbc}
          </span>

          {liveVote !== undefined && (
            <span
              className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-brand-cyan bg-black/80 border border-brand-cyan/40 px-2 py-0.5 rounded-[3px] select-none backdrop-blur-sm shadow-[0_0_12px_rgba(0,212,255,0.2)]"
              title={`Hạng #${liveVote.rank || '-'} · ${liveVote.votes.toLocaleString()} lượt vote trên Eventista`}
            >
              <span className="size-1.5 rounded-full bg-brand-cyan animate-pulse" />
              <span>{liveVote.votes.toLocaleString()}</span>
              <span className="text-[9px] uppercase tracking-wider text-brand-cyan/80">vote</span>
              {liveVote.rank > 0 && (
                <span className="text-text-tertiary text-[10px] pl-1 border-l border-white/20">
                  #{liveVote.rank}
                </span>
              )}
            </span>
          )}
        </div>

        {/* Icon actions — top-right stack with interactive micro-animations */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5">
          {/* Xem thông tin */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onOpenDrawer(team)
            }}
            title="Xem thông tin đội thi"
            className="size-7 rounded-[4px] bg-black/75 border border-white/20 backdrop-blur-sm flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-brand-cyan/50 hover:bg-black/90 hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer"
          >
            <Info className="size-3.5" />
          </button>

          {/* Cổ vũ */}
          {!team.votingDisabled && (
            <button
              type="button"
              onClick={handleLike}
              title={hasLiked ? 'Bỏ cổ vũ' : 'Thả tim cổ vũ'}
              className={`size-7 rounded-[4px] bg-black/75 border backdrop-blur-sm flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-150 cursor-pointer ${
                hasLiked
                  ? 'text-semantic-danger border-semantic-danger/60 bg-semantic-danger/10 shadow-[0_0_10px_rgba(255,77,109,0.35)]'
                  : 'border-white/20 text-text-secondary hover:text-text-primary hover:border-white/40 hover:bg-black/90'
              }`}
            >
              <Heart
                className={`size-3.5 transition-transform duration-150 ${
                  hasLiked ? 'fill-semantic-danger scale-110' : ''
                }`}
              />
            </button>
          )}
        </div>

        {/* Floating heart pop */}
        <AnimatePresence>
          {showPop && !team.votingDisabled && (
            <motion.span
              initial={{ opacity: 1, y: 0, scale: 0.8 }}
              animate={{ opacity: 0, y: -32, scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
              className="absolute right-4 top-1/3 text-semantic-danger text-xs font-semibold pointer-events-none select-none drop-shadow"
            >
              ♥ +1
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Team name & info */}
        <div>
          <h3 className="text-base font-bold text-text-primary tracking-tight leading-tight group-hover:text-brand-cyan transition-colors">
            {team.name}
          </h3>
          <p className="mt-1 text-xs text-text-tertiary line-clamp-1">
            {team.institution}
          </p>
        </div>

        {/* Primary CTA — "Vote ngay" with high-impact micro-animations & tactile hover */}
        {!team.votingDisabled && (
          <button
            type="button"
            onClick={handleVote}
            className="group/btn relative mt-auto flex items-center justify-center gap-1.5 w-full py-2.5 rounded-[4px] bg-brand-cyan text-surface-base text-sm font-bold uppercase tracking-wide overflow-hidden transition-all duration-200 hover:bg-brand-cyanBright hover:shadow-[0_0_20px_rgba(0,212,255,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] cursor-pointer"
          >
            {/* Shimmer sheen sweep on hover */}
            <span className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform ease-out pointer-events-none" />

            <span className="relative z-10">Vote ngay</span>
            <ArrowUpRight className="relative z-10 size-4 transition-transform duration-200 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
          </button>
        )}
      </div>
    </article>
  )
}
