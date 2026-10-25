'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import DotGridBackground from '@/components/dot-grid-background'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  CheckCircle2,
  Layers,
  Vote,
} from 'lucide-react'

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-yellow-500/15 border border-yellow-400/50 text-yellow-400 font-mono text-xs font-bold">
        <Trophy className="size-3.5" />
        <span>HẠNG 1</span>
      </div>
    )
  }
  if (rank === 2) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-400/15 border border-slate-300/40 text-slate-200 font-mono text-xs font-bold">
        <Medal className="size-3.5" />
        <span>HẠNG 2</span>
      </div>
    )
  }
  if (rank === 3) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-400 font-mono text-xs font-bold">
        <Medal className="size-3.5" />
        <span>HẠNG 3</span>
      </div>
    )
  }
  return (
    <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-surface-overlay border border-surface-border text-text-secondary font-mono text-xs font-bold">
      HẠNG {rank}
    </div>
  )
}

export default function FOHAdminPage() {
  const [state, setState] = useState<FOHState>(INITIAL_FOH_STATE)
  const [ledSnapshot, setLedSnapshot] = useState<FOHState>(INITIAL_FOH_STATE)
  const [history, setHistory] = useState<FOHState[]>([])
  const [displayOnline, setDisplayOnline] = useState(false)
  const [adminViewOrder, setAdminViewOrder] = useState<'RANK' | 'MSBC'>('MSBC')
  const [syncingDb, setSyncingDb] = useState(false)
  const [actionLog, setActionLog] = useState<string[]>([])

  const channelRef = useRef<BroadcastChannel | null>(null)
  const lastPongRef = useRef<number>(0)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const logEvent = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString('vi-VN')
    setActionLog((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 39)])
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
        // fallback to default
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

  // Core state updater: recalculates 3-stage total & booth ranks synchronously in real-time
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
      logEvent('Đã hoàn tác (Undo) thao tác trước đó')
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
              ? 'Chuyển màn hình LED sang: Bảng Điểm 3 Chặng (Tổng 150đ)'
              : 'Chuyển màn hình LED sang: Bảng Điểm Voting Gian Hàng (Cuối chương trình)',
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
            ? 'Chọn chế độ hiển thị: Tổng kết cả 3 Chặng (150 điểm)'
            : `Chọn chặng đang chấm: Chặng ${stage} (Tối đa 50 điểm)`,
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
        log: 'Đồng bộ & sắp xếp thứ hạng từ cao xuống thấp (#1 → #5)',
      }
    )
  }, [state.isFrozen, updateState])

  const handleFireworks = useCallback(() => {
    playFOHSound('celebrate', state.soundEnabled)
    channelRef.current?.postMessage({ type: 'TRIGGER_FIREWORKS' })
    localStorage.setItem(`${FOH_STORAGE_KEY}_FX`, String(Date.now()))
    logEvent('Kích hoạt pháo hoa vinh danh trên màn hình chiếu LED')
  }, [logEvent, state.soundEnabled])

  const handleToggleHidden = useCallback(() => {
    updateState(
      (prev) => ({ ...prev, isHidden: !prev.isHidden }),
      {
        sfx: 'curtain',
        forceSyncDisplay: true,
        log: state.isHidden
          ? 'Mở màn chờ — Hiện bảng điểm trên LED'
          : 'Ẩn bảng điểm — Bật màn hình chờ BGK',
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
          ? 'Đã mở khóa Freeze & Công bố điểm mới lên màn hình LED'
          : 'Đã đóng băng màn LED (Chế độ nhập điểm nháp tại FOH)',
      }
    )
  }, [state.isFrozen, updateState])

  // Stage Score Updates (Strictly clamped 0..50 per stage, sum 0..150)
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
        log: `Đội #${target?.msbc} ${target?.name} — Chặng ${stageNum}: ${clamped}/50đ`,
      }
    )
  }

  const adjustTeamStageScore = (teamId: string, stageNum: 1 | 2 | 3, delta: number) => {
    const target = state.teams.find((t) => t.id === teamId)
    if (!target) return
    const stageKey = `stage${stageNum}` as 'stage1' | 'stage2' | 'stage3'
    const currentStageVal = target[stageKey]
    setTeamStageScore(teamId, stageNum, currentStageVal + delta)
  }

  // Booth Voting Updates (End of Show)
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
        log: `Voting Gian hàng — Đội #${target?.msbc} ${target?.name}: ${cleanVotes} phiếu`,
      }
    )
  }

  const adjustTeamBoothVotes = (teamId: string, delta: number) => {
    const target = state.teams.find((t) => t.id === teamId)
    if (!target) return
    setTeamBoothVotes(teamId, target.boothVotes + delta)
  }

  // Optional 1-click sync from Booth Voting API when online
  const handleSyncFromBoothDb = async () => {
    setSyncingDb(true)
    try {
      const res = await fetch('/api/admin/booth-voting', { cache: 'no-store' })
      if (!res.ok) {
        logEvent('Không thể đồng bộ từ DB (Cần đăng nhập Admin hoặc đang Offline)')
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
            log: 'Đã đồng bộ số phiếu bình chọn Gian hàng của Top 5 từ Cơ sở dữ liệu',
          }
        )
      }
    } catch {
      logEvent('Máy FOH đang ở chế độ Offline — giữ nguyên dữ liệu cục bộ')
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
    logEvent('Mở cửa sổ Màn Hình Chiếu (/foh/display)')
  }

  const exportBackupJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(state, null, 2))
    const a = document.createElement('a')
    a.href = dataStr
    a.download = `gend-arena-top5-foh-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
    a.click()
    logEvent('Đã xuất file JSON sao lưu bảng điểm Top 5')
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
            log: `Đã nạp file backup (${parsed.teams.length} đội)`,
          })
        }
      } catch {
        logEvent('File JSON không hợp lệ')
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

  // Admin table order: either ranked (#1..#5) or fixed by MSBC (#01..#05) for fast data entry
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
    <div className="relative min-h-screen bg-surface-base text-text-primary pb-12 select-none overflow-hidden">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <DotGridBackground />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[650px] h-96 rounded-full bg-brand-cyan/5 blur-[150px]" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 border-b border-surface-border bg-surface-base/85 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <Link
                  href="/foh"
                  className="inline-flex items-center gap-1.5 text-xs font-mono text-text-secondary hover:text-brand-cyan transition-colors mr-1"
                >
                  <ArrowLeft className="size-3.5" />
                  Cổng FOH
                </Link>

                <Image
                  src="/logo/gendarena-logo.png"
                  alt="GenD Arena"
                  width={22}
                  height={22}
                  className="object-contain"
                />

                <Badge variant="warning" size="sm">
                  FOH ADMIN • TOP 5 CHUNG KẾT
                </Badge>

                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono border ${
                    displayOnline
                      ? 'bg-semantic-success/15 text-semantic-success border-semantic-success/40'
                      : 'bg-surface-raised text-text-tertiary border-surface-border'
                  }`}
                >
                  <Radio className="size-3" />
                  {displayOnline
                    ? 'Màn chiếu LED đang kết nối (Live)'
                    : 'Chưa mở cửa sổ Màn chiếu (/foh/display)'}
                </span>

                {state.isFrozen && (
                  <Badge variant="info" size="sm">
                    Đang đóng băng LED (Chế độ nhập nháp)
                  </Badge>
                )}

                {state.isHidden && (
                  <Badge variant="danger" size="sm">
                    Đang che màn hình chờ BGK
                  </Badge>
                )}
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                Bàn Điều Khiển Điểm Số FOH — {state.title}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  updateState((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }), {
                    recordUndo: false,
                  })
                }
                leftIcon={
                  state.soundEnabled ? (
                    <Volume2 className="size-4 text-brand-cyan" />
                  ) : (
                    <VolumeX className="size-4 text-text-tertiary" />
                  )
                }
              >
                {state.soundEnabled ? 'Âm thanh: Bật' : 'Âm thanh: Tắt'}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleUndo}
                disabled={history.length === 0}
                leftIcon={<Undo2 className="size-4" />}
              >
                Hoàn tác ({history.length})
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={openProjectorWindow}
                leftIcon={<Monitor className="size-4 text-brand-cyan" />}
              >
                Mở Cửa Sổ LED Rời
              </Button>
            </div>
          </div>

          {/* Display Mode Switcher: 3-Stage Competition vs End-of-Show Booth Voting */}
          <div className="flex flex-wrap items-center justify-between gap-4 mt-5 pt-4 border-t border-surface-border">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono uppercase text-text-tertiary mr-1">
                Chế độ trình chiếu LED:
              </span>
              <button
                type="button"
                onClick={() => handleSwitchDisplayView('STAGES')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold font-display transition-colors flex items-center gap-2 cursor-pointer border ${
                  state.displayView === 'STAGES'
                    ? 'bg-brand-cyan text-text-on-brand border-brand-cyan font-bold'
                    : 'bg-surface-raised text-text-secondary hover:text-text-primary border-surface-border'
                }`}
              >
                <Layers className="size-4" />
                <span>1. Điểm Chuyên Môn 3 Chặng (Tối đa 150 điểm)</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchDisplayView('BOOTH_VOTING')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold font-display transition-colors flex items-center gap-2 cursor-pointer border ${
                  state.displayView === 'BOOTH_VOTING'
                    ? 'bg-brand-cyan text-text-on-brand border-brand-cyan font-bold'
                    : 'bg-surface-raised text-text-secondary hover:text-text-primary border-surface-border'
                }`}
              >
                <Vote className="size-4" />
                <span>2. Bảng Điểm Voting Gian Hàng (Cuối Chương Trình)</span>
              </button>
            </div>

            {state.displayView === 'STAGES' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs font-mono text-text-tertiary mr-1">
                  Chặng đang chiếu:
                </span>
                {([1, 2, 3, 'ALL'] as ActiveStageKey[]).map((st) => (
                  <button
                    key={String(st)}
                    type="button"
                    onClick={() => handleSelectActiveStage(st)}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors cursor-pointer border ${
                      state.activeStage === st
                        ? 'bg-brand-navy border-brand-cyan text-brand-cyan font-bold'
                        : 'bg-surface-raised border-surface-border text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {st === 'ALL'
                      ? 'Tổng Kết 3 Chặng (150đ)'
                      : `Chặng ${st} (50đ)`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
        {/* Stage Control Deck */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button
            type="button"
            onClick={handleSortNow}
            className="flex items-center justify-between p-4 rounded-xl bg-brand-navy border border-brand-cyan/50 hover:bg-brand-navy-light transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <ArrowUpDown className="size-5 text-brand-cyan shrink-0" />
              <div>
                <div className="font-display text-sm font-semibold text-text-primary">
                  Xếp Hạng Điểm (Cao → Thấp)
                </div>
                <div className="text-xs text-text-secondary">Đồng bộ thứ hạng #1–#5</div>
              </div>
            </div>
            <kbd className="px-2 py-1 text-xs font-mono rounded bg-surface-base border border-surface-border text-brand-cyan">
              S
            </kbd>
          </button>

          <button
            type="button"
            onClick={handleToggleFreeze}
            className={`flex items-center justify-between p-4 rounded-xl border transition-colors cursor-pointer text-left ${
              state.isFrozen
                ? 'bg-semantic-success/15 border-semantic-success text-text-primary'
                : 'bg-surface-raised border-surface-border hover:border-surface-border-strong'
            }`}
          >
            <div className="flex items-center gap-3">
              {state.isFrozen ? (
                <Unlock className="size-5 text-semantic-success shrink-0" />
              ) : (
                <Lock className="size-5 text-brand-cyan shrink-0" />
              )}
              <div>
                <div className="font-display text-sm font-semibold text-text-primary">
                  {state.isFrozen ? 'Công Bố Điểm Lên LED' : 'Đóng Băng LED (Nhập Nháp)'}
                </div>
                <div className="text-xs text-text-secondary">
                  {state.isFrozen ? 'Đẩy điểm mới nhất ra màn chiếu' : 'Giữ điểm cũ trên LED khi sửa'}
                </div>
              </div>
            </div>
            <kbd className="px-2 py-1 text-xs font-mono rounded bg-surface-base border border-surface-border text-text-secondary">
              F
            </kbd>
          </button>

          <button
            type="button"
            onClick={handleToggleHidden}
            className={`flex items-center justify-between p-4 rounded-xl border transition-colors cursor-pointer text-left ${
              state.isHidden
                ? 'bg-semantic-danger/15 border-semantic-danger text-text-primary'
                : 'bg-surface-raised border-surface-border hover:border-surface-border-strong'
            }`}
          >
            <div className="flex items-center gap-3">
              {state.isHidden ? (
                <Eye className="size-5 text-semantic-danger shrink-0" />
              ) : (
                <EyeOff className="size-5 text-semantic-warning shrink-0" />
              )}
              <div>
                <div className="font-display text-sm font-semibold text-text-primary">
                  {state.isHidden ? 'Hiện Lại Bảng Điểm LED' : 'Ẩn Bảng Điểm (Màn Chờ)'}
                </div>
                <div className="text-xs text-text-secondary">
                  {state.isHidden ? 'Đang che màn hình chờ BGK' : 'Che điểm tạo kịch tính sân khấu'}
                </div>
              </div>
            </div>
            <kbd className="px-2 py-1 text-xs font-mono rounded bg-surface-base border border-surface-border text-text-secondary">
              H
            </kbd>
          </button>

          <button
            type="button"
            onClick={handleFireworks}
            className="flex items-center justify-between p-4 rounded-xl bg-surface-raised border border-accent-violet/50 hover:border-accent-violet transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <Sparkles className="size-5 text-accent-violet shrink-0" />
              <div>
                <div className="font-display text-sm font-semibold text-text-primary">
                  Bắn Pháo Hoa Vinh Danh
                </div>
                <div className="text-xs text-text-secondary">Chúc mừng Quán quân trên màn LED</div>
              </div>
            </div>
            <kbd className="px-2 py-1 text-xs font-mono rounded bg-surface-base border border-surface-border text-accent-violet">
              C
            </kbd>
          </button>
        </section>

        {/* Main Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2/3: Score Entry Area */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-overlay border border-surface-border rounded-xl px-5 py-3.5">
              <div className="flex items-center gap-2.5">
                {state.displayView === 'STAGES' ? (
                  <>
                    <Trophy className="size-4 text-yellow-400" />
                    <h2 className="font-display text-sm font-semibold text-text-primary">
                      NHẬP ĐIỂM 3 CHẶNG THI (TỐI ĐA 50 ĐIỂM / CHẶNG • TỔNG 150 ĐIỂM)
                    </h2>
                  </>
                ) : (
                  <>
                    <Vote className="size-4 text-brand-cyan" />
                    <h2 className="font-display text-sm font-semibold text-text-primary">
                      NHẬP DỮ LIỆU VOTING GIAN HÀNG ({totalBoothVotes.toLocaleString('vi-VN')} PHIẾU)
                    </h2>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-text-tertiary">Thứ tự danh sách nhập:</span>
                <button
                  type="button"
                  onClick={() => setAdminViewOrder('MSBC')}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                    adminViewOrder === 'MSBC'
                      ? 'bg-brand-cyan text-text-on-brand font-bold'
                      : 'bg-surface-raised text-text-secondary border border-surface-border'
                  }`}
                >
                  Cố định Mã (#01 → #05)
                </button>
                <button
                  type="button"
                  onClick={() => setAdminViewOrder('RANK')}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                    adminViewOrder === 'RANK'
                      ? 'bg-brand-cyan text-text-on-brand font-bold'
                      : 'bg-surface-raised text-text-secondary border border-surface-border'
                  }`}
                >
                  Theo Hạng (#1 → #5)
                </button>
              </div>
            </div>

            {/* MODE 1: 3-STAGE SCORING CARDS (MAX 50 PER STAGE, TOTAL 150) */}
            {state.displayView === 'STAGES' ? (
              <div className="space-y-4">
                {displayedAdminTeams.map((team) => {
                  const rankDiff = team.prevRank - team.rank
                  const isTop1 = team.rank === 1 && team.score > 0
                  const isTop2 = team.rank === 2 && team.score > 0
                  const isTop3 = team.rank === 3 && team.score > 0

                  const rowBorder = isTop1
                    ? 'border-l-4 border-l-yellow-400'
                    : isTop2
                    ? 'border-l-4 border-l-slate-300'
                    : isTop3
                    ? 'border-l-4 border-l-amber-500'
                    : ''

                  const totalPct = Math.min(100, Math.round((team.score / MAX_TOTAL_SCORE) * 100))

                  return (
                    <div
                      key={team.id}
                      className={`rounded-xl border border-surface-border bg-surface-raised p-4 transition-colors hover:border-surface-border-strong space-y-4 ${rowBorder}`}
                    >
                      {/* Top row: Team Identity + Total Score / 150 */}
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-[240px] flex-1">
                          <div className="relative size-14 rounded-lg overflow-hidden border border-surface-border bg-surface-overlay shrink-0">
                            <Image
                              src={team.posterUrl}
                              alt={team.name}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <RankBadge rank={team.rank} />
                              <span className="px-2 py-0.5 rounded bg-brand-cyan/10 border border-brand-cyan/30 font-mono text-xs font-bold text-brand-cyan">
                                Mã #{team.msbc}
                              </span>
                              {rankDiff > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-xs font-mono text-semantic-success">
                                  <TrendingUp className="size-3" />+{rankDiff}
                                </span>
                              )}
                              {rankDiff < 0 && (
                                <span className="inline-flex items-center gap-0.5 text-xs font-mono text-semantic-danger">
                                  <TrendingDown className="size-3" />
                                  {rankDiff}
                                </span>
                              )}
                            </div>

                            <h3 className="font-display text-lg font-bold text-text-primary truncate">
                              {team.name}
                            </h3>

                            <p className="text-xs text-text-secondary truncate">
                              {team.institution} • <span className="text-text-tertiary">{team.category}</span>
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[11px] font-mono uppercase text-text-tertiary">
                            Tổng Điểm 3 Chặng
                          </div>
                          <div className="flex items-baseline justify-end gap-1">
                            <span className="font-mono text-3xl font-bold text-brand-cyan tabular-nums">
                              {team.score.toLocaleString('vi-VN')}
                            </span>
                            <span className="font-mono text-sm text-text-tertiary">
                              / {MAX_TOTAL_SCORE}
                            </span>
                          </div>
                          <div className="w-36 h-1.5 rounded-full bg-surface-overlay overflow-hidden mt-1.5 ml-auto">
                            <div
                              className="h-full rounded-full bg-brand-cyan transition-all duration-300"
                              style={{ width: `${totalPct}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Bottom row: 3 Stage Input Columns (50 pts max each) */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-surface-border">
                        {([1, 2, 3] as const).map((stageNum) => {
                          const stageKey = `stage${stageNum}` as 'stage1' | 'stage2' | 'stage3'
                          const stageVal = team[stageKey]
                          const stageLabel =
                            stageNum === 1
                              ? state.stageNames.s1
                              : stageNum === 2
                              ? state.stageNames.s2
                              : state.stageNames.s3
                          const isCurrentActive = state.activeStage === stageNum

                          return (
                            <div
                              key={stageNum}
                              className={`p-3 rounded-lg border transition-colors ${
                                isCurrentActive
                                  ? 'bg-surface-overlay border-brand-cyan/60'
                                  : 'bg-surface-overlay/60 border-surface-border'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-display text-xs font-semibold text-text-primary">
                                  {stageLabel}
                                </span>
                                <span className="font-mono text-xs text-brand-cyan font-bold">
                                  {stageVal} / {MAX_STAGE_SCORE}đ
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 mb-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={MAX_STAGE_SCORE}
                                  step="0.5"
                                  value={stageVal}
                                  onChange={(e) => {
                                    const val =
                                      e.target.value === '' ? 0 : parseFloat(e.target.value)
                                    setTeamStageScore(team.id, stageNum, val)
                                  }}
                                  className="bg-surface-raised border border-surface-border rounded-md h-9 w-full px-2.5 font-mono text-sm font-bold text-text-primary focus:outline-none focus:border-brand-cyan"
                                />
                                <button
                                  type="button"
                                  onClick={() => setTeamStageScore(team.id, stageNum, 0)}
                                  className="h-9 px-2 rounded-md bg-surface-raised border border-surface-border text-[11px] font-mono text-text-tertiary hover:text-semantic-danger cursor-pointer"
                                  title="Đặt chặng này về 0"
                                >
                                  0đ
                                </button>
                              </div>

                              {/* Quick Stage Adjusters */}
                              <div className="grid grid-cols-5 gap-1">
                                {[-5, -1, +1, +5, +10].map((d) => (
                                  <button
                                    key={d}
                                    type="button"
                                    onClick={() => adjustTeamStageScore(team.id, stageNum, d)}
                                    className={`py-1 rounded font-mono text-[11px] font-semibold transition-colors cursor-pointer border ${
                                      d > 0
                                        ? 'bg-semantic-success/10 hover:bg-semantic-success/20 text-semantic-success border-semantic-success/30'
                                        : 'bg-semantic-danger/10 hover:bg-semantic-danger/20 text-semantic-danger border-semantic-danger/30'
                                    }`}
                                  >
                                    {d > 0 ? `+${d}` : d}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* MODE 2: END-OF-SHOW BOOTH VOTING INPUT & LEADERBOARD */
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-brand-navy/40 border border-brand-cyan/30 flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="font-display text-sm font-semibold text-text-primary">
                      Chế Độ Trình Chiếu Kết Quả Bình Chọn Gian Hàng (Cuối Chương Trình)
                    </div>
                    <div className="text-xs text-text-secondary">
                      Nhập trực tiếp số phiếu kiểm đếm hoặc bấm nút đồng bộ từ cơ sở dữ liệu QR Gian hàng.
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSyncFromBoothDb}
                    isLoading={syncingDb}
                    leftIcon={<Database className="size-4 text-brand-cyan" />}
                  >
                    Lấy Số Phiếu Tự Động Từ DB
                  </Button>
                </div>

                {displayedAdminTeams.map((team) => {
                  const pct =
                    totalBoothVotes > 0
                      ? ((team.boothVotes / totalBoothVotes) * 100).toFixed(1)
                      : '0.0'

                  return (
                    <div
                      key={team.id}
                      className="rounded-xl border border-surface-border bg-surface-raised p-4 transition-colors hover:border-surface-border-strong"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5 min-w-[240px] flex-1">
                          <div className="relative size-14 rounded-lg overflow-hidden border border-surface-border bg-surface-overlay shrink-0">
                            <Image
                              src={team.posterUrl}
                              alt={team.name}
                              fill
                              sizes="56px"
                              className="object-cover"
                            />
                          </div>

                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <RankBadge rank={team.boothRank} />
                              <span className="px-2 py-0.5 rounded bg-brand-cyan/10 border border-brand-cyan/30 font-mono text-xs font-bold text-brand-cyan">
                                Gian hàng #{team.msbc}
                              </span>
                              <span className="text-xs font-mono text-text-tertiary">
                                ({pct}% tổng phiếu)
                              </span>
                            </div>

                            <h3 className="font-display text-lg font-bold text-text-primary truncate">
                              {team.name}
                            </h3>
                            <p className="text-xs text-text-secondary truncate">
                              {team.institution}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-right pr-3 border-r border-surface-border">
                            <div className="text-[10px] font-mono uppercase text-text-tertiary">
                              Số Phiếu Hợp Lệ
                            </div>
                            <div className="font-mono text-2xl font-bold text-brand-cyan tabular-nums">
                              {team.boothVotes.toLocaleString('vi-VN')}
                            </div>
                          </div>

                          {[-10, -1, +1, +5, +10, +50].map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => adjustTeamBoothVotes(team.id, d)}
                              className={`h-9 px-2.5 rounded-md font-mono text-xs font-semibold transition-colors cursor-pointer border ${
                                d > 0
                                  ? 'bg-semantic-success/10 hover:bg-semantic-success/20 text-semantic-success border-semantic-success/30'
                                  : 'bg-semantic-danger/10 hover:bg-semantic-danger/20 text-semantic-danger border-semantic-danger/30'
                              }`}
                            >
                              {d > 0 ? `+${d}` : d}
                            </button>
                          ))}

                          <div className="flex items-center gap-1.5 ml-1">
                            <input
                              type="number"
                              min={0}
                              value={team.boothVotes}
                              onChange={(e) => {
                                const val =
                                  e.target.value === '' ? 0 : parseInt(e.target.value, 10)
                                setTeamBoothVotes(team.id, val)
                              }}
                              className="bg-surface-overlay border border-surface-border rounded-md h-9 w-28 px-3 font-mono text-sm font-bold text-text-primary focus:outline-none focus:border-brand-cyan"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right 1/3: Live Stage Monitor + Settings & Offline Backup */}
          <div className="space-y-5">
            {/* Live LED Monitor Preview */}
            <div className="rounded-xl border border-surface-border bg-surface-overlay p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Monitor className="size-4 text-brand-cyan" />
                  <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-text-primary">
                    Màn Chiếu LED Đang Hiển Thị
                  </h3>
                </div>
                <Badge variant={ledSnapshot.isHidden ? 'danger' : 'success'} size="sm">
                  {ledSnapshot.isHidden
                    ? 'Đang Che Màn Chờ'
                    : ledSnapshot.displayView === 'BOOTH_VOTING'
                    ? 'Đang Chiếu Voting Gian Hàng'
                    : 'Đang Chiếu Điểm 3 Chặng'}
                </Badge>
              </div>

              <div className="space-y-2">
                {rankedLedTeams.map((t) => {
                  const isVoting = ledSnapshot.displayView === 'BOOTH_VOTING'
                  const r = isVoting ? t.boothRank : t.rank
                  return (
                    <div
                      key={t.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-raised border border-surface-border text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono font-bold text-brand-cyan w-6">#{r}</span>
                        <span className="font-mono text-[11px] text-text-tertiary">[{t.msbc}]</span>
                        <span className="font-display font-semibold text-text-primary truncate">
                          {t.name}
                        </span>
                      </div>
                      {isVoting ? (
                        <span className="font-mono font-bold text-brand-cyan tabular-nums">
                          {t.boothVotes.toLocaleString('vi-VN')} phiếu
                        </span>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-[11px] text-text-tertiary">
                            ({t.stage1}+{t.stage2}+{t.stage3})
                          </span>
                          <span className="font-mono font-bold text-text-primary tabular-nums">
                            {t.score}/150
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Stage Configuration & Offline Backup */}
            <div className="rounded-xl border border-surface-border bg-surface-overlay p-5 space-y-4">
              <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-text-primary">
                Cấu Hình Tên Chặng &amp; Màn Chiếu
              </h3>

              <div className="grid grid-cols-3 gap-2">
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
                    className="bg-surface-raised border border-surface-border rounded-md h-9 w-full px-2.5 text-xs text-text-primary focus:outline-none focus:border-brand-cyan mt-1"
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
                    className="bg-surface-raised border border-surface-border rounded-md h-9 w-full px-2.5 text-xs text-text-primary focus:outline-none focus:border-brand-cyan mt-1"
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
                    className="bg-surface-raised border border-surface-border rounded-md h-9 w-full px-2.5 text-xs text-text-primary focus:outline-none focus:border-brand-cyan mt-1"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-text-secondary">Thông điệp màn hình chờ BGK</label>
                <input
                  value={state.hiddenMessage}
                  onChange={(e) =>
                    updateState((prev) => ({ ...prev, hiddenMessage: e.target.value }), {
                      recordUndo: false,
                    })
                  }
                  className="bg-surface-raised border border-surface-border rounded-md h-9 w-full px-3 text-xs text-text-primary focus:outline-none focus:border-brand-cyan"
                />
              </div>

              <div className="pt-1 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={exportBackupJson}
                    leftIcon={<Download className="size-4" />}
                  >
                    Xuất JSON
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    leftIcon={<Upload className="size-4" />}
                  >
                    Nạp JSON
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={importBackupJson}
                    className="hidden"
                  />
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center text-semantic-danger hover:bg-semantic-danger/10"
                  onClick={() =>
                    updateState(() => INITIAL_FOH_STATE, {
                      forceSyncDisplay: true,
                      log: 'Đã đặt lại bảng điểm Top 5 về 0',
                    })
                  }
                  leftIcon={<RotateCcw className="size-4" />}
                >
                  Đặt lại toàn bộ điểm số về 0
                </Button>
              </div>
            </div>

            {/* FOH Operation Log */}
            <div className="rounded-xl border border-surface-border bg-surface-overlay p-5 space-y-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-semantic-success" />
                <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-text-primary">
                  Nhật Ký Thao Tác FOH
                </h3>
              </div>
              <div className="max-h-36 overflow-y-auto space-y-1 text-xs font-mono text-text-secondary">
                {actionLog.length === 0 ? (
                  <div className="text-text-tertiary">Sẵn sàng ghi nhận thao tác...</div>
                ) : (
                  actionLog.map((item, idx) => <div key={idx}>{item}</div>)
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
