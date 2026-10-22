'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Heart,
  ArrowUpRight,
  Clock,
  Lock,
  GraduationCap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TeamVote, VotingPhaseStatus } from '@/types/voting'

interface TeamCardProps {
  team: TeamVote
  status: VotingPhaseStatus
  onSelectTeam: (team: TeamVote) => void
  onVoteDirect?: (team: TeamVote) => void
}

export default function TeamCard({
  team,
  status,
  onSelectTeam,
  onVoteDirect,
}: TeamCardProps) {
  const isVotingActive = status === 'ACTIVE'
  const isUpcoming = status === 'UPCOMING'
  const isEnded = status === 'ENDED'

  // Micro-interaction: Cheering Heart state (persisted in localStorage)
  const [likes, setLikes] = useState<number>(team.likesCount || 100)
  const [hasLiked, setHasLiked] = useState<boolean>(false)
  const [showHeartPop, setShowHeartPop] = useState<boolean>(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`gendarena_liked_${team.id}`)
      if (stored === 'true') {
        setHasLiked(true)
      }
    } catch {
      // ignore in SSR or restricted storage
    }
  }, [team.id])

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasLiked) {
      setLikes((prev) => Math.max(0, prev - 1))
      setHasLiked(false)
      try {
        localStorage.removeItem(`gendarena_liked_${team.id}`)
      } catch {}
    } else {
      setLikes((prev) => prev + 1)
      setHasLiked(true)
      setShowHeartPop(true)
      setTimeout(() => setShowHeartPop(false), 900)
      try {
        localStorage.setItem(`gendarena_liked_${team.id}`, 'true')
      } catch {}
    }
  }

  const handleVoteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isVotingActive) {
      onSelectTeam(team)
      return
    }
    if (onVoteDirect) {
      onVoteDirect(team)
    } else {
      window.open(team.eventistaUrl, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div
      onClick={() => onSelectTeam(team)}
      className="group bg-surface-raised border border-surface-border hover:border-surface-border-strong hover:shadow-elevation-2 rounded-lg p-5 flex flex-col justify-between transition-all duration-[250ms] cursor-pointer"
    >
      <div>
        {/* ─── Header: Tinh tế như một con tem nghệ thuật ─── */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface-overlay text-brand-cyan border border-surface-border">
              {team.msbc}
            </span>
            <Badge variant="default" size="sm" className="text-[11px] font-normal text-text-tertiary">
              {team.category}
            </Badge>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-text-tertiary max-w-[170px] truncate" title={team.institution}>
            <GraduationCap className="size-3.5 text-text-tertiary shrink-0" />
            <span className="truncate">{team.institution}</span>
          </div>
        </div>

        {/* ─── Photo / Poster đại diện ─── */}
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-md bg-surface-overlay border border-surface-border mb-4">
          <img
            src={team.posterUrl || team.avatarUrl}
            alt={`Ảnh đội thi ${team.name}`}
            className="size-full object-cover transition-transform duration-[250ms] group-hover:scale-[1.02]"
            loading="lazy"
          />

          {/* Category Pill */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-base/85 border border-surface-border text-[11px] font-mono text-text-secondary backdrop-blur-sm">
            <span>{team.category}</span>
          </div>

          {/* Micro-interaction: Animated heart floating when clicked */}
          <AnimatePresence>
            {showHeartPop && (
              <motion.div
                initial={{ opacity: 1, scale: 0.5, y: 0 }}
                animate={{ opacity: 0, scale: 1.6, y: -45 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
              >
                <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-surface-base/90 border border-semantic-danger/40 text-semantic-danger font-display font-medium text-xs shadow-elevation-2">
                  <Heart className="size-4 fill-semantic-danger" />
                  <span>+1 Cổ vũ!</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ─── Team Info ─── */}
        <div className="space-y-2.5">
          {/* Team Name */}
          <h3 className="font-display text-lg font-semibold text-text-primary group-hover:text-brand-cyan transition-colors leading-snug">
            {team.name}
          </h3>

          {/* Quote: Câu nói tâm đắc nhất của đội (In nghiêng, chân thành) */}
          <p className="font-body text-xs sm:text-sm italic text-text-secondary leading-relaxed border-l-2 border-brand-cyan/40 pl-2.5 py-0.5">
            "{team.quote}"
          </p>

          {/* Project Summary: Đúng 2 câu dễ hiểu */}
          <p className="font-body text-xs text-text-secondary leading-relaxed line-clamp-2">
            {team.summary}
          </p>
        </div>
      </div>

      {/* ─── Bottom Actions & Micro-interaction ─── */}
      <div className="mt-5 pt-3.5 border-t border-surface-border space-y-2.5">
        {/* Micro-interaction: "Thả tim cổ vũ" Button */}
        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleHeartClick}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-colors duration-[150ms] ${
              hasLiked
                ? 'bg-semantic-danger/15 text-semantic-danger border border-semantic-danger/30'
                : 'text-text-tertiary hover:text-text-primary bg-surface-overlay hover:bg-surface-elevated border border-surface-border'
            }`}
            title="Thả tim cổ vũ cho đội thi"
          >
            <Heart
              className={`size-3.5 transition-transform duration-[150ms] active:scale-125 ${
                hasLiked ? 'fill-semantic-danger text-semantic-danger' : 'text-text-tertiary'
              }`}
            />
            <span className="font-medium">
              {hasLiked ? 'Đã thả tim' : 'Thả tim cổ vũ'}
            </span>
            <span className="font-mono text-[11px] opacity-80">({likes})</span>
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onSelectTeam(team)
            }}
            className="text-xs text-text-tertiary hover:text-brand-cyan transition-colors"
          >
            Xem chi tiết đề án ↗
          </button>
        </div>

        {/* Primary CTA: Rõ ràng, gần gũi "Gửi 1 vote cho [Tên đội] qua Eventista ↗" */}
        {isVotingActive && (
          <Button
            variant="primary"
            size="md"
            onClick={handleVoteClick}
            className="w-full text-xs sm:text-sm font-semibold tracking-normal justify-center"
          >
            <span>Gửi 1 vote cho {team.name} qua Eventista</span>
            <ArrowUpRight className="size-4 shrink-0" />
          </Button>
        )}

        {isUpcoming && (
          <Button
            variant="secondary"
            size="md"
            disabled
            className="w-full text-xs font-medium text-text-disabled border-surface-border justify-center"
          >
            <Clock className="size-3.5 text-semantic-warning mr-1.5" />
            <span>Mở cổng 20:00 ngày 25/10</span>
          </Button>
        )}

        {isEnded && (
          <Button
            variant="secondary"
            size="md"
            disabled
            className="w-full text-xs font-medium text-text-disabled border-surface-border justify-center"
          >
            <Lock className="size-3.5 text-text-tertiary mr-1.5" />
            <span>Cổng bình chọn đã đóng</span>
          </Button>
        )}
      </div>
    </div>
  )
}
