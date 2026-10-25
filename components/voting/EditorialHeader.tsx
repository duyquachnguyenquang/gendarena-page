'use client'

import React from 'react'
import { HelpCircle, BookOpen } from 'lucide-react'
import { VotingPhaseStatus } from '@/types/voting'

interface EditorialHeaderProps {
  status: VotingPhaseStatus
  onOpenRules: () => void
  onOpenGuide: () => void
}

export default function EditorialHeader({
  status,
  onOpenRules,
  onOpenGuide,
}: EditorialHeaderProps) {
  const statusColor =
    status === 'ACTIVE'
      ? 'bg-semantic-success'
      : status === 'UPCOMING'
        ? 'bg-semantic-warning'
        : 'bg-text-disabled'

  return (
    <header className="pt-8 pb-8 border-b border-surface-border">
      <div className="flex flex-row items-center justify-between gap-4">
        {/* Left: Status dot + Title — pure brutalist, zero clutter */}
        <div className="flex items-center gap-2.5">
          <span
            className={`shrink-0 size-2 rounded-full ${statusColor} ${
              status === 'ACTIVE' ? 'animate-pulse' : ''
            }`}
          />
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary uppercase">
            Bình Chọn Vòng 3
          </h1>
        </div>

        {/* Right: Quick actions: Hướng dẫn & Thể lệ */}
        <div className="flex items-center gap-2">
          {/* Hướng dẫn trigger */}
          <button
            type="button"
            onClick={onOpenGuide}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium bg-surface-raised border border-surface-border text-text-secondary hover:text-text-primary hover:border-brand-cyan/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 cursor-pointer"
            title="Xem hướng dẫn các bước bình chọn trên Eventista"
          >
            <BookOpen className="size-3.5 text-brand-cyan" />
            <span>Hướng dẫn</span>
          </button>

          {/* Thể lệ trigger */}
          <button
            type="button"
            onClick={onOpenRules}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium bg-surface-raised border border-surface-border text-text-secondary hover:text-text-primary hover:border-surface-borderStrong hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150 cursor-pointer"
            title="Xem thể lệ và quy chế bình chọn"
          >
            <HelpCircle className="size-3.5 text-text-tertiary" />
            <span>Thể lệ</span>
          </button>
        </div>
      </div>
    </header>
  )
}
