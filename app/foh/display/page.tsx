'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FOHState,
  FOHMessage,
  INITIAL_FOH_STATE,
  FOH_STORAGE_KEY,
  FOH_DISPLAY_SNAPSHOT_KEY,
  FOH_CHANNEL_NAME,
  MAX_STAGE_SCORE,
  MAX_TOTAL_SCORE,
  playFOHSound,
  syncTeamRanks,
} from '@/lib/foh-sync'
import {
  Trophy,
  Medal,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Maximize2,
  Layers,
  Vote,
  Timer,
  Clock,
  AlertTriangle,
  Play,
  Pause,
  Sparkles,
  Dices,
} from 'lucide-react'
import { formatTimerSeconds } from '@/lib/foh-sync'

function StageRankBadge({ rank, hasScore }: { rank: number; hasScore: boolean }) {
  if (rank === 1 && hasScore) {
    return (
      <div className="w-20 lg:w-24 py-2 rounded-lg bg-yellow-500/15 border border-yellow-400/60 flex flex-col items-center justify-center shrink-0 shadow-[0_0_12px_rgba(234,179,8,0.2)]">
        <Trophy className="size-5 lg:size-6 text-yellow-400" />
        <span className="text-[11px] lg:text-xs font-bold text-yellow-400 mt-0.5 tracking-wide">HẠNG 1</span>
      </div>
    )
  }
  if (rank === 2 && hasScore) {
    return (
      <div className="w-20 lg:w-24 py-2 rounded-lg bg-slate-400/15 border border-slate-300/50 flex flex-col items-center justify-center shrink-0 shadow-[0_0_10px_rgba(203,213,225,0.15)]">
        <Medal className="size-5 lg:size-6 text-slate-300" />
        <span className="text-[11px] lg:text-xs font-bold text-slate-200 mt-0.5 tracking-wide">HẠNG 2</span>
      </div>
    )
  }
  if (rank === 3 && hasScore) {
    return (
      <div className="w-20 lg:w-24 py-2 rounded-lg bg-amber-500/15 border border-amber-500/50 flex flex-col items-center justify-center shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.15)]">
        <Medal className="size-5 lg:size-6 text-amber-500" />
        <span className="text-[11px] lg:text-xs font-bold text-amber-400 mt-0.5 tracking-wide">HẠNG 3</span>
      </div>
    )
  }
  return (
    <div className="w-20 lg:w-24 py-2 rounded-lg bg-[#0E172A]/70 border border-surface-border flex flex-col items-center justify-center shrink-0">
      <span className="text-lg lg:text-xl font-bold text-text-secondary tabular-nums">#{rank}</span>
      <span className="text-[10px] text-text-tertiary uppercase font-semibold">HẠNG</span>
    </div>
  )
}

function scoreColor(rank: number, hasScore: boolean) {
  if (!hasScore) return 'var(--color-text-primary)'
  if (rank === 1) return '#eab308'
  if (rank === 2) return '#cbd5e1'
  if (rank === 3) return '#f59e0b'
  return 'var(--color-brand-cyan)'
}

function barGradient(rank: number, hasScore: boolean) {
  if (!hasScore) return 'linear-gradient(90deg, #1E2A44, #2A3B5C)'
  if (rank === 1) return 'linear-gradient(90deg, #eab308, #fde68a)'
  if (rank === 2) return 'linear-gradient(90deg, #94a3b8, #e2e8f0)'
  if (rank === 3) return 'linear-gradient(90deg, #d97706, #fcd34d)'
  return 'linear-gradient(90deg, #00D4FF, #112E81)'
}

function FireworksOverlay({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (!active || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let rafId: number
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    interface Particle {
      x: number
      y: number
      vx: number
      vy: number
      alpha: number
      color: string
      size: number
    }

    const particles: Particle[] = []
    const palette = ['#00D4FF', '#33E0FF', '#EAB308', '#7C5CFF', '#22D07A', '#F0F4FA']

    const spawnBurst = (x: number, y: number) => {
      for (let i = 0; i < 80; i++) {
        const angle = (Math.PI * 2 * i) / 80 + (Math.random() - 0.5) * 0.25
        const speed = 2.5 + Math.random() * 8.5
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1,
          color: palette[Math.floor(Math.random() * palette.length)],
          size: 2 + Math.random() * 3.5,
        })
      }
    }

    spawnBurst(canvas.width * 0.5, canvas.height * 0.35)
    const interval = setInterval(() => {
      spawnBurst(
        canvas.width * (0.15 + Math.random() * 0.7),
        canvas.height * (0.15 + Math.random() * 0.5)
      )
    }, 320)

    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx
        p.y += p.vy
        p.vy += 0.08
        p.alpha -= 0.014
        if (p.alpha <= 0) {
          particles.splice(i, 1)
          continue
        }
        ctx.save()
        ctx.globalAlpha = Math.max(0, p.alpha)
        ctx.fillStyle = p.color
        ctx.shadowBlur = 12
        ctx.shadowColor = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
      rafId = requestAnimationFrame(tick)
    }

    tick()
    return () => {
      clearInterval(interval)
      cancelAnimationFrame(rafId)
    }
  }, [active])

  if (!active) return null
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />
}

