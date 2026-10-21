'use client'

import React from 'react'
import { HelpCircle, SlidersHorizontal } from 'lucide-react'
import { VotingPhaseStatus } from '@/types/voting'

interface EditorialHeaderProps {
  status: VotingPhaseStatus
  demoMode: 'AUTO' | 'UPCOMING' | 'ACTIVE' | 'ENDED'
  onDemoModeChange: (mode: 'AUTO' | 'UPCOMING' | 'ACTIVE' | 'ENDED') => void
  onOpenRules: () => void
}

export default function EditorialHeader({
  status,
  demoMode,
  onDemoModeChange,
  onOpenRules,
}: EditorialHeaderProps) {
  const statusColor =
    status === 'ACTIVE'
      ? 'bg-semantic-success'
      : status === 'UPCOMING'
        ? 'bg-semantic-warning'
        : 'bg-text-disabled'

  return (
    <header className="pt-8 pb-8 border-b border-surface-border">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        {/* Left: Title + date — zero prose */}
        <div className="space-y-1.5">
          {/* Status dot + title on same line */}
          <div className="flex items-center gap-2.5">
            <span className={`shrink-0 size-2 rounded-full ${statusColor} ${status === 'ACTIVE' ? 'animate-pulse' : ''}`} />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary uppercase">
              Bình Chọn Vòng 3
            </h1>
          </div>

          {/* One line: date only, small, monospaced */}
          <p className="text-xs text-text-tertiary font-mono ml-[18px]">
            20:00 25.10 — 23:59 02.11.2026 &nbsp;·&nbsp; Top 10 Đội Thi
          </p>
        </div>

        {/* Right: compact controls */}
        <div className="flex items-center gap-2 ml-[18px] sm:ml-0">
          {/* Rules trigger */}
          <button
            type="button"
            onClick={onOpenRules}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[4px] text-xs bg-surface-raised border border-surface-border text-text-tertiary hover:text-text-primary hover:border-surface-borderStrong transition-colors"
            title="Xem thể lệ và quy chế bình chọn"
          >
            <HelpCircle className="size-3" />
            <span>Thể lệ</span>
          </button>

          {/* Demo state switcher */}
          <div className="inline-flex items-center gap-0.5 p-0.5 rounded-[4px] bg-surface-raised border border-surface-border text-[11px] text-text-tertiary">
            <span className="px-1.5 flex items-center">
              <SlidersHorizontal className="size-3" />
            </span>
            {(['AUTO', 'UPCOMING', 'ACTIVE', 'ENDED'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onDemoModeChange(mode)}
                className={`px-2 py-1 rounded-[3px] transition-colors ${
                  demoMode === mode
                    ? 'bg-surface-elevated text-text-primary font-semibold'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                {mode === 'AUTO' ? 'Auto' : mode === 'UPCOMING' ? 'Sắp' : mode === 'ACTIVE' ? 'Mở' : 'Đóng'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  )
}
