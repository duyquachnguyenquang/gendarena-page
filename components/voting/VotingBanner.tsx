'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  SlidersHorizontal,
  Info,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { VotingPhaseStatus } from '@/types/voting'
import EventistaLogo from './EventistaLogo'

interface VotingBannerProps {
  startDate: string
  endDate: string
  status: VotingPhaseStatus
  demoMode: 'AUTO' | 'UPCOMING' | 'ACTIVE' | 'ENDED'
  onDemoModeChange: (mode: 'AUTO' | 'UPCOMING' | 'ACTIVE' | 'ENDED') => void
  onOpenRules?: () => void
}

interface TimeLeft {
  days: number
  hours: number
  minutes: number
  seconds: number
}

function calculateTimeRemaining(targetTimeMs: number): TimeLeft {
  const now = Date.now()
  const diff = Math.max(0, targetTimeMs - now)
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

function CountdownDigit({ value, label }: { value: number; label: string }) {
  const padded = String(Math.max(0, value)).padStart(2, '0')
  return (
    <div className="flex flex-col items-center">
      <div className="min-w-[50px] sm:min-w-[62px] h-12 sm:h-14 px-2 bg-surface-overlay border border-surface-border rounded-md flex items-center justify-center">
        <span className="font-mono text-xl sm:text-2xl font-semibold text-brand-cyan select-none tabular-nums">
          {padded}
        </span>
      </div>
      <span className="mt-1 text-[11px] font-mono text-text-tertiary">
        {label}
      </span>
    </div>
  )
}

export default function VotingBanner({
  startDate,
  endDate,
  status,
  demoMode,
  onDemoModeChange,
  onOpenRules,
}: VotingBannerProps) {
  const [mounted, setMounted] = useState(false)
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  const targetDate = status === 'UPCOMING' ? startDate : endDate

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const targetMs = new Date(targetDate).getTime()
    setTimeLeft(calculateTimeRemaining(targetMs))

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeRemaining(targetMs))
    }, 1000)

    return () => clearInterval(timer)
  }, [targetDate, status])

  return (
    <div className="bg-surface-raised border border-surface-border rounded-lg p-5 sm:p-7 md:p-8 transition-colors">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 lg:gap-8">
        {/* Left Column: Heading & Context */}
        <div className="flex-1 space-y-3">
          {/* Status Badge */}
          <div className="flex items-center gap-2.5">
            {status === 'UPCOMING' && (
              <Badge variant="warning" size="md">
                <Clock className="size-3.5 mr-1" />
                <span>Sắp mở bình chọn</span>
              </Badge>
            )}
            {status === 'ACTIVE' && (
              <Badge variant="brand" size="md">
                <span className="size-1.5 rounded-full bg-brand-cyan animate-pulse mr-1" />
                <span>Đang mở bình chọn</span>
              </Badge>
            )}
            {status === 'ENDED' && (
              <Badge variant="default" size="md">
                <CheckCircle2 className="size-3.5 mr-1 text-semantic-success" />
                <span>Đã kết thúc</span>
              </Badge>
            )}

            <span className="text-xs font-mono text-text-tertiary">
              Vòng 3: Top 10 Bứt Phá
            </span>
          </div>

          {/* Heading */}
          <h1 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-text-primary leading-tight">
            Bình Chọn Đội Thi Được Yêu Thích Nhất
          </h1>

          {/* Subtitle with human student tone */}
          <p className="font-body text-xs sm:text-sm text-text-secondary max-w-2xl leading-relaxed">
            {status === 'UPCOMING' && (
              <>
                Cổng bình chọn sẽ chính thức mở vào lúc{' '}
                <strong className="text-text-primary">20:00 ngày 25/10/2026</strong>. Khán giả và bạn bè sinh viên
                có thể theo dõi video pitch, thả tim cổ vũ và khám phá câu chuyện của 10 đội thi ngay bên dưới!
              </>
            )}
            {status === 'ACTIVE' && (
              <>
                Thời gian bình chọn mở từ <strong>20:00 ngày 25/10</strong> đến{' '}
                <strong className="text-text-primary">23:59 ngày 02/11/2026</strong>. Mỗi lượt bình chọn của bạn qua{' '}
                <span className="text-brand-cyan font-medium">Eventista</span> là lời động viên ý nghĩa nhất tiếp sức cho các bạn trẻ bước vào Đêm Chung kết.
              </>
            )}
            {status === 'ENDED' && (
              <>
                Thời gian bình chọn đã khép lại vào lúc{' '}
                <strong className="text-text-primary">23:59 ngày 02/11/2026</strong>. Ban tổ chức và 10 đội thi xin gửi lời tri ân sâu sắc đến toàn thể cộng đồng sinh viên đã đồng hành và cổ vũ!
              </>
            )}
          </p>

          {/* Partner & Rules */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-text-tertiary pt-2 border-t border-surface-border">
            <div className="flex items-center gap-2">
              <span>Đồng hành bảo trợ cổng bình chọn:</span>
              <EventistaLogo className="h-4.5" withLink />
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-semantic-success" />
              <span>Xác thực công bằng 1 tài khoản = 1 vote</span>
            </div>
            {onOpenRules && (
              <button
                type="button"
                onClick={onOpenRules}
                className="inline-flex items-center gap-1 text-brand-cyan hover:underline transition-colors"
              >
                <Info className="size-3" />
                <span>Xem thể lệ bình chọn</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Clean Countdown Panel */}
        <div className="shrink-0 w-full lg:w-auto">
          {status !== 'ENDED' ? (
            <div className="bg-surface-overlay border border-surface-border rounded-lg p-4 sm:p-5 flex flex-col items-center">
              <span className="text-xs font-mono text-text-tertiary uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Clock className="size-3 text-brand-cyan" />
                <span>
                  {status === 'UPCOMING' ? 'Đếm ngược mở cổng' : 'Thời gian còn lại'}
                </span>
              </span>

              {mounted ? (
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <CountdownDigit value={timeLeft.days} label="Ngày" />
                  <span className="font-mono text-lg text-text-tertiary -mt-4">:</span>
                  <CountdownDigit value={timeLeft.hours} label="Giờ" />
                  <span className="font-mono text-lg text-text-tertiary -mt-4">:</span>
                  <CountdownDigit value={timeLeft.minutes} label="Phút" />
                  <span className="font-mono text-lg text-text-tertiary -mt-4">:</span>
                  <CountdownDigit value={timeLeft.seconds} label="Giây" />
                </div>
              ) : (
                <div className="h-12 w-56 bg-surface-raised rounded animate-pulse" />
              )}

              <span className="mt-2.5 text-[11px] text-text-tertiary flex items-center gap-1">
                <Calendar className="size-3" />
                <span>
                  {status === 'UPCOMING'
                    ? 'Mở cổng: 20:00 25/10/2026'
                    : 'Đóng cổng: 23:59 02/11/2026'}
                </span>
              </span>
            </div>
          ) : (
            <div className="bg-surface-overlay border border-surface-border rounded-lg p-5 text-center max-w-xs">
              <CheckCircle2 className="size-6 text-semantic-success mx-auto mb-2" />
              <h4 className="font-display font-semibold text-sm text-text-primary">
                Cổng bình chọn đã đóng
              </h4>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Kết quả giải thưởng sẽ được công bố trực tiếp tại Đêm Chung kết GenD Arena 2026.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── State Switcher for Evaluators (Clean & Non-Intrusive) ─── */}
      <div className="mt-5 pt-3.5 border-t border-surface-border/70 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
        <span className="text-text-tertiary flex items-center gap-1.5 font-mono">
          <SlidersHorizontal className="size-3 text-brand-cyan" />
          <span>Mô phỏng trạng thái bình chọn:</span>
        </span>
        <div className="flex items-center gap-1 bg-surface-overlay p-1 rounded-md border border-surface-border">
          <button
            type="button"
            onClick={() => onDemoModeChange('AUTO')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              demoMode === 'AUTO'
                ? 'bg-brand-navy text-brand-cyan border border-brand-cyan/40'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Thời gian thực
          </button>
          <button
            type="button"
            onClick={() => onDemoModeChange('UPCOMING')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              demoMode === 'UPCOMING'
                ? 'bg-brand-navy text-semantic-warning border border-semantic-warning/40'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Sắp diễn ra
          </button>
          <button
            type="button"
            onClick={() => onDemoModeChange('ACTIVE')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              demoMode === 'ACTIVE'
                ? 'bg-brand-navy text-semantic-success border border-semantic-success/40'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Đang mở vote
          </button>
          <button
            type="button"
            onClick={() => onDemoModeChange('ENDED')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              demoMode === 'ENDED'
                ? 'bg-brand-navy text-text-primary border border-surface-borderStrong'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Đã kết thúc
          </button>
        </div>
      </div>
    </div>
  )
}
