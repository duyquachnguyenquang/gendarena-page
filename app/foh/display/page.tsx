'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import DotGridBackground from '@/components/dot-grid-background'
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
} from 'lucide-react'

function StageRankBadge({ rank, hasScore }: { rank: number; hasScore: boolean }) {
  if (rank === 1 && hasScore) {
    return (
      <div className="w-24 py-2.5 rounded-lg bg-yellow-500/15 border border-yellow-400/60 flex flex-col items-center justify-center shrink-0">
        <Trophy className="size-6 text-yellow-400" />
        <span className="font-mono text-xs font-bold text-yellow-400 mt-1">HẠNG 1</span>
      </div>
    )
  }
  if (rank === 2 && hasScore) {
    return (
      <div className="w-24 py-2.5 rounded-lg bg-slate-400/15 border border-slate-300/50 flex flex-col items-center justify-center shrink-0">
        <Medal className="size-6 text-slate-300" />
        <span className="font-mono text-xs font-bold text-slate-200 mt-1">HẠNG 2</span>
      </div>
    )
  }
  if (rank === 3 && hasScore) {
    return (
      <div className="w-24 py-2.5 rounded-lg bg-amber-500/15 border border-amber-500/50 flex flex-col items-center justify-center shrink-0">
        <Medal className="size-6 text-amber-500" />
        <span className="font-mono text-xs font-bold text-amber-400 mt-1">HẠNG 3</span>
      </div>
    )
  }
  return (
    <div className="w-24 py-2.5 rounded-lg bg-surface-overlay border border-surface-border flex flex-col items-center justify-center shrink-0">
      <span className="font-mono text-xl font-bold text-text-secondary">#{rank}</span>
      <span className="font-mono text-[10px] text-text-tertiary uppercase mt-0.5">HẠNG</span>
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

export default function FOHDisplayPage() {
  const [state, setState] = useState<FOHState>(INITIAL_FOH_STATE)
  const [fireworks, setFireworks] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const launchFireworks = useCallback((soundEnabled = true) => {
    setFireworks(true)
    playFOHSound('celebrate', soundEnabled)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setFireworks(false), 5500)
  }, [])

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

  const isBoothView = state.displayView === 'BOOTH_VOTING'
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

  return (
    <div
      onDoubleClick={() => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {})
        } else {
          document.exitFullscreen().catch(() => {})
        }
      }}
      className="relative min-h-screen w-full bg-surface-base text-text-primary overflow-hidden select-none flex flex-col justify-between px-8 py-6 md:px-14 md:py-8"
    >
      <FireworksOverlay active={fireworks} />

      {/* Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <DotGridBackground />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[750px] h-96 rounded-full bg-brand-cyan/5 blur-[150px]" />
      </div>

      {/* Stage Header */}
      <header className="relative z-10 flex flex-col items-center text-center space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-surface-raised border border-brand-cyan/30 text-brand-cyan text-xs font-mono uppercase tracking-wider">
            <Image
              src="/logo/gendarena-logo.png"
              alt="GenD Arena 2026"
              width={16}
              height={16}
              className="object-contain"
            />
            <span>{state.roundName}</span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-brand-navy border border-brand-cyan/50 text-text-primary text-xs font-mono font-semibold">
            {isBoothView ? (
              <>
                <Vote className="size-3.5 text-brand-cyan" />
                <span>TỔNG SỐ PHIẾU HỢP LỆ: {totalBoothVotes.toLocaleString('vi-VN')} PHIẾU</span>
              </>
            ) : (
              <>
                <Layers className="size-3.5 text-brand-cyan" />
                <span>{activeStageLabel}</span>
              </>
            )}
          </div>
        </div>

        <h1 className="font-display text-3xl md:text-5xl font-bold text-text-primary tracking-tight">
          {isBoothView ? state.boothTitle : state.title}
        </h1>

        <p className="text-sm md:text-base text-text-secondary">
          {isBoothView ? state.boothSubtitle : state.subtitle}
        </p>
      </header>

      {/* Stage Body: Curtain or Live Leaderboard */}
      <AnimatePresence mode="wait">
        {state.isHidden ? (
          <motion.div
            key="curtain"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.35 }}
            className="relative z-20 my-auto max-w-4xl mx-auto w-full flex flex-col items-center justify-center py-20 px-10 rounded-xl border border-surface-border bg-surface-overlay"
          >
            <div className="size-16 rounded-full border-2 border-t-brand-cyan border-r-accent-violet border-b-brand-navy-light border-l-transparent animate-spin mb-6" />
            <h2 className="font-display text-2xl md:text-4xl font-bold text-center text-text-primary">
              {state.hiddenMessage}
            </h2>
            <p className="mt-3 text-sm font-mono text-text-secondary uppercase tracking-wider">
              Hệ thống đang khóa hiển thị bảng điểm tạm thời
            </p>
          </motion.div>
        ) : (
          <motion.main
            key={state.displayView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative z-10 my-auto max-w-6xl w-full mx-auto space-y-3 py-3"
          >
            {rankedTeams.map((team) => {
              const currentRank = isBoothView ? team.boothRank : team.rank
              const prevRank = isBoothView ? team.prevBoothRank : team.prevRank
              const rankDiff = prevRank - currentRank
              const hasScore = isBoothView ? team.boothVotes > 0 : team.score > 0

              const isTop1 = currentRank === 1 && hasScore
              const isTop2 = currentRank === 2 && hasScore
              const isTop3 = currentRank === 3 && hasScore

              const cardStyle = isTop1
                ? 'border-yellow-400/60 bg-surface-raised border-l-4 border-l-yellow-400'
                : isTop2
                ? 'border-slate-300/50 bg-surface-raised border-l-4 border-l-slate-300'
                : isTop3
                ? 'border-amber-500/50 bg-surface-raised border-l-4 border-l-amber-500'
                : 'border-surface-border bg-surface-raised'

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
                  className={`rounded-xl border px-5 py-3.5 transition-colors duration-200 ${cardStyle}`}
                >
                  <div className="flex items-center gap-5">
                    {/* Synchronized Rank Badge */}
                    <StageRankBadge rank={currentRank} hasScore={hasScore} />

                    {/* Team Poster Thumbnail */}
                    <div className="relative size-16 rounded-lg overflow-hidden border border-surface-border bg-surface-overlay shrink-0">
                      <Image
                        src={team.posterUrl}
                        alt={team.name}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>

                    {/* Team Info + 3-Stage Breakdown or Booth Progress */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="px-2 py-0.5 rounded bg-brand-cyan/15 border border-brand-cyan/30 font-mono text-xs font-bold text-brand-cyan">
                              {isBoothView ? `Gian hàng #${team.msbc}` : `Đội #${team.msbc}`}
                            </span>
                            <span className="text-xs font-mono text-text-tertiary truncate">
                              {team.institution}
                            </span>
                            {rankDiff > 0 && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-semantic-success/15 text-semantic-success font-mono text-xs font-bold">
                                <TrendingUp className="size-3" />+{rankDiff}
                              </span>
                            )}
                            {rankDiff < 0 && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-semantic-danger/15 text-semantic-danger font-mono text-xs font-bold">
                                <TrendingDown className="size-3" />
                                {rankDiff}
                              </span>
                            )}
                          </div>

                          <h3 className="font-display text-2xl md:text-3xl font-bold text-text-primary truncate">
                            {team.name}
                          </h3>
                        </div>

                        {/* Center-Right: 3 Stage Score Pills (Only in STAGES view) */}
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
                              const isHighlighted =
                                state.activeStage === stNum || state.activeStage === 'ALL'

                              return (
                                <div
                                  key={stNum}
                                  className={`px-3 py-1.5 rounded-lg border text-center min-w-[96px] ${
                                    state.activeStage === stNum
                                      ? 'bg-brand-navy border-brand-cyan'
                                      : isHighlighted
                                      ? 'bg-surface-overlay border-surface-border-strong'
                                      : 'bg-surface-overlay/50 border-surface-border opacity-75'
                                  }`}
                                >
                                  <div className="text-[10px] font-mono uppercase text-text-tertiary truncate">
                                    {stName}
                                  </div>
                                  <div className="font-mono text-base font-bold text-text-primary tabular-nums">
                                    {stVal}
                                    <span className="text-[11px] text-text-tertiary font-normal">
                                      /{MAX_STAGE_SCORE}
                                    </span>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {/* Rightmost: Total Score /150 OR Booth Votes */}
                        <div className="text-right shrink-0 min-w-[135px]">
                          <div className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary mb-0.5">
                            {isBoothView
                              ? `Tỷ lệ: ${voteSharePct}%`
                              : `Tổng Điểm / ${MAX_TOTAL_SCORE}`}
                          </div>
                          <div
                            className="font-mono text-3xl md:text-5xl font-bold tabular-nums leading-none"
                            style={{ color: scoreColor(currentRank, hasScore) }}
                          >
                            {isBoothView
                              ? team.boothVotes.toLocaleString('vi-VN')
                              : team.score.toLocaleString('vi-VN')}
                          </div>
                        </div>
                      </div>

                      {/* Animated Progress Bar */}
                      <div
                        className="h-2 w-full rounded-full overflow-hidden"
                        style={{ background: 'rgba(255,255,255,0.06)' }}
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
                  </div>
                </motion.div>
              )
            })}
          </motion.main>
        )}
      </AnimatePresence>

      {/* Stage Footer */}
      <footer className="relative z-10 flex items-center justify-between text-xs font-mono text-text-tertiary border-t border-surface-border pt-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-3.5 text-brand-cyan" />
          <span>
            GEND ARENA 2026 •{' '}
            {isBoothView
              ? 'OFFICIAL BOOTH VOTING LEADERBOARD (TOP 5)'
              : 'GRAND FINALE 3-STAGE SCOREBOARD (MAX 150 PTS)'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <Maximize2 className="size-3.5" />
          <span>NHẤP ĐÚP CHUỘT ĐỂ BẬT TOÀN MÀN HÌNH (FULLSCREEN)</span>
        </div>
      </footer>
    </div>
  )
}
