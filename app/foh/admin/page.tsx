'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import DotGridBackground from '@/components/dot-grid-background'
import {
  FOHState,
  FOHMessage,
  FOHDisplayView,
  ActiveStageKey,
  INITIAL_FOH_STATE,
  FOH_STORAGE_KEY,
  FOH_DISPLAY_SNAPSHOT_KEY,
  FOH_CHANNEL_NAME,
  MAX_STAGE_SCORE,
  MAX_TOTAL_SCORE,
  SoundEffect,
  clampStageScore,
  playFOHSound,
  syncTeamRanks,
} from '@/lib/foh-sync'
import {
  Trophy,
  Medal,
  Monitor,
  ArrowUpDown,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Sparkles,
  Undo2,
  Volume2,
  VolumeX,
  Download,
  Upload,
  RotateCcw,
  Radio,
  Database,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Settings,
  ChevronDown,
  ChevronUp,
  Check,
  Layers,
  Vote,
} from 'lucide-react'

function CompactRankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-yellow-500/15 border border-yellow-400/50 text-yellow-400 font-mono text-[11px] font-bold">
        <Trophy className="size-3" />
        <span>TOP 1</span>
      </span>
    )
  }
  if (rank === 2) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-400/15 border border-slate-300/40 text-slate-200 font-mono text-[11px] font-bold">
        <Medal className="size-3" />
        <span>TOP 2</span>
      </span>
    )
  }
  if (rank === 3) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-400 font-mono text-[11px] font-bold">
        <Medal className="size-3" />
        <span>TOP 3</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded bg-surface-overlay border border-surface-border text-text-tertiary font-mono text-[11px] font-bold">
      #{rank}
    </span>
  )
}

