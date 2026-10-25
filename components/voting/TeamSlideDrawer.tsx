'use client'

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Users,
  GraduationCap,
  ExternalLink,
} from 'lucide-react'
import { TeamVote, VotingPhaseStatus } from '@/types/voting'
import EventistaLogo from './EventistaLogo'

interface TeamSlideDrawerProps {
  team: TeamVote | null
  teams: TeamVote[]
  status: VotingPhaseStatus
  liveVote?: { votes: number; rank: number }
  isOpen: boolean
  onClose: () => void
  onSelectTeam: (team: TeamVote) => void
  onOpenGuide?: () => void
}

export default function TeamSlideDrawer({
  team,
  teams,
  status,
  liveVote,
  isOpen,
  onClose,
  onSelectTeam,
  onOpenGuide,
}: TeamSlideDrawerProps) {
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

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm cursor-pointer"
        />

        {/* ── Centered Pop-up Window (thay thế Slide-drawer dài lê thê) ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative z-50 w-full max-w-lg bg-surface-overlay border border-surface-border rounded-xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]"
        >
          {/* ── Top Bar ── */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-border bg-surface-raised shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-[3px] bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30">
                {team.msbc}
              </span>
              <span className="text-[11px] font-mono text-text-tertiary">
                {team.category}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Prev / Next buttons */}
              {teams.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => onSelectTeam(prevTeam)}
                    className="size-7 rounded-[4px] flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
                    title="Đội trước (←)"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectTeam(nextTeam)}
                    className="size-7 rounded-[4px] flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
                    title="Đội tiếp theo (→)"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                  <div className="w-px h-3.5 bg-surface-border mx-1" />
                </>
              )}

              {/* Close button */}
              <button
                type="button"
                onClick={onClose}
                className="size-7 rounded-[4px] flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
                title="Đóng (Esc)"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          {/* ── Scrollable Body: Chỉ giữ hình ảnh, tên đội, đơn vị, thành viên, và nút vote ── */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {/* 1. Hình ảnh đội thi nổi bật */}
            <div className="relative aspect-[16/10] w-full rounded-lg overflow-hidden bg-surface-base border border-surface-border shadow-md">
              <img
                src={team.avatarUrl || team.posterUrl}
                alt={team.name}
                className="size-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

              {/* Live Vote Badge góc ảnh */}
              {liveVote !== undefined && (
                <div className="absolute bottom-2.5 left-2.5">
                  <span className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-brand-cyan bg-black/85 border border-brand-cyan/40 px-2 py-0.5 rounded-[3px] select-none backdrop-blur-sm shadow-[0_0_12px_rgba(0,212,255,0.2)]">
                    <span className="size-1.5 rounded-full bg-brand-cyan animate-pulse" />
                    <span>{liveVote.votes.toLocaleString()} vote</span>
                    {liveVote.rank > 0 && (
                      <span className="text-text-tertiary pl-1 border-l border-white/20">
                        #{liveVote.rank}
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* 2. Tên đội thi & Đơn vị (Trường Đại học) — Không có đoạn văn AI */}
            <div className="space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                {team.name}
              </h2>

              <div className="flex items-center gap-1.5 text-xs text-text-secondary font-mono">
                <GraduationCap className="size-4 text-brand-cyan shrink-0" />
                <span>{team.institution}</span>
              </div>
            </div>

            {/* 3. Danh sách Thành viên (Tên, vai trò, đơn vị) */}
            <div className="space-y-2 pt-1 border-t border-surface-border/60">
              <h3 className="text-xs uppercase tracking-wider text-text-tertiary font-semibold flex items-center gap-1.5 font-mono">
                <Users className="size-3.5 text-brand-cyan" />
                <span>Thành viên đội thi ({team.members.length})</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {team.members.map((member, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-[4px] bg-surface-raised border border-surface-border flex items-center gap-2.5"
                  >
                    <div className="size-8 rounded-[4px] bg-surface-elevated border border-brand-cyan/25 flex items-center justify-center font-mono font-bold text-xs text-brand-cyan shrink-0">
                      {member.name.split(' ').slice(-1)[0]?.charAt(0) || 'M'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-text-primary truncate">
                        {member.name}
                      </p>
                      <p className="text-[10px] text-brand-cyan font-mono truncate">
                        {member.role}
                      </p>
                      <p className="text-[10px] text-text-tertiary truncate">
                        {member.university}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Footer CTA: Nút chuyển hướng sang Eventista Vote ── */}
          {!team.votingDisabled && (
            <div className="p-4 border-t border-surface-border bg-surface-raised space-y-2 shrink-0">
              <a
                href={team.eventistaUrl || 'https://gendarena.1vote.vn/'}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full"
              >
                <button
                  type="button"
                  className="group/btn relative w-full py-3 px-4 rounded-[4px] bg-brand-cyan text-surface-base font-bold text-sm uppercase tracking-wide overflow-hidden transition-all duration-200 hover:bg-brand-cyanBright hover:shadow-[0_0_24px_rgba(0,212,255,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform ease-out pointer-events-none" />
                  <span className="relative z-10">Bình chọn cho {team.name} trên Eventista</span>
                  <ArrowUpRight className="relative z-10 size-4 transition-transform duration-200 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
                </button>
              </a>

              <div className="flex items-center justify-between text-[10px] text-text-tertiary font-mono pt-0.5">
                <span>1 tài khoản = 1 lượt vote miễn phí</span>
                <div className="flex items-center gap-1.5">
                  <span>Bảo trợ:</span>
                  <EventistaLogo className="h-3.5" withLink />
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
