'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]

export interface CountdownProps {
  targetDate?: string
  phaseTitle?: string
  phases?: any[]
  label?: string
  onUpdate?: (updated: { phaseId?: string; title: string; targetDate: string; label?: string }) => void
}

function AnimatedNumber({ value }: { value: number }) {
  const prefersReducedMotion = useReducedMotion()

  // Guard: undefined / NaN → show "00", never crash
  const safe = typeof value === 'number' && !Number.isNaN(value) ? value : 0
  const padded = String(safe).padStart(2, '0')

  if (prefersReducedMotion) {
    return (
      <span className="inline-block font-mono text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-brand-cyan leading-none select-none tabular-nums">
        {padded}
      </span>
    )
  }

  return (
    <div className="relative inline-block">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={padded}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.35, ease: EASE_OUT }}
          className="inline-block font-mono text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold text-brand-cyan leading-none select-none tabular-nums"
        >
          {padded}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

export default function Countdown({
  targetDate: initialTargetDate = '2026-11-08T13:00:00+07:00',
  phaseTitle: initialPhaseTitle = 'Vòng 3: Chung Kết',
  phases = [],
  label: initialLabel = 'Đếm ngược Vòng 3: Chung Kết',
  onUpdate,
}: CountdownProps) {
  const [targetDate, setTargetDate] = useState(initialTargetDate)
  const [phaseTitle, setPhaseTitle] = useState(initialPhaseTitle)
  const [label, setLabel] = useState(initialLabel)

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  })

  // Prevent hydration mismatch
  const [isMounted, setIsMounted] = useState(false)

  // Sync with prop changes if parent updates
  useEffect(() => {
    if (initialTargetDate) setTargetDate(initialTargetDate)
    if (initialPhaseTitle) setPhaseTitle(initialPhaseTitle)
    if (initialLabel) setLabel(initialLabel)
  }, [initialTargetDate, initialPhaseTitle, initialLabel])

  // Sync fresh config from persistent API on mount
  useEffect(() => {
    async function syncLatestCountdown() {
      try {
        const res = await fetch('/api/countdown')
        if (res.ok) {
          const data = await res.json()
          if (data.config?.targetDate) {
            setTargetDate(data.config.targetDate)
          }
          if (data.config?.phaseTitle) {
            setPhaseTitle(data.config.phaseTitle)
          }
          if (data.config?.label) {
            setLabel(data.config.label)
          }
        }
      } catch (err) {
        console.error('Error syncing countdown from API:', err)
      }
    }
    syncLatestCountdown()
  }, [])

  // Timer calculation
  useEffect(() => {
    setIsMounted(true)
    const targetTime = new Date(targetDate).getTime()

    const updateTimer = () => {
      const now = new Date().getTime()
      const difference = targetTime - now

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true })
        return
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24))
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((difference % (1000 * 60)) / 1000)

      setTimeLeft({ days, hours, minutes, seconds, isExpired: false })
    }

    updateTimer()
    const timerId = setInterval(updateTimer, 1000)

    return () => clearInterval(timerId)
  }, [targetDate])

  if (!isMounted) {
    return (
      <div className="w-full bg-surface-raised border border-surface-border rounded-xl p-4 sm:p-6 md:p-8 animate-pulse h-[150px] sm:h-[180px]" />
    )
  }

  return (
    <div className="w-full bg-surface-raised border border-surface-border rounded-xl p-4 sm:p-6 md:p-8 transition-colors duration-[250ms] relative group">
      {/* Header info */}
      <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6 pb-3 sm:pb-4 border-b border-surface-border">
        <div className="flex items-center gap-2 min-w-0">
          <span className="size-2 rounded-full bg-brand-cyan animate-pulse shrink-0" />
          <span className="text-[11px] sm:text-xs font-semibold text-text-tertiary uppercase tracking-wider font-display truncate">
            {phaseTitle}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] sm:text-xs font-medium text-text-tertiary">
            {label || 'Đếm ngược'}
          </span>
        </div>
      </div>

      {timeLeft.isExpired ? (
        <div className="text-center py-4 px-3 bg-surface-overlay border border-brand-cyan/20 rounded-lg space-y-2">
          <h3 className="font-display text-base sm:text-lg md:text-xl font-semibold text-brand-cyan">
            Vòng 3 đã chính thức bắt đầu!
          </h3>
          <p className="text-xs text-text-secondary">
            Theo dõi và cổ vũ cho các đội thi tại sự kiện Chung Kết.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1.5 sm:gap-3 md:gap-4 text-center">
          {[
            { value: timeLeft.days, label: 'Ngày' },
            { value: timeLeft.hours, label: 'Giờ' },
            { value: timeLeft.minutes, label: 'Phút' },
            { value: timeLeft.seconds, label: 'Giây' },
          ].map(({ value, label: itemLabel }) => (
            <div
              key={itemLabel}
              className="flex flex-col items-center justify-center p-2 sm:p-3 md:p-4 bg-surface-overlay border border-surface-border rounded-lg"
            >
              <AnimatedNumber value={value} />
              <span className="text-[10px] sm:text-[11px] md:text-xs font-medium text-text-tertiary uppercase tracking-wider mt-1.5 sm:mt-2 font-display">
                {itemLabel}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
