'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Play,
  Share2,
  Check,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Users,
  ShieldCheck,
  Clock,
  Heart,
  Lock,
  GraduationCap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { TeamVote, VotingPhaseStatus } from '@/types/voting'
import EventistaLogo from './EventistaLogo'

interface TeamDetailModalProps {
  team: TeamVote | null
  teams: TeamVote[]
  status: VotingPhaseStatus
  isOpen: boolean
  onClose: () => void
  onSelectTeam: (team: TeamVote) => void
}

export default function TeamDetailModal({
  team,
  teams,
  status,
  isOpen,
  onClose,
  onSelectTeam,
}: TeamDetailModalProps) {
  const [copied, setCopied] = useState(false)
  const [secondsSpent, setSecondsSpent] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Like micro-interaction within modal
  const [likes, setLikes] = useState<number>(0)
  const [hasLiked, setHasLiked] = useState<boolean>(false)

  const currentIndex = team ? teams.findIndex((t) => t.id === team.id) : -1
  const prevTeam = currentIndex > 0 ? teams[currentIndex - 1] : teams[teams.length - 1]
  const nextTeam = currentIndex < teams.length - 1 ? teams[currentIndex + 1] : teams[0]

  useEffect(() => {
    if (!isOpen || !team) {
      setSecondsSpent(0)
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    setLikes(team.likesCount || 100)
    try {
      setHasLiked(localStorage.getItem(`gendarena_liked_${team.id}`) === 'true')
    } catch {}

    setSecondsSpent(0)
    timerRef.current = setInterval(() => {
      setSecondsSpent((prev) => prev + 1)
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isOpen, team?.id])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && prevTeam) onSelectTeam(prevTeam)
      if (e.key === 'ArrowRight' && nextTeam) onSelectTeam(nextTeam)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, prevTeam, nextTeam, onClose, onSelectTeam])

  if (!isOpen || !team) return null

  const isVotingActive = status === 'ACTIVE'
  const isUpcoming = status === 'UPCOMING'
  const isEnded = status === 'ENDED'

  const handleCopyLink = () => {
    const url = `${window.location.origin}/vote?team=${team.id}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleHeartClick = () => {
    if (hasLiked) {
      setLikes((prev) => Math.max(0, prev - 1))
      setHasLiked(false)
      try {
        localStorage.removeItem(`gendarena_liked_${team.id}`)
      } catch {}
    } else {
      setLikes((prev) => prev + 1)
      setHasLiked(true)
      try {
        localStorage.setItem(`gendarena_liked_${team.id}`, 'true')
      } catch {}
    }
  }

  const retentionProgress = Math.min(100, Math.round((secondsSpent / 25) * 100))
  const hasWatchedEnough = secondsSpent >= 15

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-40 flex items-center justify-center p-0 sm:p-4 md:p-6 overflow-y-auto">
        {/* Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative z-50 w-full max-w-3xl max-h-screen sm:max-h-[90vh] flex flex-col bg-surface-overlay border border-surface-border rounded-none sm:rounded-xl shadow-elevation-3 overflow-hidden text-text-primary"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-surface-overlay border-b border-surface-border">
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface-raised text-brand-cyan border border-surface-border shrink-0">
                {team.msbc}
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-base sm:text-lg font-semibold text-text-primary truncate">
                  {team.name}
                </h2>
                <p className="text-xs text-text-tertiary truncate">
                  {team.institution}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyLink}
                className="text-xs h-8 px-2.5 gap-1.5"
              >
                {copied ? <Check className="size-3.5 text-semantic-success" /> : <Share2 className="size-3.5" />}
                <span className="hidden sm:inline">{copied ? 'Đã sao chép' : 'Chia sẻ'}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="size-8 p-0 text-text-secondary hover:text-text-primary"
              >
                <X className="size-5" />
              </Button>
            </div>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
            {/* 1. Team Banner Image */}
            <div className="space-y-2">
              <div className="relative aspect-video w-full rounded-md overflow-hidden bg-surface-base border border-surface-border">
                <img
                  src={team.posterUrl || team.avatarUrl}
                  alt={team.name}
                  className="size-full object-cover"
                />
              </div>
            </div>

            {/* 2. Team Quote & Slogan */}
            <div className="p-4 rounded-md bg-surface-raised border border-surface-border space-y-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-brand-cyan font-medium block">
                Thông điệp tâm đắc của đội
              </span>
              <p className="font-body text-sm sm:text-base italic text-text-primary leading-relaxed border-l-2 border-brand-cyan pl-3">
                "{team.quote}"
              </p>
              <p className="text-xs text-text-tertiary">
                Châm ngôn hành động: <span className="text-text-secondary italic">"{team.slogan}"</span>
              </p>
            </div>

            {/* 3. Primary Voting CTA Box */}
            <div className="p-4 sm:p-5 rounded-lg bg-surface-raised border border-surface-border-strong space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <h4 className="font-display font-semibold text-base text-text-primary">
                    Bình chọn cho {team.name} ({team.msbc})
                  </h4>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Phiếu bầu được xác thực trực tiếp và bảo trợ bởi Eventista
                  </p>
                </div>

                {/* Heart Button */}
                <button
                  type="button"
                  onClick={handleHeartClick}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    hasLiked
                      ? 'bg-semantic-danger/15 text-semantic-danger border border-semantic-danger/30'
                      : 'text-text-secondary bg-surface-overlay hover:bg-surface-elevated border border-surface-border'
                  }`}
                >
                  <Heart className={`size-3.5 ${hasLiked ? 'fill-semantic-danger text-semantic-danger' : ''}`} />
                  <span>{hasLiked ? 'Đã cổ vũ' : 'Thả tim cổ vũ'}</span>
                  <span className="font-mono opacity-80">({likes})</span>
                </button>
              </div>

              {/* Action Button: State-aware */}
              {isVotingActive && (
                <a
                  href={team.eventistaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full"
                >
                  <Button
                    variant="primary"
                    size="lg"
                    className="w-full font-semibold text-sm sm:text-base justify-center py-4"
                  >
                    <span>Gửi 1 vote cho {team.name} qua Eventista ↗</span>
                  </Button>
                </a>
              )}

              {isUpcoming && (
                <Button
                  variant="secondary"
                  size="md"
                  disabled
                  className="w-full text-xs font-medium text-text-disabled border-surface-border justify-center"
                >
                  <Clock className="size-3.5 text-semantic-warning mr-1.5" />
                  <span>Cổng bình chọn sẽ mở lúc 20:00 ngày 25/10/2026</span>
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
                  <span>Bình chọn đã kết thúc vào 20:00 ngày 07/11/2026</span>
                </Button>
              )}

              <div className="flex items-center justify-between text-[11px] text-text-tertiary pt-1">
                <a
                  href="https://eventistax.com/vi/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-text-primary transition-colors"
                >
                  <ShieldCheck className="size-3 text-semantic-success" />
                  Bảo trợ bởi nền tảng Eventista ↗
                </a>
                <span>1 tài khoản = 1 lượt bình chọn hợp lệ</span>
              </div>
            </div>

            {/* 4. Project Problem & Solution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-md bg-surface-raised border border-surface-border space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-text-tertiary font-semibold block">
                  Bài toán thực tế
                </span>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {team.problem}
                </p>
              </div>

              <div className="p-4 rounded-md bg-surface-raised border border-surface-border space-y-1">
                <span className="text-[11px] font-mono uppercase tracking-wider text-brand-cyan font-semibold block">
                  Giải pháp của đội
                </span>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {team.solution}
                </p>
              </div>
            </div>

            {/* 5. Team Members */}
            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Users className="size-4 text-brand-cyan" />
                <h4 className="font-display font-semibold text-sm text-text-primary">
                  Thành viên đội thi ({team.members.length} bạn)
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {team.members.map((member, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-md bg-surface-raised border border-surface-border flex items-center gap-2.5"
                  >
                    <div className="size-8 rounded-full bg-surface-overlay border border-surface-border flex items-center justify-center font-display font-semibold text-xs text-brand-cyan shrink-0">
                      {member.name.split(' ').slice(-1)[0]?.charAt(0) || 'M'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-xs text-text-primary truncate">{member.name}</p>
                      <p className="text-[11px] text-brand-cyan truncate">{member.role}</p>
                      <p className="text-[10px] text-text-tertiary truncate">{member.university}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="p-4 bg-surface-overlay border-t border-surface-border flex items-center justify-between gap-3 text-xs">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSelectTeam(prevTeam)}
              className="text-xs gap-1"
            >
              <ChevronLeft className="size-4" />
              <span>Đội trước: {prevTeam.msbc}</span>
            </Button>

            <span className="font-mono text-text-tertiary">
              {currentIndex + 1} / {teams.length}
            </span>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSelectTeam(nextTeam)}
              className="text-xs gap-1"
            >
              <span>Đội tiếp: {nextTeam.msbc}</span>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
