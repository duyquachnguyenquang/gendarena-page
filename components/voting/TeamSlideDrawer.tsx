'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Share2,
  Check,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Users,
  ShieldCheck,
  GraduationCap,
  Play,
  Heart,
} from 'lucide-react'
import { TeamVote, VotingPhaseStatus } from '@/types/voting'
import { getVideoEmbedUrl } from '@/lib/utils'
import EventistaLogo from './EventistaLogo'

interface TeamSlideDrawerProps {
  team: TeamVote | null
  teams: TeamVote[]
  status: VotingPhaseStatus
  isOpen: boolean
  onClose: () => void
  onSelectTeam: (team: TeamVote) => void
}

export default function TeamSlideDrawer({
  team,
  teams,
  status,
  isOpen,
  onClose,
  onSelectTeam,
}: TeamSlideDrawerProps) {
  const [copied, setCopied] = useState(false)

  const currentIndex = team ? teams.findIndex((t) => t.id === team.id) : -1
  const prevTeam = currentIndex > 0 ? teams[currentIndex - 1] : teams[teams.length - 1]
  const nextTeam = currentIndex < teams.length - 1 ? teams[currentIndex + 1] : teams[0]

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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        />

        {/* Right Slide-in Drawer */}
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-y-0 right-0 w-full sm:max-w-xl md:max-w-2xl bg-surface-raised border-l border-surface-border shadow-2xl flex flex-col z-50"
        >
          {/* ─── Top Header ─── */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-border bg-surface-raised">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-[3px] bg-surface-overlay border border-surface-border text-brand-cyan">
                {team.msbc}
              </span>
              <span className="text-xs font-mono text-text-tertiary">
                {currentIndex + 1} / {teams.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Prev / Next */}
              <button
                type="button"
                onClick={() => onSelectTeam(prevTeam)}
                className="size-7 rounded-[4px] flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-elevated transition-colors"
                title="Đội trước (←)"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => onSelectTeam(nextTeam)}
                className="size-7 rounded-[4px] flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-elevated transition-colors"
                title="Đội tiếp theo (→)"
              >
                <ChevronRight className="size-4" />
              </button>

              <div className="w-px h-3.5 bg-surface-border mx-1" />

              {/* Share */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="size-7 rounded-[4px] flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-elevated transition-colors"
                title="Sao chép link đội thi"
              >
                {copied ? <Check className="size-3.5 text-semantic-success" /> : <Share2 className="size-3.5" />}
              </button>

              {/* Close */}
              <button
                type="button"
                onClick={onClose}
                className="size-7 rounded-[4px] flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-elevated transition-colors"
                title="Đóng (Esc)"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* ─── Scrollable Body ─── */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            {/* 1. Video Pitch Player (16:9) */}
            <div className="space-y-1.5">
              <div className="relative aspect-video w-full rounded-[4px] overflow-hidden bg-surface-base border border-surface-border">
                <iframe
                  src={getVideoEmbedUrl(team.videoPitchUrl)}
                  title={`Video pitch ${team.name}`}
                  className="size-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-text-tertiary font-mono">
                <span>{team.videoDuration}</span>
                <span>{team.category}</span>
              </div>
            </div>

            {/* 2. Team Name & Quote */}
            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
                {team.name}
              </h2>

              <p className="text-sm italic text-text-secondary leading-relaxed border-l-2 border-brand-cyan/50 pl-3 py-0.5">
                "{team.quote}"
              </p>

              <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
                <GraduationCap className="size-3.5" />
                <span>{team.institution}</span>
              </div>
            </div>

            {/* 3. Primary CTA Section */}
            <div className="p-4 rounded-[4px] bg-surface-overlay border border-surface-border space-y-2.5">
              <div className="flex items-center justify-between text-[11px] text-text-tertiary">
                <span className="uppercase tracking-wide font-semibold">Bình chọn Vòng 3</span>
                <a
                  href="https://eventistax.com/vi/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:opacity-85 transition-opacity"
                  title="Eventista — Nền tảng bảo trợ & vận hành cổng bình chọn trực tuyến"
                >
                  <img src="/logo/eventista-badge.png" alt="Eventista" className="size-3.5 rounded-[2px] object-contain" />
                  <span className="font-semibold text-text-secondary hover:text-text-primary">Eventista</span>
                </a>
              </div>

              {isVotingActive && (
                <a
                  href={team.eventistaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full"
                >
                  <button
                    type="button"
                    className="w-full py-3 px-4 rounded-[4px] bg-brand-cyan text-surface-base font-bold text-sm uppercase tracking-wide hover:bg-brand-cyanBright transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Vote ngay</span>
                    <ArrowUpRight className="size-4" />
                  </button>
                </a>
              )}

              {isUpcoming && (
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 px-4 rounded-[4px] border border-surface-border text-text-disabled text-xs uppercase tracking-wide cursor-not-allowed text-center"
                >
                  Mở lúc 20:00 · 25.10.2026
                </button>
              )}

              {isEnded && (
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 px-4 rounded-[4px] border border-surface-border text-text-disabled text-xs uppercase tracking-wide cursor-not-allowed text-center"
                >
                  Đã đóng · 23:59 · 02.11.2026
                </button>
              )}

              <p className="text-[10px] text-text-tertiary text-center">
                1 tài khoản hợp lệ = 1 lượt vote miễn phí.
              </p>
            </div>

            {/* 4. Problem & Solution */}
            <div className="space-y-3">
              <h3 className="text-[11px] uppercase tracking-widest text-text-tertiary font-semibold">
                Thuyết Trình Dự Án
              </h3>

              <div className="space-y-2">
                <div className="p-3.5 rounded-[4px] bg-surface-overlay border border-surface-border space-y-1">
                  <span className="text-[10px] font-mono uppercase text-text-tertiary font-semibold block tracking-wider">
                    Bài toán
                  </span>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {team.problem}
                  </p>
                </div>

                <div className="p-3.5 rounded-[4px] bg-surface-overlay border border-surface-border space-y-1">
                  <span className="text-[10px] font-mono uppercase text-brand-cyan font-semibold block tracking-wider">
                    Giải pháp
                  </span>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    {team.solution}
                  </p>
                </div>
              </div>
            </div>

            {/* 5. Members */}
            <div className="space-y-2.5">
              <h3 className="text-[11px] uppercase tracking-widest text-text-tertiary font-semibold flex items-center gap-1.5">
                <Users className="size-3" />
                <span>Thành Viên ({team.members.length})</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {team.members.map((member, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-[4px] bg-surface-overlay border border-surface-border flex items-center gap-2.5"
                  >
                    <div className="size-7 rounded-[3px] bg-surface-raised border border-surface-border flex items-center justify-center font-mono font-semibold text-[11px] text-brand-cyan shrink-0">
                      {member.name.split(' ').slice(-1)[0]?.charAt(0) || 'M'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate">{member.name}</p>
                      <p className="text-[10px] text-brand-cyan truncate">{member.role}</p>
                      <p className="text-[10px] text-text-tertiary truncate">{member.university}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ─── Footer Bar ─── */}
          <div className="px-5 py-3 border-t border-surface-border bg-surface-raised flex items-center justify-between text-xs text-text-tertiary">
            <button
              type="button"
              onClick={() => onSelectTeam(prevTeam)}
              className="hover:text-text-primary transition-colors flex items-center gap-1"
              title="Đội trước"
            >
              <ChevronLeft className="size-3.5" />
              <span className="font-mono">{prevTeam.msbc}</span>
            </button>

            <EventistaLogo className="h-4" withLink />

            <button
              type="button"
              onClick={() => onSelectTeam(nextTeam)}
              className="hover:text-text-primary transition-colors flex items-center gap-1"
              title="Đội tiếp theo"
            >
              <span className="font-mono">{nextTeam.msbc}</span>
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </motion.aside>
      </div>
    </AnimatePresence>
  )
}