export default function FOHAdminPage() {
  const [state, setState] = useState<FOHState>(INITIAL_FOH_STATE)
  const [ledSnapshot, setLedSnapshot] = useState<FOHState>(INITIAL_FOH_STATE)
  const [history, setHistory] = useState<FOHState[]>([])
  const [displayOnline, setDisplayOnline] = useState(false)
  const [adminViewOrder, setAdminViewOrder] = useState<'RANK' | 'MSBC'>('MSBC')
  const [syncingDb, setSyncingDb] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [actionLog, setActionLog] = useState<string[]>([])

  const channelRef = useRef<BroadcastChannel | null>(null)
  const lastPongRef = useRef<number>(0)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const logEvent = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString('vi-VN')
    setActionLog((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 24)])
  }, [])

  // Load persisted state & initialize BroadcastChannel
  useEffect(() => {
    if (typeof window === 'undefined') return

    const saved = localStorage.getItem(FOH_STORAGE_KEY)
    const savedSnap = localStorage.getItem(FOH_DISPLAY_SNAPSHOT_KEY)

    if (saved) {
      try {
        const parsed = JSON.parse(saved) as FOHState
        const view = parsed.displayView || 'STAGES'
        const normalized: FOHState = {
          ...INITIAL_FOH_STATE,
          ...parsed,
          displayView: view,
          activeStage: parsed.activeStage || 1,
          stageNames: parsed.stageNames || INITIAL_FOH_STATE.stageNames,
          autoSortDisplay: parsed.autoSortDisplay ?? true,
          teams: syncTeamRanks(parsed.teams, parsed.autoSortDisplay ?? true, view),
        }
        setState(normalized)
        setLedSnapshot(savedSnap ? JSON.parse(savedSnap) : normalized)
      } catch {
        // fallback
      }
    } else {
      localStorage.setItem(FOH_STORAGE_KEY, JSON.stringify(INITIAL_FOH_STATE))
      localStorage.setItem(FOH_DISPLAY_SNAPSHOT_KEY, JSON.stringify(INITIAL_FOH_STATE))
    }

    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel(FOH_CHANNEL_NAME)
      channelRef.current = bc

      bc.onmessage = (e: MessageEvent<FOHMessage>) => {
        if (e.data.type === 'PONG') {
          lastPongRef.current = Date.now()
          setDisplayOnline(true)
        }
      }

      const pingInterval = setInterval(() => {
        bc.postMessage({ type: 'PING' })
        if (Date.now() - lastPongRef.current > 3500) {
          setDisplayOnline(false)
        }
      }, 1500)

      bc.postMessage({ type: 'PING' })

      return () => {
        clearInterval(pingInterval)
        bc.close()
      }
    }
  }, [])

  const updateState = useCallback(
    (
      updater: (prev: FOHState) => FOHState,
      options?: {
        sfx?: SoundEffect
        log?: string
        forceSyncDisplay?: boolean
        recordUndo?: boolean
      }
    ) => {
      setState((prev) => {
        if (options?.recordUndo !== false) {
          setHistory((h) => [prev, ...h.slice(0, 24)])
        }

        const rawNext = updater(prev)
        const rankedTeams = syncTeamRanks(
          rawNext.teams,
          rawNext.autoSortDisplay,
          rawNext.displayView
        )
        const next: FOHState = {
          ...rawNext,
          teams: rankedTeams,
          updatedAt: Date.now(),
        }

        localStorage.setItem(FOH_STORAGE_KEY, JSON.stringify(next))

        const shouldUpdateDisplay = !next.isFrozen || options?.forceSyncDisplay
        if (shouldUpdateDisplay) {
          localStorage.setItem(FOH_DISPLAY_SNAPSHOT_KEY, JSON.stringify(next))
          setLedSnapshot(next)
          channelRef.current?.postMessage({
            type: 'STATE_UPDATE',
            state: next,
            sfx: options?.sfx,
          })
        }

        if (options?.sfx) playFOHSound(options.sfx, next.soundEnabled)
        if (options?.log) logEvent(options.log)
        return next
      })
    },
    [logEvent]
  )

  const handleUndo = useCallback(() => {
    setHistory((prevHistory) => {
      if (prevHistory.length === 0) return prevHistory
      const [previousState, ...rest] = prevHistory
      const normalized: FOHState = {
        ...previousState,
        teams: syncTeamRanks(
          previousState.teams,
          previousState.autoSortDisplay,
          previousState.displayView
        ),
      }
      setState(normalized)
      localStorage.setItem(FOH_STORAGE_KEY, JSON.stringify(normalized))
      if (!normalized.isFrozen) {
        localStorage.setItem(FOH_DISPLAY_SNAPSHOT_KEY, JSON.stringify(normalized))
        setLedSnapshot(normalized)
        channelRef.current?.postMessage({
          type: 'STATE_UPDATE',
          state: normalized,
          sfx: 'score',
        })
      }
      logEvent('Hoàn tác (Undo)')
      return rest
    })
  }, [logEvent])

  const handleSwitchDisplayView = useCallback(
    (view: FOHDisplayView) => {
      updateState(
        (prev) => ({
          ...prev,
          displayView: view,
          teams: syncTeamRanks(prev.teams, true, view),
        }),
        {
          sfx: 'sort',
          forceSyncDisplay: !state.isFrozen,
          log:
            view === 'STAGES'
              ? 'Chiếu: Điểm 3 Chặng (150đ)'
              : 'Chiếu: Bảng Voting Gian Hàng',
        }
      )
    },
    [state.isFrozen, updateState]
  )

  const handleSelectActiveStage = (stage: ActiveStageKey) => {
    updateState(
      (prev) => ({
        ...prev,
        activeStage: stage,
      }),
      {
        recordUndo: false,
        log:
          stage === 'ALL'
            ? 'Đang chiếu: Tổng kết 3 chặng'
            : `Đang chiếu: Chặng ${stage}`,
      }
    )
  }

  const handleSortNow = useCallback(() => {
    setAdminViewOrder('RANK')
    updateState(
      (prev) => ({
        ...prev,
        autoSortDisplay: true,
        teams: syncTeamRanks(prev.teams, true, prev.displayView),
      }),
      {
        sfx: 'sort',
        forceSyncDisplay: !state.isFrozen,
        log: 'Xếp hạng điểm (#1 → #5)',
      }
    )
  }, [state.isFrozen, updateState])

  const handleFireworks = useCallback(() => {
    playFOHSound('celebrate', state.soundEnabled)
    channelRef.current?.postMessage({ type: 'TRIGGER_FIREWORKS' })
    localStorage.setItem(`${FOH_STORAGE_KEY}_FX`, String(Date.now()))
    logEvent('Bắn pháo hoa vinh danh')
  }, [logEvent, state.soundEnabled])

  const handleToggleHidden = useCallback(() => {
    updateState(
      (prev) => ({ ...prev, isHidden: !prev.isHidden }),
      {
        sfx: 'curtain',
        forceSyncDisplay: true,
        log: state.isHidden ? 'Hiện bảng điểm LED' : 'Ẩn bảng điểm (Màn chờ)',
      }
    )
  }, [state.isHidden, updateState])

  const handleToggleFreeze = useCallback(() => {
    updateState(
      (prev) => ({ ...prev, isFrozen: !prev.isFrozen }),
      {
        sfx: 'publish',
        forceSyncDisplay: true,
        recordUndo: false,
        log: state.isFrozen
          ? 'Công bố điểm mới lên LED'
          : 'Đóng băng màn LED (Nhập nháp)',
      }
    )
  }, [state.isFrozen, updateState])

  // Stage Score Updates
  const setTeamStageScore = (teamId: string, stageNum: 1 | 2 | 3, rawScore: number) => {
    const clamped = clampStageScore(rawScore)
    const target = state.teams.find((t) => t.id === teamId)
    const stageKey = `stage${stageNum}` as 'stage1' | 'stage2' | 'stage3'

    updateState(
      (prev) => ({
        ...prev,
        teams: prev.teams.map((t) => {
          if (t.id !== teamId) return t
          const updatedTeam = { ...t, [stageKey]: clamped }
          const newTotal = Number(
            (updatedTeam.stage1 + updatedTeam.stage2 + updatedTeam.stage3).toFixed(2)
          )
          return {
            ...updatedTeam,
            delta: Number((newTotal - t.score).toFixed(2)),
            score: newTotal,
          }
        }),
      }),
      {
        sfx: 'score',
        log: `#${target?.msbc} ${target?.name} C${stageNum}: ${clamped}đ`,
      }
    )
  }

  const adjustTeamStageScore = (teamId: string, stageNum: 1 | 2 | 3, delta: number) => {
    const target = state.teams.find((t) => t.id === teamId)
    if (!target) return
    const stageKey = `stage${stageNum}` as 'stage1' | 'stage2' | 'stage3'
    setTeamStageScore(teamId, stageNum, target[stageKey] + delta)
  }

  // Booth Voting Updates
  const setTeamBoothVotes = (teamId: string, rawVotes: number) => {
    const cleanVotes = Math.max(0, Math.round(rawVotes))
    const target = state.teams.find((t) => t.id === teamId)
    updateState(
      (prev) => ({
        ...prev,
        teams: prev.teams.map((t) => {
          if (t.id !== teamId) return t
          return {
            ...t,
            boothDelta: cleanVotes - t.boothVotes,
            boothVotes: cleanVotes,
          }
        }),
      }),
      {
        sfx: 'score',
        log: `#${target?.msbc} Vote: ${cleanVotes}`,
      }
    )
  }

  const adjustTeamBoothVotes = (teamId: string, delta: number) => {
    const target = state.teams.find((t) => t.id === teamId)
    if (!target) return
    setTeamBoothVotes(teamId, target.boothVotes + delta)
  }

  const handleSyncFromBoothDb = async () => {
    setSyncingDb(true)
    try {
      const res = await fetch('/api/admin/booth-voting', { cache: 'no-store' })
      if (!res.ok) {
        logEvent('Không thể đồng bộ từ DB (Cần login Admin / Offline)')
        return
      }
      const data = await res.json()
      if (Array.isArray(data.teams) && data.teams.length > 0) {
        const voteMap = new Map<string, number>()
        data.teams.forEach((row: { team_id: string; vote_count: number }) => {
          voteMap.set(row.team_id, Number(row.vote_count || 0))
        })

        updateState(
          (prev) => ({
            ...prev,
            teams: prev.teams.map((t) => {
              const dbVotes = voteMap.get(t.id)
              if (dbVotes === undefined) return t
              return {
                ...t,
                boothDelta: dbVotes - t.boothVotes,
                boothVotes: dbVotes,
              }
            }),
          }),
          {
            sfx: 'sort',
            forceSyncDisplay: !state.isFrozen,
            log: 'Đã đồng bộ phiếu từ DB',
          }
        )
      }
    } catch {
      logEvent('Máy FOH đang Offline')
    } finally {
      setSyncingDb(false)
    }
  }

  const openProjectorWindow = () => {
    window.open(
      '/foh/display',
      'GenDArenaProjectorWindow',
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    )
    logEvent('Mở cửa sổ LED (/foh/display)')
  }

  const exportBackupJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2))
    const a = document.createElement('a')
    a.href = dataStr
    a.download = `gend-arena-top5-foh-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
    a.click()
    logEvent('Xuất JSON backup')
  }

  const importBackupJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result)) as FOHState
        if (parsed && Array.isArray(parsed.teams)) {
          updateState(() => parsed, {
            forceSyncDisplay: true,
            log: `Nạp JSON backup (${parsed.teams.length} đội)`,
          })
        }
      } catch {
        logEvent('File JSON lỗi')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // Keyboard shortcuts: S = Sort, C = Celebrate, H = Hide, F = Freeze/Publish, Ctrl+Z = Undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      const key = e.key.toLowerCase()
      if (key === 's') {
        e.preventDefault()
        handleSortNow()
      } else if (key === 'c') {
        e.preventDefault()
        handleFireworks()
      } else if (key === 'h') {
        e.preventDefault()
        handleToggleHidden()
      } else if (key === 'f') {
        e.preventDefault()
        handleToggleFreeze()
      } else if (key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        handleUndo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleSortNow, handleFireworks, handleToggleHidden, handleToggleFreeze, handleUndo])

  const displayedAdminTeams =
    adminViewOrder === 'RANK'
      ? [...state.teams].sort((a, b) =>
          state.displayView === 'BOOTH_VOTING' ? a.boothRank - b.boothRank : a.rank - b.rank
        )
      : [...state.teams].sort((a, b) => a.msbc.localeCompare(b.msbc))

  const rankedLedTeams = [...ledSnapshot.teams].sort((a, b) =>
    ledSnapshot.displayView === 'BOOTH_VOTING' ? a.boothRank - b.boothRank : a.rank - b.rank
  )

  const totalBoothVotes = state.teams.reduce((acc, t) => acc + (t.boothVotes || 0), 0)

  return (
    <div className="min-h-screen bg-[#060B19] text-text-primary select-none flex flex-col font-sans">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <DotGridBackground />
      </div>

      {/* 1. TOP SINGLE-LINE COMPACT HEADER */}
      <header className="relative z-10 border-b border-surface-border bg-[#0A1120]/90 backdrop-blur-md px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Branding & Status */}
          <div className="flex items-center gap-3">
            <Link
              href="/foh"
              className="p-1 rounded text-text-tertiary hover:text-brand-cyan hover:bg-surface-raised transition-colors"
              title="Về cổng FOH"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div className="flex items-center gap-2">
              <Image
                src="/logo/gendarena-logo.png"
                alt="GenD Arena"
                width={20}
                height={20}
                className="object-contain"
              />
              <span className="font-display text-sm font-bold tracking-wide text-text-primary">
                FOH CONSOLE
              </span>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono border ${
                displayOnline
                  ? 'bg-semantic-success/15 text-semantic-success border-semantic-success/40'
                  : 'bg-surface-raised text-text-tertiary border-surface-border'
              }`}
            >
              <Radio className="size-2.5" />
              <span>{displayOnline ? 'LED LIVE' : 'LED OFF'}</span>
            </span>

            {state.isFrozen && (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-cyan-500/20 text-brand-cyan border border-brand-cyan/40">
                ĐÓNG BĂNG LED
              </span>
            )}

            {state.isHidden && (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                ĐANG CHE MÀN CHỜ
              </span>
            )}
          </div>

          {/* Center: Presentation Mode Switch */}
          <div className="inline-flex p-0.5 rounded-lg bg-surface-base border border-surface-border">
            <button
              type="button"
              onClick={() => handleSwitchDisplayView('STAGES')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                state.displayView === 'STAGES'
                  ? 'bg-brand-cyan text-text-on-brand font-bold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Layers className="size-3.5" />
              <span>Điểm 3 Chặng (150đ)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchDisplayView('BOOTH_VOTING')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                state.displayView === 'BOOTH_VOTING'
                  ? 'bg-brand-cyan text-text-on-brand font-bold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Vote className="size-3.5" />
              <span>Voting Gian Hàng</span>
            </button>
          </div>

          {/* Right: Compact Utilities */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                updateState((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }), {
                  recordUndo: false,
                })
              }
              className={`p-1.5 rounded-md border text-xs cursor-pointer transition-colors ${
                state.soundEnabled
                  ? 'bg-surface-raised border-surface-border text-brand-cyan'
                  : 'bg-surface-base border-surface-border text-text-tertiary'
              }`}
              title={state.soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              {state.soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
            </button>

            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              className="px-2.5 py-1 rounded-md bg-surface-raised border border-surface-border text-xs text-text-secondary hover:text-text-primary disabled:opacity-40 cursor-pointer flex items-center gap-1"
              title="Hoàn tác (Ctrl+Z)"
            >
              <Undo2 className="size-3.5" />
              <span className="font-mono text-[11px]">{history.length}</span>
            </button>

            <button
              type="button"
              onClick={openProjectorWindow}
              className="px-3 py-1 rounded-md bg-brand-navy border border-brand-cyan/60 text-brand-cyan hover:bg-brand-navy-light text-xs font-bold font-mono transition-colors cursor-pointer flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,212,255,0.2)]"
            >
              <Monitor className="size-3.5" />
              <span>Mở Cửa Sổ LED</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. COMPACT ACTION & STAGE SELECTOR TOOLBAR */}
      <div className="relative z-10 border-b border-surface-border bg-[#0B132B]/60 backdrop-blur-sm px-4 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Quick Stage Controls (4 Clean Buttons) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSortNow}
              className="px-3 py-1.5 rounded-md bg-brand-navy border border-brand-cyan/40 hover:bg-brand-navy-light text-text-primary font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowUpDown className="size-3.5 text-brand-cyan" />
              <span>Xếp Hạng</span>
              <kbd className="px-1 text-[10px] font-mono bg-black/40 rounded text-brand-cyan">S</kbd>
            </button>

            <button
              type="button"
              onClick={handleToggleFreeze}
              className={`px-3 py-1.5 rounded-md border font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                state.isFrozen
                  ? 'bg-semantic-success/20 border-semantic-success text-semantic-success'
                  : 'bg-surface-raised border-surface-border hover:border-surface-border-strong text-text-primary'
              }`}
            >
              {state.isFrozen ? (
                <Unlock className="size-3.5 text-semantic-success" />
              ) : (
                <Lock className="size-3.5 text-brand-cyan" />
              )}
              <span>{state.isFrozen ? 'Công Bố Điểm' : 'Đóng Băng LED'}</span>
              <kbd className="px-1 text-[10px] font-mono bg-black/40 rounded text-text-tertiary">F</kbd>
            </button>

            <button
              type="button"
              onClick={handleToggleHidden}
              className={`px-3 py-1.5 rounded-md border font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                state.isHidden
                  ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                  : 'bg-surface-raised border-surface-border hover:border-surface-border-strong text-text-primary'
              }`}
            >
              {state.isHidden ? (
                <Eye className="size-3.5 text-rose-400" />
              ) : (
                <EyeOff className="size-3.5 text-semantic-warning" />
              )}
              <span>{state.isHidden ? 'Hiện Bảng LED' : 'Màn Chờ BGK'}</span>
              <kbd className="px-1 text-[10px] font-mono bg-black/40 rounded text-text-tertiary">H</kbd>
            </button>

            <button
              type="button"
              onClick={handleFireworks}
              className="px-3 py-1.5 rounded-md bg-surface-raised border border-accent-violet/50 hover:border-accent-violet text-text-primary font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="size-3.5 text-accent-violet" />
              <span>Pháo Hoa</span>
              <kbd className="px-1 text-[10px] font-mono bg-black/40 rounded text-accent-violet">C</kbd>
            </button>
          </div>

          {/* Active Stage & Table View Filter */}
          <div className="flex items-center gap-3">
            {state.displayView === 'STAGES' ? (
              <div className="flex items-center gap-1 bg-surface-base p-0.5 rounded-md border border-surface-border">
                <span className="text-[11px] font-mono text-text-tertiary px-2">Đang chiếu:</span>
                {([1, 2, 3, 'ALL'] as ActiveStageKey[]).map((st) => (
                  <button
                    key={String(st)}
                    type="button"
                    onClick={() => handleSelectActiveStage(st)}
                    className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                      state.activeStage === st
                        ? 'bg-brand-cyan text-text-on-brand font-bold'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {st === 'ALL' ? 'Tổng 150đ' : `Chặng ${st}`}
                  </button>
                ))}
              </div>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSyncFromBoothDb}
                isLoading={syncingDb}
                leftIcon={<Database className="size-3.5 text-brand-cyan" />}
                className="h-8 text-xs"
              >
                Kéo số phiếu từ DB
              </Button>
            )}

            <div className="flex items-center gap-1 bg-surface-base p-0.5 rounded-md border border-surface-border">
              <button
                type="button"
                onClick={() => setAdminViewOrder('MSBC')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  adminViewOrder === 'MSBC'
                    ? 'bg-brand-cyan text-text-on-brand font-bold'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
                title="Cố định mã đội 01..05"
              >
                Mã #01..#05
              </button>
              <button
                type="button"
                onClick={() => setAdminViewOrder('RANK')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  adminViewOrder === 'RANK'
                    ? 'bg-brand-cyan text-text-on-brand font-bold'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
                title="Xếp theo thứ hạng 1..5"
              >
                Hạng #1..#5
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. MAIN COMPACT WORKSPACE (ALL 5 TEAMS FIT ON 1 SCREEN) */}
      <main className="relative z-10 max-w-7xl w-full mx-auto p-4 flex-1 flex flex-col gap-4">
        <div className="grid grid-cols-12 gap-4 flex-1">
          {/* LEFT 9 COLS: HIGH-DENSITY PROFESSIONAL SCORING GRID */}
          <div className="col-span-12 lg:col-span-9 flex flex-col justify-start">
            {state.displayView === 'STAGES' ? (
              /* PRO-CONSOLE 3-STAGE GRID */
              <div className="rounded-xl border border-surface-border bg-[#0A1120] overflow-hidden shadow-elevation-2">
                {/* Table Header Row */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-surface-raised/70 border-b border-surface-border text-[11px] font-mono text-text-tertiary uppercase">
                  <div className="col-span-3 flex items-center gap-2">ĐỘI THI (TOP 5)</div>
                  <div className="col-span-2 text-center">
                    {state.stageNames.s1} <span className="text-brand-cyan font-bold">(50đ)</span>
                  </div>
                  <div className="col-span-2 text-center">
                    {state.stageNames.s2} <span className="text-brand-cyan font-bold">(50đ)</span>
                  </div>
                  <div className="col-span-2 text-center">
                    {state.stageNames.s3} <span className="text-brand-cyan font-bold">(50đ)</span>
                  </div>
                  <div className="col-span-3 text-right pr-2">
                    TỔNG ĐIỂM <span className="text-brand-cyan font-bold">(150đ)</span>
                  </div>
                </div>

                {/* 5 Compact Rows */}
                <div className="divide-y divide-surface-border">
                  {displayedAdminTeams.map((team) => {
                    const rankDiff = team.prevRank - team.rank
                    const isTop1 = team.rank === 1 && team.score > 0
                    const isTop2 = team.rank === 2 && team.score > 0
                    const isTop3 = team.rank === 3 && team.score > 0

                    const rowBg = isTop1
                      ? 'bg-yellow-950/15'
                      : isTop2
                      ? 'bg-slate-800/20'
                      : isTop3
                      ? 'bg-amber-950/15'
                      : 'hover:bg-surface-raised/40'

                    return (
                      <div
                        key={team.id}
                        className={`grid grid-cols-12 gap-2 items-center px-4 py-3 transition-colors ${rowBg}`}
                      >
                        {/* Col 1: Team Identity (col-span-3) */}
                        <div className="col-span-3 flex items-center gap-2.5 min-w-0">
                          <CompactRankBadge rank={team.rank} />
                          <div className="relative size-9 rounded-md overflow-hidden border border-surface-border shrink-0 bg-surface-overlay">
                            <Image
                              src={team.posterUrl}
                              alt={team.name}
                              fill
                              sizes="36px"
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] text-brand-cyan font-bold">
                                #{team.msbc}
                              </span>
                              <span className="font-display text-sm font-bold text-text-primary truncate">
                                {team.name}
                              </span>
                            </div>
                            <div className="text-[11px] text-text-tertiary truncate">
                              {team.institution}
                            </div>
                          </div>
                        </div>

                        {/* Col 2: Stage 1 (col-span-2) */}
                        <div className="col-span-2 flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => adjustTeamStageScore(team.id, 1, -5)}
                            className="size-7 rounded bg-surface-overlay border border-surface-border text-[11px] font-mono text-text-tertiary hover:text-semantic-danger cursor-pointer"
                            title="-5đ"
                          >
                            -5
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={MAX_STAGE_SCORE}
                            step="0.5"
                            value={team.stage1}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseFloat(e.target.value)
                              setTeamStageScore(team.id, 1, val)
                            }}
                            className={`w-16 h-8 text-center rounded font-mono text-sm font-bold border focus:outline-none focus:border-brand-cyan ${
                              state.activeStage === 1
                                ? 'bg-brand-navy border-brand-cyan text-brand-cyan'
                                : 'bg-surface-overlay border-surface-border text-text-primary'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => adjustTeamStageScore(team.id, 1, +5)}
                            className="size-7 rounded bg-surface-overlay border border-surface-border text-[11px] font-mono text-text-tertiary hover:text-semantic-success cursor-pointer"
                            title="+5đ"
                          >
                            +5
                          </button>
                        </div>

                        {/* Col 3: Stage 2 (col-span-2) */}
                        <div className="col-span-2 flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => adjustTeamStageScore(team.id, 2, -5)}
                            className="size-7 rounded bg-surface-overlay border border-surface-border text-[11px] font-mono text-text-tertiary hover:text-semantic-danger cursor-pointer"
                            title="-5đ"
                          >
                            -5
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={MAX_STAGE_SCORE}
                            step="0.5"
                            value={team.stage2}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseFloat(e.target.value)
                              setTeamStageScore(team.id, 2, val)
                            }}
                            className={`w-16 h-8 text-center rounded font-mono text-sm font-bold border focus:outline-none focus:border-brand-cyan ${
                              state.activeStage === 2
                                ? 'bg-brand-navy border-brand-cyan text-brand-cyan'
                                : 'bg-surface-overlay border-surface-border text-text-primary'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => adjustTeamStageScore(team.id, 2, +5)}
                            className="size-7 rounded bg-surface-overlay border border-surface-border text-[11px] font-mono text-text-tertiary hover:text-semantic-success cursor-pointer"
                            title="+5đ"
                          >
                            +5
                          </button>
                        </div>

                        {/* Col 4: Stage 3 (col-span-2) */}
                        <div className="col-span-2 flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => adjustTeamStageScore(team.id, 3, -5)}
                            className="size-7 rounded bg-surface-overlay border border-surface-border text-[11px] font-mono text-text-tertiary hover:text-semantic-danger cursor-pointer"
                            title="-5đ"
                          >
                            -5
                          </button>
                          <input
                            type="number"
                            min={0}
                            max={MAX_STAGE_SCORE}
                            step="0.5"
                            value={team.stage3}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseFloat(e.target.value)
                              setTeamStageScore(team.id, 3, val)
                            }}
                            className={`w-16 h-8 text-center rounded font-mono text-sm font-bold border focus:outline-none focus:border-brand-cyan ${
                              state.activeStage === 3
                                ? 'bg-brand-navy border-brand-cyan text-brand-cyan'
                                : 'bg-surface-overlay border-surface-border text-text-primary'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => adjustTeamStageScore(team.id, 3, +5)}
                            className="size-7 rounded bg-surface-overlay border border-surface-border text-[11px] font-mono text-text-tertiary hover:text-semantic-success cursor-pointer"
                            title="+5đ"
                          >
                            +5
                          </button>
                        </div>

                        {/* Col 5: Total Score & Movements (col-span-3) */}
                        <div className="col-span-3 flex items-center justify-end gap-3 pr-2">
                          {rankDiff > 0 && (
                            <span className="inline-flex items-center text-[11px] font-mono font-bold text-semantic-success">
                              <TrendingUp className="size-3 mr-0.5" />+{rankDiff}
                            </span>
                          )}
                          {rankDiff < 0 && (
                            <span className="inline-flex items-center text-[11px] font-mono font-bold text-semantic-danger">
                              <TrendingDown className="size-3 mr-0.5" />
                              {rankDiff}
                            </span>
                          )}

                          <div className="text-right">
                            <div className="font-mono text-2xl font-bold text-brand-cyan tabular-nums leading-none">
                              {team.score.toLocaleString('vi-VN')}
                            </div>
                            <div className="text-[10px] font-mono text-text-tertiary">
                              / {MAX_TOTAL_SCORE}đ
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* PRO-CONSOLE BOOTH VOTING GRID */
              <div className="rounded-xl border border-surface-border bg-[#0A1120] overflow-hidden shadow-elevation-2">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-surface-raised/70 border-b border-surface-border text-[11px] font-mono text-text-tertiary uppercase">
                  <div className="col-span-4">GIAN HÀNG (TOP 5)</div>
                  <div className="col-span-5 text-center">ĐIỀU CHỈNH SỐ PHIẾU BẦU</div>
                  <div className="col-span-3 text-right pr-2">TỔNG PHIẾU / TỶ LỆ</div>
                </div>

                <div className="divide-y divide-surface-border">
                  {displayedAdminTeams.map((team) => {
                    const pct =
                      totalBoothVotes > 0
                        ? ((team.boothVotes / totalBoothVotes) * 100).toFixed(1)
                        : '0.0'

                    return (
                      <div
                        key={team.id}
                        className="grid grid-cols-12 gap-2 items-center px-4 py-3 hover:bg-surface-raised/40 transition-colors"
                      >
                        {/* Identity */}
                        <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                          <CompactRankBadge rank={team.boothRank} />
                          <div className="relative size-9 rounded-md overflow-hidden border border-surface-border shrink-0 bg-surface-overlay">
                            <Image
                              src={team.posterUrl}
                              alt={team.name}
                              fill
                              sizes="36px"
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] text-brand-cyan font-bold">
                                #{team.msbc}
                              </span>
                              <span className="font-display text-sm font-bold text-text-primary truncate">
                                {team.name}
                              </span>
                            </div>
                            <div className="text-[11px] text-text-tertiary truncate">
                              {team.institution}
                            </div>
                          </div>
                        </div>

                        {/* Adjusters */}
                        <div className="col-span-5 flex items-center justify-center gap-1.5">
                          {[-10, -1].map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => adjustTeamBoothVotes(team.id, d)}
                              className="h-8 px-2 rounded bg-surface-overlay border border-surface-border text-xs font-mono text-semantic-danger hover:bg-semantic-danger/10 cursor-pointer"
                            >
                              {d}
                            </button>
                          ))}

                          <input
                            type="number"
                            min={0}
                            value={team.boothVotes}
                            onChange={(e) => {
                              const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10)
                              setTeamBoothVotes(team.id, val)
                            }}
                            className="w-24 h-8 text-center rounded bg-surface-overlay border border-surface-border font-mono text-sm font-bold text-brand-cyan focus:outline-none focus:border-brand-cyan"
                          />

                          {[+1, +5, +10, +50].map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => adjustTeamBoothVotes(team.id, d)}
                              className="h-8 px-2 rounded bg-surface-overlay border border-surface-border text-xs font-mono text-semantic-success hover:bg-semantic-success/10 cursor-pointer"
                            >
                              +{d}
                            </button>
                          ))}
                        </div>

                        {/* Total Votes */}
                        <div className="col-span-3 text-right pr-2">
                          <div className="font-mono text-2xl font-bold text-brand-cyan tabular-nums leading-none">
                            {team.boothVotes.toLocaleString('vi-VN')}
                          </div>
                          <div className="text-[11px] font-mono text-text-tertiary mt-0.5">
                            {pct}% tổng phiếu
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Quick Status Bar */}
            <div className="flex items-center justify-between text-xs font-mono text-text-tertiary mt-3 px-1">
              <div className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-brand-cyan animate-pulse" />
                <span>
                  {actionLog[0] || 'Sẵn sàng ghi nhận thao tác của thư ký...'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="hover:text-brand-cyan flex items-center gap-1 cursor-pointer"
              >
                <Settings className="size-3.5" />
                <span>{showConfig ? 'Thu gọn Cài đặt & Sao lưu' : 'Mở Cài đặt & Sao lưu'}</span>
                {showConfig ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
              </button>
            </div>
          </div>

          {/* RIGHT 3 COLS: COMPACT LIVE LED PREVIEW & STATS */}
          <div className="col-span-12 lg:col-span-3 space-y-3">
            {/* COMPACT LED MONITOR */}
            <div className="rounded-xl border border-surface-border bg-[#0A1120] p-3.5 space-y-2.5 shadow-elevation-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-mono text-brand-cyan font-bold">
                  <Monitor className="size-3.5" />
                  <span>PREVIEW LED</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    ledSnapshot.isHidden
                      ? 'bg-rose-500/20 text-rose-300'
                      : 'bg-semantic-success/20 text-semantic-success'
                  }`}
                >
                  {ledSnapshot.isHidden ? 'MÀN CHỜ' : 'LIVE'}
                </span>
              </div>

              {/* 5 Compact Preview Rows */}
              <div className="space-y-1.5 text-xs font-mono">
                {rankedLedTeams.map((t) => {
                  const isVoting = ledSnapshot.displayView === 'BOOTH_VOTING'
                  const r = isVoting ? t.boothRank : t.rank
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded bg-surface-base border border-surface-border/80"
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-bold text-brand-cyan w-5 shrink-0">#{r}</span>
                        <span className="truncate text-text-primary text-[11px] font-display font-semibold">
                          {t.name}
                        </span>
                      </div>
                      <span className="font-bold text-text-primary tabular-nums shrink-0 ml-2">
                        {isVoting ? `${t.boothVotes}p` : `${t.score}`}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Quick Action Shortcuts Legend */}
            <div className="rounded-xl border border-surface-border bg-[#0A1120] p-3 text-[11px] font-mono text-text-tertiary space-y-1">
              <div className="text-text-secondary font-bold font-sans">Phím tắt nhanh:</div>
              <div><kbd className="px-1 bg-black/40 rounded text-brand-cyan">S</kbd> Xếp hạng điểm</div>
              <div><kbd className="px-1 bg-black/40 rounded text-text-secondary">F</kbd> Đóng băng / Công bố</div>
              <div><kbd className="px-1 bg-black/40 rounded text-text-secondary">H</kbd> Ẩn / Hiện màn chờ</div>
              <div><kbd className="px-1 bg-black/40 rounded text-accent-violet">C</kbd> Pháo hoa</div>
              <div><kbd className="px-1 bg-black/40 rounded text-text-secondary">Ctrl+Z</kbd> Hoàn tác</div>
            </div>
          </div>
        </div>

        {/* COLLAPSIBLE CONFIGURATION DRAWER (STAGES NAMES & OFFLINE BACKUP) */}
        {showConfig && (
          <div className="rounded-xl border border-surface-border bg-[#0A1120] p-4 space-y-3 shadow-elevation-2">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
                <Settings className="size-4 text-brand-cyan" />
                <span>Cài Đặt Tên Chặng &amp; Sao Lưu Offline</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowConfig(false)}
                className="text-xs text-text-tertiary hover:text-text-primary cursor-pointer"
              >
                ✕ Đóng
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] text-text-tertiary">Tên Chặng 1</label>
                <input
                  value={state.stageNames.s1}
                  onChange={(e) =>
                    updateState(
                      (prev) => ({
                        ...prev,
                        stageNames: { ...prev.stageNames, s1: e.target.value },
                      }),
                      { recordUndo: false }
                    )
                  }
                  className="bg-surface-raised border border-surface-border rounded h-8 w-full px-2 text-xs text-text-primary focus:outline-none focus:border-brand-cyan mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] text-text-tertiary">Tên Chặng 2</label>
                <input
                  value={state.stageNames.s2}
                  onChange={(e) =>
                    updateState(
                      (prev) => ({
                        ...prev,
                        stageNames: { ...prev.stageNames, s2: e.target.value },
                      }),
                      { recordUndo: false }
                    )
                  }
                  className="bg-surface-raised border border-surface-border rounded h-8 w-full px-2 text-xs text-text-primary focus:outline-none focus:border-brand-cyan mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] text-text-tertiary">Tên Chặng 3</label>
                <input
                  value={state.stageNames.s3}
                  onChange={(e) =>
                    updateState(
                      (prev) => ({
                        ...prev,
                        stageNames: { ...prev.stageNames, s3: e.target.value },
                      }),
                      { recordUndo: false }
                    )
                  }
                  className="bg-surface-raised border border-surface-border rounded h-8 w-full px-2 text-xs text-text-primary focus:outline-none focus:border-brand-cyan mt-1"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-surface-border">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportBackupJson}
                  className="px-3 py-1.5 rounded bg-surface-raised border border-surface-border text-xs text-text-secondary hover:text-text-primary flex items-center gap-1 cursor-pointer"
                >
                  <Download className="size-3.5" />
                  <span>Xuất JSON Backup</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded bg-surface-raised border border-surface-border text-xs text-text-secondary hover:text-text-primary flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="size-3.5" />
                  <span>Nạp JSON Backup</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={importBackupJson}
                  className="hidden"
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  updateState(() => INITIAL_FOH_STATE, {
                    forceSyncDisplay: true,
                    log: 'Đã đặt lại bảng điểm về 0',
                  })
                }
                className="px-3 py-1.5 rounded text-xs text-semantic-danger border border-semantic-danger/30 hover:bg-semantic-danger/10 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                <span>Reset điểm về 0</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