function Stage3MemberPickerView({ state }: { state: FOHState }) {
  const picker = state.stage3Picker
  const activeTeam =
    state.teams.find((t) => t.id === picker?.teamId) || state.teams[0]
  const members = activeTeam?.members || []
  const [fakeIndex, setFakeIndex] = useState(0)

  // Carousel fast spinning animation when isRolling is true
  useEffect(() => {
    if (!picker?.isRolling || members.length <= 1) return
    const interval = setInterval(() => {
      setFakeIndex((prev) => (prev + 1) % members.length)
    }, 110)
    return () => clearInterval(interval)
  }, [picker?.isRolling, members.length])

  const displayedMember = picker?.chosenMemberName
    ? {
        name: picker.chosenMemberName,
        role: picker.chosenMemberRole || 'Thành viên',
        institution: picker.chosenMemberInstitution || activeTeam.institution,
      }
    : picker?.isRolling && members.length > 0
    ? members[fakeIndex]
    : null

  return (
    <motion.div
      key="stage3-picker"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25 }}
      className="relative z-20 my-auto max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start py-2"
    >
      {/* Left Spotlight: Full-Size Team Photo & Complete Member Roster */}
      <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-left space-y-3">
        {/* Full-size 3:2 landscape team photo showing ALL 5 members */}
        <div className="relative w-full aspect-[3/2] rounded-2xl overflow-hidden border border-brand-cyan/40 bg-black/70 shadow-2xl">
          <Image
            src={activeTeam?.posterUrl || '/images/teams/aqua-radar.webp'}
            alt={activeTeam?.name || 'Đội thi'}
            fill
            sizes="(max-width: 1024px) 100vw, 640px"
            className="object-contain object-center"
            priority
          />
          <div className="absolute top-3 left-3 px-3 py-1 rounded bg-black/80 backdrop-blur-md border border-brand-cyan/60 text-xs font-bold text-brand-cyan tabular-nums">
            MSBC #{activeTeam?.msbc}
          </div>
          <div className="absolute bottom-3 left-3 right-3 px-3 py-1.5 rounded-lg bg-black/85 backdrop-blur-md border border-white/10 text-xs text-text-secondary truncate font-medium">
            {activeTeam?.institution}
          </div>
        </div>

        {/* Team Identity */}
        <div className="w-full">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-wide">
              {activeTeam?.name}
            </h2>
            <span className="text-xs font-semibold text-brand-cyan px-2 py-0.5 rounded bg-brand-cyan/10 border border-brand-cyan/30">
              Chặng 3 • Huy Động Vốn
            </span>
          </div>

          {activeTeam?.slogan && (
            <p className="mt-1 text-xs italic text-text-tertiary truncate">
              &ldquo;{activeTeam?.slogan}&rdquo;
            </p>
          )}
        </div>

        {/* Complete Member List (Ensuring NO member is left out) */}
        <div className="w-full space-y-2 pt-1">
          <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-bold flex items-center justify-between">
            <span>Đội hình thành viên ({members.length})</span>
            <span className="text-brand-cyan">{activeTeam?.institution}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {members.map((m) => {
              const isChosen = picker?.chosenMemberName === m.name
              const isSpinningThis = picker?.isRolling && displayedMember?.name === m.name
              return (
                <div
                  key={m.id}
                  className={`px-3 py-2 rounded-lg border transition-all ${
                    isChosen
                      ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300 shadow-[0_0_12px_rgba(234,179,8,0.3)]'
                      : isSpinningThis
                      ? 'bg-brand-cyan/20 border-brand-cyan text-brand-cyan animate-pulse'
                      : 'bg-[#0A1120]/80 border-surface-border text-text-secondary'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold truncate text-text-primary">
                      {m.name}
                    </span>
                    {m.role === 'leader' ? (
                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                        Trưởng nhóm
                      </span>
                    ) : (
                      <span className="text-[9px] text-text-tertiary">Thành viên</span>
                    )}
                  </div>
                  {m.faculty && (
                    <div className="text-[10px] text-text-tertiary truncate mt-0.5">{m.faculty}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Right Spotlight: The Roulette Result & Stage Call */}
      <div className="lg:col-span-6 flex flex-col items-center justify-center p-8 lg:p-10 rounded-2xl bg-[#0A1120]/95 border border-surface-border/90 shadow-2xl relative min-h-[460px]">
        {/* Subtle ambient light */}
        <div
          className={`absolute inset-0 pointer-events-none opacity-15 transition-colors duration-500 blur-2xl ${
            picker?.chosenMemberName ? 'bg-yellow-400' : 'bg-brand-cyan'
          }`}
        />

        <div className="relative z-10 w-full flex flex-col items-center justify-center text-center space-y-6">
          {picker?.chosenMemberName ? (
            /* WINNER SPOTLIGHT */
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="flex flex-col items-center space-y-4 w-full"
            >
              <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-yellow-500/20 border border-yellow-400/60 text-yellow-400 text-xs font-bold uppercase tracking-wider">
                <Trophy className="size-4 text-yellow-400" />
                <span>Thành Viên Đại Diện Thuyết Trình</span>
              </div>

              <div className="py-2">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-wide">
                  {picker.chosenMemberName}
                </h1>
                <div className="mt-2 text-sm text-brand-cyan font-medium">
                  {picker.chosenMemberRole} • {picker.chosenMemberInstitution || activeTeam.institution}
                </div>
              </div>

              {/* Timeline Rule Box */}
              <div className="w-full max-w-md p-4 rounded-xl bg-surface-base border border-surface-border space-y-2 text-left">
                <div className="text-xs uppercase font-bold text-text-tertiary">
                  Quy định phần thi Chặng 3:
                </div>
                <div className="flex items-center justify-between text-xs border-t border-surface-border/60 pt-2">
                  <span className="text-text-secondary">Thời gian chuẩn bị sân khấu:</span>
                  <span className="font-bold tabular-nums text-brand-cyan">01 phút</span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-surface-border/60 pt-2">
                  <span className="text-text-secondary">Thời gian thuyết trình Pitching:</span>
                  <span className="font-bold tabular-nums text-yellow-400">05 phút</span>
                </div>
                <div className="flex items-center justify-between text-xs border-t border-surface-border/60 pt-2">
                  <span className="text-text-secondary">Vấn đáp Ban Giám Khảo:</span>
                  <span className="font-bold tabular-nums text-text-primary">05 phút</span>
                </div>
              </div>
            </motion.div>
          ) : picker?.isRolling ? (
            /* SPINNING STATE */
            <div className="flex flex-col items-center space-y-5 w-full">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-cyan/20 border border-brand-cyan text-brand-cyan text-xs font-bold uppercase tracking-wider animate-pulse">
                <span>Hệ Thống Đang Quay Chọn Ngẫu Nhiên</span>
              </div>

              <div className="w-full max-w-md px-6 py-8 rounded-2xl bg-surface-base border-2 border-brand-cyan/80 shadow-[0_0_30px_rgba(0,212,255,0.25)]">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-wide">
                  {displayedMember?.name || 'Đang chọn...'}
                </div>
                <div className="mt-2 text-xs text-brand-cyan font-medium">
                  {displayedMember?.institution || activeTeam.institution}
                </div>
              </div>

              <p className="text-xs text-text-tertiary">
                Vòng quay ngẫu nhiên các thành viên hợp lệ của đội {activeTeam?.name}...
              </p>
            </div>
          ) : (
            /* READY / IDLE STATE */
            <div className="flex flex-col items-center space-y-4 w-full">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface-base border border-surface-border text-brand-cyan text-xs font-bold uppercase tracking-wider">
                <Dices className="size-4" />
                <span>Bốc Thăm Thành Viên Vòng 3</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold text-white">
                Sẵn Sàng Bốc Thăm Đại Diện
              </h3>

              <p className="text-xs text-text-tertiary max-w-md mx-auto leading-relaxed">
                Ban Giám Khảo &amp; Ban Tổ Chức sẽ chọn ngẫu nhiên 01 trong 05 thành viên của đội {activeTeam?.name} để thực hiện bài báo cáo kế hoạch huy động vốn.
              </p>

              <div className="w-full max-w-md p-4 rounded-xl bg-surface-base border border-surface-border text-xs text-text-secondary text-left space-y-1.5">
                <div className="font-bold text-text-primary">Quy định thời gian Chặng 3:</div>
                <div>• Chuẩn bị: <span className="text-brand-cyan font-bold tabular-nums">01 phút</span></div>
                <div>• Thuyết trình: <span className="text-yellow-400 font-bold tabular-nums">05 phút</span></div>
                <div>• Vấn đáp BGK: <span className="text-text-primary font-bold tabular-nums">05 phút</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function FOHDisplayPage() {
  const [state, setState] = useState<FOHState>(INITIAL_FOH_STATE)
  const [fireworks, setFireworks] = useState(false)
  const [timerSeconds, setTimerSeconds] = useState(
    state.timer?.remainingSeconds ?? 300
  )
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const lastSfxSecRef = useRef<number | null>(null)

  const launchFireworks = useCallback((soundEnabled = true) => {
    setFireworks(true)
    playFOHSound('celebrate', soundEnabled)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setFireworks(false), 5500)
  }, [])

  // Synchronized Drift-Free Countdown Timer Loop
  useEffect(() => {
    const timer = state.timer
    if (!timer) return

    if (timer.mode !== 'RUNNING' || !timer.targetTimestamp) {
      setTimerSeconds(timer.remainingSeconds)
      lastSfxSecRef.current = null
      return
    }

    const checkTick = () => {
      const rem = Math.max(0, Math.ceil((timer.targetTimestamp! - Date.now()) / 1000))
      setTimerSeconds(rem)

      if (state.soundEnabled && timer.soundEnabled) {
        if (rem === 60 && lastSfxSecRef.current !== 60) {
          lastSfxSecRef.current = 60
          playFOHSound('timer_warning', true)
        } else if (rem === 30 && lastSfxSecRef.current !== 30) {
          lastSfxSecRef.current = 30
          playFOHSound('timer_warning', true)
        } else if (rem <= 5 && rem >= 1 && lastSfxSecRef.current !== rem) {
          lastSfxSecRef.current = rem
          playFOHSound('timer_countdown', true)
        } else if (rem === 0 && lastSfxSecRef.current !== 0) {
          lastSfxSecRef.current = 0
          playFOHSound('times_up', true)
        }
      }
    }

    checkTick()
    const interval = setInterval(checkTick, 200)
    return () => clearInterval(interval)
  }, [state.timer, state.soundEnabled])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const saved =
      localStorage.getItem(FOH_DISPLAY_SNAPSHOT_KEY) || localStorage.getItem(FOH_STORAGE_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as FOHState
        const view = parsed.displayView || 'STAGES'
        setState({
          ...INITIAL_FOH_STATE,
          ...parsed,
          displayView: view,
          stageNames: parsed.stageNames || INITIAL_FOH_STATE.stageNames,
          timer: parsed.timer || INITIAL_FOH_STATE.timer,
          stage3Picker: parsed.stage3Picker || INITIAL_FOH_STATE.stage3Picker,
          teams: syncTeamRanks(parsed.teams, true, view),
        })
      } catch {
        // ignore
      }
    }

    let bc: BroadcastChannel | null = null
    if ('BroadcastChannel' in window) {
      bc = new BroadcastChannel(FOH_CHANNEL_NAME)
      bc.postMessage({ type: 'PONG', timestamp: Date.now() })

      bc.onmessage = (e: MessageEvent<FOHMessage>) => {
        const msg = e.data
        if (msg.type === 'PING') {
          bc?.postMessage({ type: 'PONG', timestamp: Date.now() })
        } else if (msg.type === 'STATE_UPDATE') {
          const view = msg.state.displayView || 'STAGES'
          setState({
            ...INITIAL_FOH_STATE,
            ...msg.state,
            displayView: view,
            stageNames: msg.state.stageNames || INITIAL_FOH_STATE.stageNames,
            timer: msg.state.timer || INITIAL_FOH_STATE.timer,
            stage3Picker: msg.state.stage3Picker || INITIAL_FOH_STATE.stage3Picker,
            teams: syncTeamRanks(msg.state.teams, true, view),
          })
          if (msg.sfx) playFOHSound(msg.sfx, msg.state.soundEnabled)
        } else if (msg.type === 'TRIGGER_FIREWORKS') {
          setState((curr) => {
            launchFireworks(curr.soundEnabled)
            return curr
          })
        }
      }
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === FOH_DISPLAY_SNAPSHOT_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as FOHState
          const view = parsed.displayView || 'STAGES'
          setState({
            ...INITIAL_FOH_STATE,
            ...parsed,
            displayView: view,
            stageNames: parsed.stageNames || INITIAL_FOH_STATE.stageNames,
            timer: parsed.timer || INITIAL_FOH_STATE.timer,
            stage3Picker: parsed.stage3Picker || INITIAL_FOH_STATE.stage3Picker,
            teams: syncTeamRanks(parsed.teams, true, view),
          })
        } catch {
          // ignore
        }
      } else if (e.key === `${FOH_STORAGE_KEY}_FX`) {
        launchFireworks(true)
      }
    }

    window.addEventListener('storage', onStorage)
    return () => {
      bc?.close()
      window.removeEventListener('storage', onStorage)
    }
  }, [launchFireworks])

  const isTimerView = state.displayView === 'TIMER'
  const isBoothView = state.displayView === 'BOOTH_VOTING'
  const isStage3PickerView = state.displayView === 'STAGE3_PICKER'

  const activeTimerTeam =
    state.teams.find((t) => t.id === state.timer?.activeTeamId) || state.teams[0]
  const activeStage3Team =
    state.teams.find((t) => t.id === state.stage3Picker?.teamId) || state.teams[0]

  const rankedTeams = syncTeamRanks(state.teams, true, state.displayView)
  const totalBoothVotes = rankedTeams.reduce((acc, t) => acc + (t.boothVotes || 0), 0)
  const maxBoothVotes = Math.max(1, rankedTeams[0]?.boothVotes || 1)

  const activeStageLabel =
    state.activeStage === 'ALL'
      ? `TỔNG KẾT 3 CHẶNG • TỐI ĐA ${MAX_TOTAL_SCORE} ĐIỂM`
      : state.activeStage === 1
      ? `${state.stageNames.s1.toUpperCase()} • TỐI ĐA ${MAX_STAGE_SCORE} ĐIỂM`
      : state.activeStage === 2
      ? `${state.stageNames.s2.toUpperCase()} • TỐI ĐA ${MAX_STAGE_SCORE} ĐIỂM`
      : `${state.stageNames.s3.toUpperCase()} • TỐI ĐA ${MAX_STAGE_SCORE} ĐIỂM`

  // Timer calculations for display
  const timerTotal = state.timer?.totalSeconds || 300
  const timerRemaining = timerSeconds
  const timerProgressPct =
    timerTotal > 0
      ? Math.max(0, Math.min(100, (timerRemaining / timerTotal) * 100))
      : 0
  const isTimerUrgent = timerRemaining <= 30 && timerRemaining > 0
  const isTimerWarning = timerRemaining <= 60 && timerRemaining > 30
  const isTimerFinished = timerRemaining === 0

  const timerColor = isTimerFinished
    ? '#EF4444'
    : isTimerUrgent
    ? '#EF4444'
    : isTimerWarning
    ? '#F59E0B'
    : '#00D4FF'

  return (
    <div
      onDoubleClick={() => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {})
        } else {
          document.exitFullscreen().catch(() => {})
        }
      }}
      className="relative min-h-screen w-full bg-[#050814] text-text-primary overflow-hidden select-none flex flex-col justify-between px-6 py-5 md:px-12 md:py-6 bg-cover bg-center bg-no-repeat font-sans"
      style={{
        backgroundImage: `linear-gradient(to bottom, rgba(5, 8, 20, 0.5) 0%, rgba(5, 8, 20, 0.72) 45%, rgba(5, 8, 20, 0.88) 100%), url('/images/foh-bg.jpg')`,
      }}
    >
      <FireworksOverlay active={fireworks} />

      {/* Stage Header - Chỉ hiện tiêu đề sạch, không hiện bất kỳ ô box dư thừa nào xung quanh */}
      <header className="relative z-10 flex flex-col items-center text-center shrink-0 py-2">
        <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
          {isTimerView
            ? (state.timer?.roundLabel || 'Đồng Hồ Thi Đấu Trực Tiếp').replace(/\s*\(\d+\s*phút\)/gi, '').trim()
            : isStage3PickerView
            ? 'Bốc Thăm Thành Viên Thuyết Trình Vòng 3'
            : isBoothView
            ? state.boothTitle
            : state.title}
        </h1>
      </header>

      {/* Stage Body: Curtain, Fullscreen Stage Timer, Stage 3 Member Picker, or Live Leaderboard */}
      <AnimatePresence mode="wait">
        {state.isHidden ? (
          <motion.div
            key="curtain"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35 }}
            className="relative z-20 my-auto max-w-4xl mx-auto w-full flex flex-col items-center justify-center py-20 px-10 rounded-2xl border border-surface-border bg-[#0A1120]/90 backdrop-blur-xl shadow-2xl"
          >
            <div className="size-16 rounded-full border-2 border-t-brand-cyan border-r-accent-violet border-b-brand-navy-light border-l-transparent animate-spin mb-6" />
            <h2 className="text-2xl md:text-4xl font-bold text-center text-text-primary">
              {state.hiddenMessage}
            </h2>
            <p className="mt-3 text-sm text-text-secondary uppercase tracking-wider font-medium">
              Hệ thống đang khóa hiển thị bảng điểm tạm thời
            </p>
          </motion.div>
        ) : isStage3PickerView ? (
          <Stage3MemberPickerView key="stage3-picker" state={state} />
        ) : isTimerView ? (
          <motion.div
            key="fullscreen-timer"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="relative z-20 my-auto max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-2"
          >
            {/* Left Spotlight: Full-size 3:2 Team Photo & All 5 Members */}
            <div className="lg:col-span-6 flex flex-col items-center lg:items-start text-left space-y-3">
              <div className="relative w-full aspect-[3/2] rounded-2xl overflow-hidden border border-brand-cyan/40 bg-black/70 shadow-2xl">
                <Image
                  src={activeTimerTeam?.posterUrl || '/images/teams/aqua-radar.webp'}
                  alt={activeTimerTeam?.name || 'Đội thi'}
                  fill
                  sizes="(max-width: 1024px) 100vw, 640px"
                  className="object-contain object-center"
                  priority
                />
                <div className="absolute top-3 left-3 px-3 py-1 rounded bg-black/80 backdrop-blur-md border border-brand-cyan/60 text-xs font-bold text-brand-cyan tabular-nums">
                  MSBC #{activeTimerTeam?.msbc}
                </div>
                <div className="absolute bottom-3 left-3 right-3 px-3 py-1.5 rounded-lg bg-black/85 backdrop-blur-md border border-white/10 text-xs text-text-secondary truncate font-medium">
                  {activeTimerTeam?.institution}
                </div>
              </div>

              <div className="w-full">
                <h2 className="text-2xl lg:text-3xl font-bold text-white tracking-wide">
                  {activeTimerTeam?.name}
                </h2>
                {activeTimerTeam?.slogan && (
                  <p className="mt-1 text-xs italic text-text-tertiary truncate">
                    &ldquo;{activeTimerTeam?.slogan}&rdquo;
                  </p>
                )}
              </div>

              {/* Complete Member List (Ensuring no member is hidden) */}
              <div className="w-full space-y-2 pt-1">
                <div className="text-[11px] uppercase tracking-wider text-text-tertiary font-bold">
                  Thành viên đội ({activeTimerTeam?.members?.length || 5})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(activeTimerTeam?.members || []).map((m) => (
                    <div
                      key={m.id}
                      className="px-3 py-1.5 rounded-lg bg-[#0A1120]/80 border border-surface-border flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-text-primary truncate">{m.name}</span>
                      {m.role === 'leader' ? (
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
                          Trưởng nhóm
                        </span>
                      ) : (
                        <span className="text-[9px] text-text-tertiary">Thành viên</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Spotlight: Circular Broadcast Countdown Clock (No horizontal bar) */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center p-6 sm:p-8 lg:p-10 rounded-2xl bg-[#0A1120]/95 border border-surface-border shadow-2xl relative overflow-hidden min-h-[460px]">
              {/* Circular Timer Visual */}
              <div className="relative size-72 sm:size-80 lg:size-96 flex items-center justify-center">
                {/* Outer Ambient Glow */}
                <div
                  className="absolute inset-0 rounded-full blur-3xl opacity-25 pointer-events-none transition-colors duration-500"
                  style={{ background: timerColor }}
                />

                {/* Rotating Outer Dashed Orbit Ring */}
                <div
                  className={`absolute -inset-3 rounded-full border border-dashed pointer-events-none transition-opacity duration-300 ${
                    state.timer?.mode === 'RUNNING'
                      ? 'border-brand-cyan/35 animate-[spin_35s_linear_infinite]'
                      : 'border-white/10 opacity-30'
                  }`}
                />

                {/* SVG Progress Circle */}
                <svg
                  className="size-full -rotate-90 origin-center"
                  viewBox="0 0 280 280"
                >
                  {/* Subtle Track */}
                  <circle
                    cx="140"
                    cy="140"
                    r={120}
                    stroke="rgba(255, 255, 255, 0.07)"
                    strokeWidth="10"
                    fill="none"
                  />
                  {/* Animated Countdown Ring */}
                  <circle
                    cx="140"
                    cy="140"
                    r={120}
                    stroke={timerColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    fill="none"
                    strokeDasharray={2 * Math.PI * 120}
                    strokeDashoffset={
                      (2 * Math.PI * 120) * (1 - timerProgressPct / 100)
                    }
                    className="transition-all duration-1000 ease-linear"
                    style={{
                      filter: `drop-shadow(0 0 16px ${timerColor}99)`,
                    }}
                  />
                </svg>

                {/* Centered Countdown Digits & Status Badge */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-10">
                  <div
                    className={`font-extrabold tabular-nums leading-none select-none transition-colors duration-200 text-6xl sm:text-7xl lg:text-8xl tracking-tight ${
                      isTimerUrgent ? 'animate-pulse' : ''
                    }`}
                    style={{
                      color: timerColor,
                      textShadow: `0 0 40px ${timerColor}60`,
                    }}
                  >
                    {formatTimerSeconds(timerRemaining)}
                  </div>

                  <div className="mt-5 flex items-center justify-center">
                    {state.timer?.mode === 'RUNNING' && timerRemaining > 0 && (
                      <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs sm:text-sm font-bold tracking-wide">
                        <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>ĐANG TÍNH GIỜ</span>
                      </span>
                    )}
                    {state.timer?.mode === 'PAUSED' && (
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs sm:text-sm font-bold tracking-wide">
                        <Pause className="size-3.5" />
                        <span>TẠM DỪNG</span>
                      </span>
                    )}
                    {isTimerFinished && (
                      <span className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-red-500/20 border border-red-500 text-red-400 text-sm font-bold tracking-wide animate-bounce">
                        <AlertTriangle className="size-4" />
                        <span>HẾT GIỜ THI ĐẤU</span>
                      </span>
                    )}
                    {state.timer?.mode === 'STOPPED' && timerRemaining > 0 && (
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-surface-base border border-surface-border text-text-tertiary text-xs sm:text-sm font-bold tracking-wide">
                        <span>CHỜ BẮT ĐẦU</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.main
            key={state.displayView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 my-auto max-w-6xl w-full mx-auto space-y-2.5 lg:space-y-3 py-2"
          >
            {/* Optional Floating Mini Stage Timer Banner above scoreboard */}
            {state.timer?.showOverlayOnScoreboard &&
              state.timer.mode !== 'STOPPED' && (
                <div className="relative z-10 mb-2 py-2 px-4 rounded-xl bg-[#0B132B]/90 border border-brand-cyan/50 backdrop-blur-md flex items-center justify-between shadow-[0_0_20px_rgba(0,212,255,0.15)]">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="size-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                    <span className="text-xs font-bold text-brand-cyan uppercase tracking-wider shrink-0">
                      TIMELINE:
                    </span>
                    <span className="text-sm font-bold text-text-primary truncate">
                      {activeTimerTeam?.name || 'Đội thi đấu'}
                    </span>
                    <span className="text-xs text-text-tertiary truncate hidden sm:inline">
                      • {state.timer?.roundLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-xl sm:text-2xl font-bold tracking-wider tabular-nums ${
                        timerRemaining <= 30 && timerRemaining > 0
                          ? 'text-red-400 animate-pulse'
                          : timerRemaining <= 60
                          ? 'text-amber-400'
                          : 'text-brand-cyan'
                      }`}
                    >
                      ⏱️ {formatTimerSeconds(timerRemaining)}
                    </span>
                  </div>
                </div>
              )}
            {rankedTeams.map((team) => {
              const currentRank = isBoothView ? team.boothRank : team.rank
              const prevRank = isBoothView ? team.prevBoothRank : team.prevRank
              const rankDiff = prevRank - currentRank
              const hasScore = isBoothView ? team.boothVotes > 0 : team.score > 0

              const isTop1 = currentRank === 1 && hasScore
              const isTop2 = currentRank === 2 && hasScore
              const isTop3 = currentRank === 3 && hasScore

              const cardStyle = isTop1
                ? 'border-yellow-400/80 bg-[#0A1120]/85 shadow-[0_0_24px_rgba(234,179,8,0.22)] border-l-4 border-l-yellow-400'
                : isTop2
                ? 'border-slate-300/70 bg-[#0A1120]/85 shadow-[0_0_18px_rgba(203,213,225,0.18)] border-l-4 border-l-slate-300'
                : isTop3
                ? 'border-amber-500/70 bg-[#0A1120]/85 shadow-[0_0_18px_rgba(245,158,11,0.18)] border-l-4 border-l-amber-500'
                : 'border-surface-border/90 bg-[#0A1120]/80 shadow-[0_4px_16px_rgba(0,0,0,0.4)]'

              const barPct = isBoothView
                ? hasScore
                  ? Math.min(100, Math.max(4, (team.boothVotes / maxBoothVotes) * 100))
                  : 0
                : hasScore
                ? Math.min(100, Math.max(3, (team.score / MAX_TOTAL_SCORE) * 100))
                : 0

              const voteSharePct =
                totalBoothVotes > 0
                  ? ((team.boothVotes / totalBoothVotes) * 100).toFixed(1)
                  : '0.0'

              return (
                <motion.div
                  key={team.id}
                  layout
                  transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                  className={`rounded-xl border px-4 py-3 lg:px-6 lg:py-3.5 backdrop-blur-md transition-colors duration-200 ${cardStyle}`}
                >
                  <div className="flex items-center gap-3.5 lg:gap-5 w-full">
                    {/* 1. Synchronized Rank Badge (Fixed Width) */}
                    <StageRankBadge rank={currentRank} hasScore={hasScore} />

                    {/* 2. Team Poster Thumbnail (Full-View Landscape 3:2) */}
                    <div className="relative w-24 sm:w-28 lg:w-36 aspect-[3/2] rounded-lg overflow-hidden border border-surface-border bg-black/60 shrink-0 shadow-sm">
                      <Image
                        src={team.posterUrl}
                        alt={team.name}
                        fill
                        sizes="160px"
                        className="object-contain object-center"
                      />
                    </div>

                    {/* 3. Team Main Info & Progress Bar (Flexible center area) */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="px-2 py-0.5 rounded bg-brand-cyan/15 border border-brand-cyan/30 text-[11px] lg:text-xs font-bold text-brand-cyan shrink-0 tabular-nums">
                          {isBoothView ? `Gian hàng #${team.msbc}` : `Đội #${team.msbc}`}
                        </span>
                        <span className="text-[11px] lg:text-xs text-text-secondary truncate max-w-[200px] sm:max-w-xs md:max-w-sm">
                          {team.institution}
                        </span>
                        {rankDiff > 0 && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-semantic-success/15 text-semantic-success text-[11px] font-bold shrink-0 tabular-nums">
                            <TrendingUp className="size-3" />+{rankDiff}
                          </span>
                        )}
                        {rankDiff < 0 && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-semantic-danger/15 text-semantic-danger text-[11px] font-bold shrink-0 tabular-nums">
                            <TrendingDown className="size-3" />
                            {rankDiff}
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg lg:text-2xl font-bold text-white truncate">
                        {team.name}
                      </h3>

                      {/* Complete Team Members (Leader + all members) */}
                      <div className="text-[11px] text-text-tertiary truncate max-w-sm sm:max-w-md lg:max-w-xl mt-0.5 font-sans">
                        <span className="text-brand-cyan font-semibold">Trưởng nhóm: {team.leaderName}</span>
                        {team.members && team.members.length > 0 && (
                          <span>
                            {' • '}Thành viên: {team.members.filter((m) => m.role !== 'leader').map((m) => m.name).join(', ')}
                          </span>
                        )}
                      </div>

                      {/* Progress Bar under name */}
                      <div
                        className="h-1.5 w-full rounded-full overflow-hidden mt-1.5"
                        style={{ background: 'rgba(255,255,255,0.08)' }}
                      >
                        <div
                          className="h-full rounded-full transition-all duration-700 ease-out"
                          style={{
                            width: `${barPct}%`,
                            background: barGradient(currentRank, hasScore),
                          }}
                        />
                      </div>
                    </div>

                    {/* 4. Right side: 3 Stage Pills (Only in STAGES mode, fixed width) */}
                    {!isBoothView && (
                      <div className="flex items-center gap-2 shrink-0">
                        {([1, 2, 3] as const).map((stNum) => {
                          const stVal =
                            stNum === 1
                              ? team.stage1
                              : stNum === 2
                              ? team.stage2
                              : team.stage3
                          const stName =
                            stNum === 1
                              ? state.stageNames.s1
                              : stNum === 2
                              ? state.stageNames.s2
                              : state.stageNames.s3
                          const isCurrentActive = state.activeStage === stNum

                          return (
                            <div
                              key={stNum}
                              className={`px-2.5 py-1.5 rounded-lg border text-center w-20 lg:w-24 shrink-0 transition-colors ${
                                isCurrentActive
                                    ? 'bg-brand-navy/90 border-brand-cyan shadow-[0_0_12px_rgba(0,212,255,0.3)]'
                                  : 'bg-surface-overlay/70 border-surface-border'
                              }`}
                            >
                              <div className="text-[10px] uppercase text-text-tertiary truncate font-semibold">
                                {stName}
                              </div>
                              <div className="text-xs lg:text-sm font-bold text-text-primary tabular-nums">
                                {stVal}
                                <span className="text-[10px] text-text-tertiary font-normal">
                                  /{MAX_STAGE_SCORE}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* 5. Rightmost: Total Score / Booth Votes (Fixed width, strictly no wrap) */}
                    <div className="text-right shrink-0 w-28 lg:w-36">
                      <div className="text-[10px] uppercase tracking-wider text-text-tertiary mb-0.5 font-semibold">
                        {isBoothView
                          ? `Tỷ lệ: ${voteSharePct}%`
                          : `Tổng / ${MAX_TOTAL_SCORE}`}
                      </div>
                      <div
                        className="text-2xl lg:text-4xl font-bold tabular-nums leading-none"
                        style={{ color: scoreColor(currentRank, hasScore) }}
                      >
                        {isBoothView
                          ? team.boothVotes.toLocaleString('vi-VN')
                          : team.score.toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.main>
        )}
      </AnimatePresence>

      {/* Stage Footer */}
      <footer className="relative z-10 flex items-center justify-between text-[11px] lg:text-xs text-text-tertiary border-t border-surface-border/80 pt-2.5 shrink-0 bg-[#050814]/60 backdrop-blur-sm -mx-6 -mb-5 px-6 pb-2.5 md:-mx-12 md:-mb-6 md:px-12 font-medium">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-3.5 text-brand-cyan" />
          <span>GEND ARENA 2026 • CHUNG KẾT TOÀN QUỐC</span>
        </div>
        <div className="flex items-center gap-1.5 text-text-tertiary">
          <span>HỘI ĐỒNG BAN GIÁM KHẢO &amp; BAN TỔ CHỨC</span>
        </div>
      </footer>
    </div>
  )
}
