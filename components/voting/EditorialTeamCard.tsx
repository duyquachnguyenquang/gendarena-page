'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, ArrowUpRight, Info, Heart } from 'lucide-react'
import { TeamVote, VotingPhaseStatus } from '@/types/voting'

interface EditorialTeamCardProps {
  team: TeamVote
  status: VotingPhaseStatus
  onOpenDrawer: (team: TeamVote) => void
  onVoteDirect?: (team: TeamVote) => void
}

export default function EditorialTeamCard({
  team,
  status,
  onOpenDrawer,
  onVoteDirect,
}: EditorialTeamCardProps) {
  const isActive = status === 'ACTIVE'
  const isUpcoming = status === 'UPCOMING'

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
      try { localStorage.setItem(`gendarena_liked_${team.id}`, 'true') } catch {}
    } else {
      try { localStorage.removeItem(`gendarena_liked_${team.id}`) } catch {}
    }
  }

  const handleVote = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isActive) {
      onVoteDirect ? onVoteDirect(team) : window.open(team.eventistaUrl, '_blank', 'noopener,noreferrer')
    } else {
      onOpenDrawer(team)
    }
  }

  return (
    <article className="group flex flex-col bg-surface-raised border border-surface-border rounded-xl overflow-hidden hover:border-brand-cyan/40 transition-all duration-200">
      {/* ── Image 4:3 landscape to fit team members ── */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface-overlay">
        <img
          src={team.avatarUrl || team.posterUrl}
          alt={team.name}
          loading="lazy"
          className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />

        {/* Gradient vignette bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent pointer-events-none" />

        {/* Order number — top-left */}
        <span className="absolute top-2.5 left-2.5 font-mono text-[11px] font-semibold text-text-primary bg-black/70 border border-white/15 px-2 py-0.5 rounded-[3px] select-none backdrop-blur-sm">
          {team.msbc}
        </span>

        {/* Icon actions — top-right stack */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5">

          {/* Xem thông tin */}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenDrawer(team) }}
            title="Xem thông tin đội thi"
            className="size-7 rounded-[4px] bg-black/70 border border-white/15 backdrop-blur-sm flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-black/90 transition-colors"
          >
            <Info className="size-3.5" />
          </button>

          {/* Cổ vũ */}
          <button
            type="button"
            onClick={handleLike}
            title={hasLiked ? 'Bỏ cổ vũ' : 'Thả tim cổ vũ'}
            className={`size-7 rounded-[4px] bg-black/70 border border-white/15 backdrop-blur-sm flex items-center justify-center transition-colors ${
              hasLiked
                ? 'text-semantic-danger border-semantic-danger/40'
                : 'text-text-secondary hover:text-text-primary hover:bg-black/90'
            }`}
          >
            <Heart className={`size-3.5 ${hasLiked ? 'fill-semantic-danger' : ''}`} />
          </button>
        </div>

        {/* Floating heart pop */}
        <AnimatePresence>
          {showPop && (
            <motion.span
              initial={{ opacity: 1, y: 0, scale: 0.8 }}
              animate={{ opacity: 0, y: -32, scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
              className="absolute right-4 top-1/3 text-semantic-danger text-xs font-semibold pointer-events-none select-none"
            >
              ♥ +1
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Team name */}
        <div>
          <h3 className="text-base font-bold text-text-primary tracking-tight leading-tight">
            {team.name}
          </h3>
          <p className="mt-1 text-xs text-text-tertiary line-clamp-1">
            {team.institution}
          </p>
        </div>

        {/* Primary CTA — single decisive button */}
        {isActive && (
          <button
            type="button"
            onClick={handleVote}
            className="mt-auto flex items-center justify-center gap-1.5 w-full py-2.5 rounded-[4px] bg-brand-cyan text-surface-base text-sm font-bold uppercase tracking-wide hover:bg-brand-cyanBright transition-colors"
          >
            <span>Vote ngay</span>
            <ArrowUpRight className="size-4" />
          </button>
        )}

        {isUpcoming && (
          <button
            type="button"
            disabled
            className="mt-auto w-full py-2.5 rounded-[4px] border border-surface-border text-text-disabled text-xs uppercase tracking-wide cursor-not-allowed text-center"
          >
            Mở lúc 20:00 · 25.10
          </button>
        )}

        {status === 'ENDED' && (
          <button
            type="button"
            disabled
            className="mt-auto w-full py-2.5 rounded-[4px] border border-surface-border text-text-disabled text-xs uppercase tracking-wide cursor-not-allowed text-center"
          >
            Đã khép lại
          </button>
        )}
      </div>
    </article>
  )
}
