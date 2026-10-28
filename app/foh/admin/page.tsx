'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import DotGridBackground from '@/components/dot-grid-background'
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
  FOHTimerPreset,
  FOH_TIMER_PRESETS,
  formatTimerSeconds,
  FOHTeamMember,
  FOHStage3PickerState,
  INITIAL_STAGE3_PICKER,
  OFFICIAL_TOP5_FINALIST_TEAMS,
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
  Timer,
  Play,
  Pause,
  Plus,
  Minus,
  Clock,
  Bell,
  BellOff,
  Dices,
  UserPlus,
  Trash2,
  CheckCircle2,
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
  const [adminActiveTab, setAdminActiveTab] = useState<FOHDisplayView>('STAGES')
  const [newMemberName, setNewMemberName] = useState('')

  // Stage Countdown Timer state for FOH Console
  const [adminTimerSeconds, setAdminTimerSeconds] = useState(
    state.timer?.remainingSeconds ?? 300
  )
  const [customMin, setCustomMin] = useState('5')
  const [customSec, setCustomSec] = useState('00')
  const lastAdminSfxSecRef = useRef<number | null>(null)

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

        // Ensure members are present on teams from default roster if missing
        const teamsWithMembers = (parsed.teams || []).map((t) => {
          const defaultTeam = OFFICIAL_TOP5_FINALIST_TEAMS.find((dt) => dt.id === t.id)
          return {
            ...t,
            members: t.members && t.members.length > 0 ? t.members : defaultTeam?.members || [],
          }
        })

        const normalized: FOHState = {
          ...INITIAL_FOH_STATE,
          ...parsed,
          displayView: view,
          activeStage: parsed.activeStage || 1,
          stageNames: parsed.stageNames || INITIAL_FOH_STATE.stageNames,
          timer: parsed.timer || INITIAL_FOH_STATE.timer,
          stage3Picker: parsed.stage3Picker || INITIAL_STAGE3_PICKER,
          autoSortDisplay: parsed.autoSortDisplay ?? true,
          teams: syncTeamRanks(teamsWithMembers, parsed.autoSortDisplay ?? true, view),
        }
        setState(normalized)
        setAdminActiveTab(view)
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
            view === 'TIMER'
              ? 'Chiếu: Đồng Hồ Sân Khấu Fullscreen'
              : view === 'STAGE3_PICKER'
              ? 'Chiếu: Bốc Thăm Vòng 3 Fullscreen'
              : view === 'STAGES'
              ? 'Chiếu: Điểm 3 Chặng (150đ)'
              : 'Chiếu: Bảng Voting Gian Hàng',
        }
      )
    },
    [state.isFrozen, updateState]
  )

  // Synchronized Drift-Free Countdown Timer Loop in Admin
  useEffect(() => {
    const timer = state.timer
    if (!timer) return

    if (timer.mode !== 'RUNNING' || !timer.targetTimestamp) {
      setAdminTimerSeconds(timer.remainingSeconds)
      lastAdminSfxSecRef.current = null
      return
    }

    const tick = () => {
      const rem = Math.max(0, Math.ceil((timer.targetTimestamp! - Date.now()) / 1000))
      setAdminTimerSeconds(rem)

      if (state.soundEnabled && timer.soundEnabled) {
        if (rem === 60 && lastAdminSfxSecRef.current !== 60) {
          lastAdminSfxSecRef.current = 60
          playFOHSound('timer_warning', true)
        } else if (rem === 30 && lastAdminSfxSecRef.current !== 30) {
          lastAdminSfxSecRef.current = 30
          playFOHSound('timer_warning', true)
        } else if (rem <= 5 && rem >= 1 && lastAdminSfxSecRef.current !== rem) {
          lastAdminSfxSecRef.current = rem
          playFOHSound('timer_countdown', true)
        } else if (rem === 0 && lastAdminSfxSecRef.current !== 0) {
          lastAdminSfxSecRef.current = 0
          playFOHSound('times_up', true)

          updateState(
            (prev) => ({
              ...prev,
              timer: {
                ...prev.timer,
                mode: 'STOPPED',
                remainingSeconds: 0,
                targetTimestamp: null,
              },
            }),
            {
              sfx: 'times_up',
              log: `HẾT GIỜ THI ĐẤU: ${prev.timer.roundLabel}`,
              recordUndo: false,
            }
          )
        }
      }
    }

    tick()
    const interval = setInterval(tick, 200)
    return () => clearInterval(interval)
  }, [state.timer, state.soundEnabled, updateState])

  const handleStartTimer = useCallback(() => {
    const currentRem =
      state.timer.remainingSeconds > 0
        ? state.timer.remainingSeconds
        : state.timer.totalSeconds
    updateState(
      (prev) => ({
        ...prev,
        timer: {
          ...prev.timer,
          mode: 'RUNNING',
          targetTimestamp: Date.now() + currentRem * 1000,
          remainingSeconds: currentRem,
        },
      }),
      {
        sfx: 'publish',
        log: `Bắt đầu tính giờ (${currentRem}s) - ${state.timer.roundLabel}`,
        recordUndo: false,
      }
    )
  }, [state.timer, updateState])

  const handlePauseTimer = useCallback(() => {
    const currentRem = adminTimerSeconds
    updateState(
      (prev) => ({
        ...prev,
        timer: {
          ...prev.timer,
          mode: 'PAUSED',
          targetTimestamp: null,
          remainingSeconds: currentRem,
        },
      }),
      {
        sfx: 'curtain',
        log: `Tạm dừng đồng hồ ở ${currentRem}s`,
        recordUndo: false,
      }
    )
  }, [adminTimerSeconds, updateState])

  const handleResetTimer = useCallback(() => {
    updateState(
      (prev) => ({
        ...prev,
        timer: {
          ...prev.timer,
          mode: 'STOPPED',
          targetTimestamp: null,
          remainingSeconds: prev.timer.totalSeconds,
        },
      }),
      {
        sfx: 'sort',
        log: `Reset đồng hồ về ${state.timer.totalSeconds}s`,
        recordUndo: false,
      }
    )
  }, [state.timer.totalSeconds, updateState])

  const handleAdjustTimer = useCallback(
    (deltaSec: number) => {
      updateState(
        (prev) => {
          const currentRem =
            prev.timer.mode === 'RUNNING' && prev.timer.targetTimestamp
              ? Math.max(0, Math.ceil((prev.timer.targetTimestamp - Date.now()) / 1000))
              : prev.timer.remainingSeconds
          const newRem = Math.max(0, currentRem + deltaSec)
          return {
            ...prev,
            timer: {
              ...prev.timer,
              remainingSeconds: newRem,
              targetTimestamp:
                prev.timer.mode === 'RUNNING' ? Date.now() + newRem * 1000 : null,
            },
          }
        },
        {
          sfx: 'score',
          log: `Điều chỉnh đồng hồ: ${deltaSec > 0 ? '+' : ''}${deltaSec}s`,
          recordUndo: false,
        }
      )
    },
    [updateState]
  )

  const handleSelectPreset = useCallback(
    (preset: FOHTimerPreset) => {
      updateState(
        (prev) => ({
          ...prev,
          timer: {
            ...prev.timer,
            mode: 'STOPPED',
            totalSeconds: preset.durationSeconds,
            remainingSeconds: preset.durationSeconds,
            targetTimestamp: null,
            roundLabel: preset.label,
          },
        }),
        {
          sfx: 'sort',
          log: `Set timeline mẫu: ${preset.label} (${preset.durationSeconds}s)`,
          recordUndo: false,
        }
      )
    },
    [updateState]
  )

  const handleApplyCustomTimer = useCallback(() => {
    const mins = parseInt(customMin || '0', 10)
    const secs = parseInt(customSec || '0', 10)
    const total = Math.max(5, mins * 60 + secs)
    updateState(
      (prev) => ({
        ...prev,
        timer: {
          ...prev.timer,
          mode: 'STOPPED',
          totalSeconds: total,
          remainingSeconds: total,
          targetTimestamp: null,
          roundLabel: `Tùy chỉnh: ${mins}m ${secs}s`,
        },
      }),
      {
        sfx: 'sort',
        log: `Set đồng hồ tùy chỉnh: ${total}s`,
        recordUndo: false,
      }
    )
  }, [customMin, customSec, updateState])

  const handleSelectTimerTeam = useCallback(
    (teamId: string | null) => {
      const team = state.teams.find((t) => t.id === teamId)
      updateState(
        (prev) => ({
          ...prev,
          timer: {
            ...prev.timer,
            activeTeamId: teamId,
            roundLabel: team ? `Phần thi: ${team.name}` : 'Toàn bộ sân khấu',
          },
        }),
        {
          sfx: 'score',
          log: team ? `Chọn đội thi cho đồng hồ: ${team.name}` : 'Đồng hồ sân khấu chung',
          recordUndo: false,
        }
      )
    },
    [state.teams, updateState]
  )

  // Stage 3 Member Picker Handlers
  const handleSelectStage3Team = useCallback(
    (teamId: string) => {
      const team = state.teams.find((t) => t.id === teamId)
      updateState(
        (prev) => ({
          ...prev,
          stage3Picker: {
            ...prev.stage3Picker,
            teamId,
            chosenMemberId: null,
            chosenMemberName: null,
            chosenMemberRole: null,
            chosenMemberInstitution: null,
            isRolling: false,
            completedAt: null,
          },
        }),
        {
          sfx: 'score',
          log: `Vòng 3: Chọn đội bốc thăm ${team?.name}`,
          recordUndo: false,
        }
      )
    },
    [state.teams, updateState]
  )

  const handleToggleMemberActive = useCallback(
    (teamId: string, memberId: string) => {
      updateState(
        (prev) => ({
          ...prev,
          teams: prev.teams.map((t) => {
            if (t.id !== teamId) return t
            return {
              ...t,
              members: (t.members || []).map((m) => {
                if (m.id !== memberId) return m
                return { ...m, activeForSelection: m.activeForSelection === false ? true : false }
              }),
            }
          }),
        }),
        { recordUndo: false }
      )
    },
    [updateState]
  )

  const handleAddMember = useCallback(
    (teamId: string) => {
      if (!newMemberName.trim()) return
      const team = state.teams.find((t) => t.id === teamId)
      const newMember: FOHTeamMember = {
        id: `custom-${Date.now()}`,
        name: newMemberName.trim(),
        role: 'member',
        institution: team?.institution || '',
        activeForSelection: true,
      }
      updateState(
        (prev) => ({
          ...prev,
          teams: prev.teams.map((t) => {
            if (t.id !== teamId) return t
            return {
              ...t,
              members: [...(t.members || []), newMember],
            }
          }),
        }),
        { log: `Thêm thành viên ${newMember.name} vào ${team?.name}`, recordUndo: false }
      )
      setNewMemberName('')
    },
    [newMemberName, state.teams, updateState]
  )

  const handleDeleteMember = useCallback(
    (teamId: string, memberId: string) => {
      updateState(
        (prev) => ({
          ...prev,
          teams: prev.teams.map((t) => {
            if (t.id !== teamId) return t
            return {
              ...t,
              members: (t.members || []).filter((m) => m.id !== memberId),
            }
          }),
        }),
        { recordUndo: false }
      )
    },
    [updateState]
  )

  const handleRollStage3Member = useCallback(
    (teamId?: string) => {
      const targetTeamId = teamId || state.stage3Picker?.teamId || state.teams[0].id
      const team = state.teams.find((t) => t.id === targetTeamId)
      if (!team || !team.members || team.members.length === 0) return

      const candidates = team.members.filter((m) => m.activeForSelection !== false)
      if (candidates.length === 0) return

      const chosen = candidates[Math.floor(Math.random() * candidates.length)]

      updateState(
        (prev) => ({
          ...prev,
          displayView: 'STAGE3_PICKER',
          stage3Picker: {
            ...prev.stage3Picker,
            isActive: true,
            teamId: targetTeamId,
            chosenMemberId: null,
            chosenMemberName: null,
            chosenMemberRole: null,
            chosenMemberInstitution: null,
            isRolling: true,
            rollStartedAt: Date.now(),
            rollDurationMs: 3800,
          },
        }),
        {
          sfx: 'roulette_tick',
          log: `Bắt đầu quay chọn thành viên Vòng 3: ${team.name}`,
          recordUndo: false,
        }
      )

      let ticks = 0
      const tickInterval = setInterval(() => {
        ticks++
        if (ticks < 22) {
          playFOHSound('roulette_tick', state.soundEnabled)
        }
      }, 150)

      setTimeout(() => {
        clearInterval(tickInterval)
        updateState(
          (prev) => ({
            ...prev,
            stage3Picker: {
              ...prev.stage3Picker,
              isRolling: false,
              chosenMemberId: chosen.id,
              chosenMemberName: chosen.name,
              chosenMemberRole: chosen.role === 'leader' ? 'Trưởng nhóm' : 'Thành viên',
              chosenMemberInstitution: chosen.institution || team.institution,
              completedAt: Date.now(),
            },
          }),
          {
            sfx: 'roulette_win',
            log: `🎉 Vòng 3 chọn đại diện: ${chosen.name} (${team.name})`,
            recordUndo: false,
          }
        )
      }, 3800)
    },
    [state.stage3Picker?.teamId, state.teams, state.soundEnabled, updateState]
  )

  const handleStartStage3PitchTimer = useCallback(
    (teamId: string, memberName: string) => {
      updateState(
        (prev) => ({
          ...prev,
          displayView: 'TIMER',
          timer: {
            ...prev.timer,
            mode: 'RUNNING',
            totalSeconds: 300,
            remainingSeconds: 300,
            targetTimestamp: Date.now() + 300 * 1000,
            activeTeamId: teamId,
            roundLabel: `Chặng 3: Thuyết trình Huy Động Vốn • ${memberName}`,
          },
        }),
        {
          sfx: 'publish',
          log: `Bắt đầu 5 phút thuyết trình Vòng 3: ${memberName}`,
          recordUndo: false,
        }
      )
      setAdminActiveTab('TIMER')
    },
    [updateState]
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

  // Keyboard shortcuts: Space = Timer Start/Pause, S = Sort, C = Celebrate, H = Hide, F = Freeze/Publish, Ctrl+Z = Undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.code === 'Space') {
        e.preventDefault()
        if (state.timer?.mode === 'RUNNING') {
          handlePauseTimer()
        } else {
          handleStartTimer()
        }
        return
      }

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
  }, [
    state.timer?.mode,
    handleStartTimer,
    handlePauseTimer,
    handleSortNow,
    handleFireworks,
    handleToggleHidden,
    handleToggleFreeze,
    handleUndo,
  ])

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
              <span className="text-sm font-bold tracking-wide text-text-primary">
                FOH CONSOLE
              </span>
            </div>

            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                displayOnline
                  ? 'bg-semantic-success/15 text-semantic-success border-semantic-success/40'
                  : 'bg-surface-raised text-text-tertiary border-surface-border'
              }`}
            >
              <Radio className="size-2.5" />
              <span>{displayOnline ? 'LED LIVE' : 'LED OFF'}</span>
            </span>

            {state.isFrozen && (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-500/20 text-brand-cyan border border-brand-cyan/40">
                ĐÓNG BĂNG LED
              </span>
            )}

            {state.isHidden && (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                ĐANG CHE MÀN CHỜ
              </span>
            )}
          </div>

          {/* Center: Presentation Mode Switch (4 Tabs) */}
          <div className="inline-flex p-0.5 rounded-lg bg-surface-base border border-surface-border">
            <button
              type="button"
              onClick={() => {
                setAdminActiveTab('STAGES')
                handleSwitchDisplayView('STAGES')
              }}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                adminActiveTab === 'STAGES'
                  ? 'bg-brand-cyan text-text-on-brand font-bold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Layers className="size-3.5" />
              <span>Điểm 3 Chặng</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAdminActiveTab('TIMER')
                handleSwitchDisplayView('TIMER')
              }}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                adminActiveTab === 'TIMER'
                  ? 'bg-brand-cyan text-text-on-brand font-bold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Timer className="size-3.5" />
              <span>Đồng Hồ</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAdminActiveTab('STAGE3_PICKER')
                handleSwitchDisplayView('STAGE3_PICKER')
              }}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                adminActiveTab === 'STAGE3_PICKER'
                  ? 'bg-brand-cyan text-text-on-brand font-bold'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              <Dices className="size-3.5" />
              <span>Bốc Thăm V3</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAdminActiveTab('BOOTH_VOTING')
                handleSwitchDisplayView('BOOTH_VOTING')
              }}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                adminActiveTab === 'BOOTH_VOTING'
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
              className="px-3 py-1 rounded-md bg-brand-navy border border-brand-cyan/60 text-brand-cyan hover:bg-brand-navy-light text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-[0_0_10px_rgba(0,212,255,0.2)]"
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
                <span className="text-[11px] text-text-tertiary px-2 font-medium">Đang chiếu:</span>
                {([1, 2, 3, 'ALL'] as ActiveStageKey[]).map((st) => (
                  <button
                    key={String(st)}
                    type="button"
                    onClick={() => handleSelectActiveStage(st)}
                    className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
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
        {/* PERSISTENT SLIM TIMER BANNER (When timer is running and user is on another tab) */}
        {state.timer?.mode === 'RUNNING' && adminActiveTab !== 'TIMER' && (
          <div className="flex items-center justify-between px-3.5 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/50 text-xs font-mono shadow-sm">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-bold text-emerald-400">ĐỒNG HỒ ĐANG CHẠY:</span>
              <span className="text-text-primary font-bold">
                {state.teams.find((t) => t.id === state.timer?.activeTeamId)?.name || 'Chung'}
              </span>
              <span className="text-emerald-300 font-bold tracking-wider">
                ({formatTimerSeconds(adminTimerSeconds)})
              </span>
              <span className="text-text-tertiary text-[11px] truncate max-w-xs">{state.timer?.roundLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePauseTimer}
                className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/50 text-amber-300 hover:bg-amber-500/30 font-bold cursor-pointer"
              >
                Tạm Dừng
              </button>
              <button
                type="button"
                onClick={() => setAdminActiveTab('TIMER')}
                className="px-2 py-0.5 rounded bg-brand-navy border border-brand-cyan/60 text-brand-cyan hover:bg-brand-navy-light font-bold cursor-pointer"
              >
                Mở Đồng Hồ &rarr;
              </button>
            </div>
          </div>
        )}
        <div className="grid grid-cols-12 gap-4 flex-1">
          {/* LEFT 9 COLS: HIGH-DENSITY PROFESSIONAL SCORING GRID */}
          <div className="col-span-12 lg:col-span-9 flex flex-col justify-start">
            {adminActiveTab === 'STAGES' && (
              /* PRO-CONSOLE 3-STAGE GRID */
              <div className="rounded-xl border border-surface-border bg-[#0A1120] overflow-hidden shadow-elevation-2">
                {/* Table Header Row */}
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-surface-raised/70 border-b border-surface-border text-[11px] font-semibold text-text-tertiary uppercase tracking-wider font-sans">
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
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[11px] text-brand-cyan font-bold">
                                #{team.msbc}
                              </span>
                              <span className="text-sm font-bold text-text-primary truncate">
                                {team.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  handleSelectStage3Team(team.id)
                                  setAdminActiveTab('STAGE3_PICKER')
                                }}
                                className="p-1 rounded bg-surface-base border border-surface-border text-accent-violet hover:bg-accent-violet/10 cursor-pointer"
                                title="Bốc thăm ngẫu nhiên thành viên Vòng 3"
                              >
                                <Dices className="size-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleSelectTimerTeam(team.id)
                                  setAdminActiveTab('TIMER')
                                }}
                                className="p-1 rounded bg-surface-base border border-surface-border text-brand-cyan hover:bg-brand-cyan/10 cursor-pointer"
                                title="Chạy đồng hồ đếm ngược"
                              >
                                <Timer className="size-3" />
                              </button>
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
            )}

            {adminActiveTab === 'TIMER' && (
              /* PRO-CONSOLE TIMER WORKSPACE */
              <div className="rounded-xl border border-surface-border bg-[#0A1120] p-4 shadow-elevation-2 space-y-4">
                {/* Row 1: Header + Active Team Selector + LED Switch + Sound Test */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-surface-border/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-brand-cyan/15 text-brand-cyan border border-brand-cyan/30">
                      <Timer className="size-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-text-primary tracking-wide">
                          ĐỒNG HỒ SÂN KHẤU (FOH TIMELINE CONSOLE)
                        </span>
                        {state.timer?.mode === 'RUNNING' && (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-mono text-[10px] font-bold">
                            <span className="size-1.5 rounded-full bg-emerald-400 animate-ping" />
                            <span>LIVE</span>
                          </span>
                        )}
                        {state.timer?.mode === 'PAUSED' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-400 font-mono text-[10px] font-bold">
                            <Pause className="size-2.5" />
                            <span>TẠM DỪNG</span>
                          </span>
                        )}
                        {state.timer?.mode === 'STOPPED' && (
                          <span className="px-2 py-0.5 rounded-full bg-surface-raised border border-surface-border text-text-tertiary font-mono text-[10px]">
                            SẴN SÀNG
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Team Selector Pills (Sorted A-Z) */}
                  <div className="flex items-center gap-1 bg-surface-base p-1 rounded-lg border border-surface-border overflow-x-auto">
                    <span className="text-[10px] text-text-tertiary px-1.5 uppercase font-semibold">
                      Đội thi đấu:
                    </span>
                    {[...state.teams]
                      .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
                      .map((t) => {
                        const isSelected = state.timer?.activeTeamId === t.id
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => handleSelectTimerTeam(t.id)}
                            className={`px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                              isSelected
                                ? 'bg-brand-cyan text-text-on-brand font-bold shadow-[0_0_8px_rgba(0,212,255,0.4)]'
                                : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised font-medium'
                            }`}
                          >
                            <span className="font-mono font-bold opacity-80">#{t.msbc}</span>
                            <span className="truncate max-w-[100px] font-sans">{t.name}</span>
                          </button>
                        )
                      })}
                    <button
                      type="button"
                      onClick={() => handleSelectTimerTeam(null)}
                      className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer shrink-0 font-medium ${
                        state.timer?.activeTeamId === null
                          ? 'bg-brand-cyan text-text-on-brand font-bold'
                          : 'text-text-tertiary hover:text-text-secondary'
                      }`}
                    >
                      Chung
                    </button>
                  </div>

                  {/* Direct LED & Audio Test */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSwitchDisplayView(state.displayView === 'TIMER' ? 'STAGES' : 'TIMER')}
                      className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                        state.displayView === 'TIMER'
                          ? 'bg-brand-cyan text-text-on-brand border-brand-cyan'
                          : 'bg-surface-raised border-surface-border text-brand-cyan hover:border-brand-cyan/60'
                      }`}
                    >
                      <Monitor className="size-3" />
                      <span>{state.displayView === 'TIMER' ? 'Đang Chiếu LED' : 'Chiếu Lên LED'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => playFOHSound('times_up', true)}
                      className="px-2 py-1 rounded bg-surface-raised border border-surface-border text-[11px] font-mono text-text-secondary hover:text-text-primary hover:border-rose-400/50 cursor-pointer flex items-center gap-1"
                    >
                      <Bell className="size-3 text-rose-400" />
                      <span>Thử Chuông</span>
                    </button>
                  </div>
                </div>

                {/* Row 2: Digital Clock Display & Primary Controls */}
                <div className="flex flex-col lg:flex-row items-center justify-between gap-6 py-4 px-6 rounded-lg bg-surface-base border border-surface-border">
                  {/* Big Digital Readout */}
                  <div className="flex items-center gap-4">
                    <div
                      className={`px-6 py-2 rounded-xl border font-mono text-5xl font-bold tracking-widest tabular-nums select-none shadow-inner ${
                        adminTimerSeconds <= 30 && adminTimerSeconds > 0
                          ? 'bg-red-500/15 border-red-500/70 text-red-400 animate-pulse'
                          : adminTimerSeconds <= 60
                          ? 'bg-amber-500/15 border-amber-500/70 text-amber-400'
                          : 'bg-surface-base border-brand-cyan/50 text-brand-cyan'
                      }`}
                    >
                      {formatTimerSeconds(adminTimerSeconds)}
                    </div>

                    <div className="space-y-1">
                      <div className="text-sm font-bold text-text-primary">
                        {state.teams.find((t) => t.id === state.timer?.activeTeamId)?.name || 'Chung Toàn Sân Khấu'}
                      </div>
                      <div className="font-mono text-xs text-text-tertiary">
                        {state.timer?.roundLabel}
                      </div>
                    </div>
                  </div>

                  {/* Start / Pause / Reset / Adjust Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    {state.timer?.mode === 'RUNNING' ? (
                      <button
                        type="button"
                        onClick={handlePauseTimer}
                        className="px-5 py-2.5 rounded-lg bg-amber-500/20 border border-amber-500 text-amber-300 font-bold text-sm flex items-center gap-2 cursor-pointer hover:bg-amber-500/30 transition-colors shadow-sm"
                      >
                        <Pause className="size-4" />
                        <span>TẠM DỪNG (SPACE)</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStartTimer}
                        className="px-5 py-2.5 rounded-lg bg-semantic-success text-white font-bold text-sm flex items-center gap-2 cursor-pointer hover:bg-semantic-success/90 transition-colors shadow-[0_0_14px_rgba(34,197,94,0.4)]"
                      >
                        <Play className="size-4 fill-current" />
                        <span>{state.timer?.mode === 'PAUSED' ? 'TIẾP TỤC (SPACE)' : 'BẮT ĐẦU (SPACE)'}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleResetTimer}
                      className="px-3.5 py-2.5 rounded-lg bg-surface-raised border border-surface-border text-text-secondary hover:text-text-primary text-sm font-mono font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <RotateCcw className="size-4" />
                      <span>Reset</span>
                    </button>

                    <div className="flex items-center gap-1 ml-2">
                      <button
                        type="button"
                        onClick={() => handleAdjustTimer(+30)}
                        className="px-2.5 py-2 rounded bg-surface-raised border border-surface-border text-xs font-mono text-text-secondary hover:text-brand-cyan cursor-pointer"
                      >
                        +30s
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustTimer(+60)}
                        className="px-2.5 py-2 rounded bg-surface-raised border border-surface-border text-xs font-mono text-text-secondary hover:text-brand-cyan cursor-pointer"
                      >
                        +1m
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAdjustTimer(-30)}
                        className="px-2.5 py-2 rounded bg-surface-raised border border-surface-border text-xs font-mono text-text-secondary hover:text-rose-400 cursor-pointer"
                      >
                        -30s
                      </button>
                    </div>
                  </div>
                </div>

                {/* Row 3: Presets & Custom Input */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono text-text-tertiary">Mốc mẫu:</span>
                    {FOH_TIMER_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`px-2.5 py-1.5 rounded text-xs font-mono border transition-colors cursor-pointer ${
                          state.timer?.totalSeconds === preset.durationSeconds &&
                          state.timer?.roundLabel.includes(preset.label)
                            ? 'bg-brand-navy border-brand-cyan text-brand-cyan font-bold'
                            : 'bg-surface-base border-surface-border text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}

                    <div className="flex items-center gap-1 bg-surface-base px-2 py-1 rounded border border-surface-border text-xs font-mono ml-1">
                      <input
                        type="text"
                        maxLength={2}
                        value={customMin}
                        onChange={(e) => setCustomMin(e.target.value.replace(/\D/g, ''))}
                        className="w-6 text-center bg-transparent text-text-primary focus:outline-none"
                        placeholder="05"
                      />
                      <span className="text-text-tertiary">:</span>
                      <input
                        type="text"
                        maxLength={2}
                        value={customSec}
                        onChange={(e) => setCustomSec(e.target.value.replace(/\D/g, ''))}
                        className="w-6 text-center bg-transparent text-text-primary focus:outline-none"
                        placeholder="00"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCustomTimer}
                        className="px-2 py-0.5 rounded bg-surface-raised border border-surface-border text-[11px] hover:text-brand-cyan cursor-pointer"
                      >
                        Set
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-xs font-mono text-text-tertiary cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={state.timer?.showOverlayOnScoreboard ?? true}
                      onChange={(e) =>
                        updateState(
                          (prev) => ({
                            ...prev,
                            timer: {
                              ...prev.timer,
                              showOverlayOnScoreboard: e.target.checked,
                            },
                          }),
                          { recordUndo: false }
                        )
                      }
                      className="rounded border-surface-border text-brand-cyan focus:ring-0 bg-surface-base cursor-pointer"
                    />
                    <span>Hiển thị banner đồng hồ trên bảng điểm LED</span>
                  </label>
                </div>
              </div>
            )}

            {adminActiveTab === 'STAGE3_PICKER' && (() => {
              const sortedStage3Teams = [...state.teams].sort((a, b) =>
                a.name.localeCompare(b.name, 'vi')
              )
              const selectedTeamId = state.stage3Picker?.teamId || sortedStage3Teams[0]?.id
              const selectedTeam = state.teams.find((t) => t.id === selectedTeamId) || sortedStage3Teams[0]
              const members = selectedTeam?.members || []
              const sortedMembers = [...members].sort((a, b) => {
                if (a.role === 'leader') return -1
                if (b.role === 'leader') return 1
                return a.name.localeCompare(b.name, 'vi')
              })
              const activeMembers = sortedMembers.filter((m) => m.activeForSelection !== false)
              const isRolling = state.stage3Picker?.isRolling ?? false
              const chosenName = state.stage3Picker?.chosenMemberName

              return (
                <div className="rounded-xl border border-surface-border bg-[#0A1120] p-4 shadow-elevation-2 space-y-4">
                  {/* Top Bar: Team selector pills & LED view switch */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-surface-border/80 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-accent-violet/15 text-accent-violet border border-accent-violet/30">
                        <Dices className="size-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-text-primary tracking-wide">
                          BỐC THĂM THÀNH VIÊN VÒNG 3 (HUY ĐỘNG VỐN)
                        </div>
                        <div className="text-[11px] text-text-tertiary">
                          Chọn ngẫu nhiên 1 thành viên lên thuyết trình phần Pitching 5 phút (Xếp thứ tự A-Z)
                        </div>
                      </div>
                    </div>

                    {/* Team Selector Pills (Sorted A-Z) */}
                    <div className="flex items-center gap-1 bg-surface-base p-1 rounded-lg border border-surface-border overflow-x-auto">
                      {sortedStage3Teams.map((t) => {
                        const isSelected = selectedTeam?.id === t.id
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => handleSelectStage3Team(t.id)}
                            className={`px-2.5 py-1 rounded text-xs transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                              isSelected
                                ? 'bg-accent-violet text-white font-bold shadow-[0_0_8px_rgba(168,85,247,0.4)]'
                                : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised font-medium'
                            }`}
                          >
                            <span className="font-mono font-bold opacity-80">#{t.msbc}</span>
                            <span className="truncate max-w-[110px] font-sans">{t.name}</span>
                          </button>
                        )
                      })}
                    </div>

                    {/* LED Toggle */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleSwitchDisplayView(
                            state.displayView === 'STAGE3_PICKER' ? 'STAGES' : 'STAGE3_PICKER'
                          )
                        }
                        className={`px-2.5 py-1 rounded text-xs font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                          state.displayView === 'STAGE3_PICKER'
                            ? 'bg-accent-violet text-white border-accent-violet'
                            : 'bg-surface-raised border-surface-border text-accent-violet hover:border-accent-violet/60'
                        }`}
                      >
                        <Monitor className="size-3" />
                        <span>{state.displayView === 'STAGE3_PICKER' ? 'Đang Chiếu LED' : 'Chiếu Lên LED'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Main 2-Col Body */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Left Column (5 cols): Candidate Members Roster */}
                    <div className="md:col-span-5 bg-surface-base/80 rounded-lg border border-surface-border p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-text-tertiary uppercase font-bold tracking-wide">
                          Thành viên ({activeMembers.length}/{members.length} tham gia)
                        </span>
                        <span className="text-[11px] text-brand-cyan font-semibold">
                          <span className="font-mono font-bold">#{selectedTeam?.msbc}</span> {selectedTeam?.name}
                        </span>
                      </div>

                      <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1">
                        {sortedMembers.length === 0 ? (
                          <div className="text-center py-4 text-xs text-text-tertiary">
                            Chưa có dữ liệu thành viên
                          </div>
                        ) : (
                          sortedMembers.map((m) => {
                            const isActive = m.activeForSelection !== false
                            return (
                              <div
                                key={m.id}
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded border transition-colors text-xs ${
                                  isActive
                                    ? 'bg-surface-raised/70 border-surface-border text-text-primary'
                                    : 'bg-surface-base/40 border-surface-border/50 text-text-tertiary opacity-60'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <input
                                    type="checkbox"
                                    checked={isActive}
                                    onChange={() => handleToggleMemberActive(selectedTeam.id, m.id)}
                                    className="rounded border-surface-border text-accent-violet focus:ring-0 bg-surface-base cursor-pointer"
                                    title="Tích chọn để tham gia vòng bốc thăm"
                                  />
                                  <div className="truncate">
                                    <div className="font-semibold truncate flex items-center gap-1.5">
                                      <span>{m.name}</span>
                                      {m.role === 'leader' && (
                                        <span className="text-[9px] font-sans font-semibold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                          Leader
                                        </span>
                                      )}
                                    </div>
                                    {m.faculty && (
                                      <div className="text-[10px] text-text-tertiary truncate">
                                        {m.faculty}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteMember(selectedTeam.id, m.id)}
                                  className="text-text-tertiary hover:text-semantic-danger p-1 rounded transition-colors cursor-pointer"
                                  title="Xóa thành viên"
                                >
                                  <Trash2 className="size-3" />
                                </button>
                              </div>
                            )
                          })
                        )}
                      </div>

                      {/* Add Member Row */}
                      <div className="flex items-center gap-1.5 pt-1 border-t border-surface-border/60">
                        <input
                          type="text"
                          placeholder="Tên thành viên mới..."
                          value={newMemberName}
                          onChange={(e) => setNewMemberName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddMember(selectedTeam.id)
                            }
                          }}
                          className="flex-1 px-2.5 py-1 rounded bg-surface-overlay border border-surface-border text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-violet font-sans"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddMember(selectedTeam.id)}
                          className="px-2.5 py-1 rounded bg-surface-raised border border-surface-border hover:border-accent-violet text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1 cursor-pointer"
                        >
                          <UserPlus className="size-3 text-accent-violet" />
                          <span>Thêm</span>
                        </button>
                      </div>
                    </div>

                    {/* Right Column (7 cols): Roulette Spotlight & Roll Trigger */}
                    <div className="md:col-span-7 flex flex-col justify-between rounded-lg border border-surface-border bg-gradient-to-b from-[#0F172A] to-[#0A1120] p-4 text-center">
                      {/* Spotlight Presentation Area */}
                      <div className="my-auto py-2 space-y-3">
                        {isRolling ? (
                          <div className="space-y-2 py-4 animate-pulse">
                            <div className="inline-flex p-3 rounded-full bg-accent-violet/20 border border-accent-violet/40 text-accent-violet animate-spin">
                              <Dices className="size-8" />
                            </div>
                            <div className="text-sm font-bold text-accent-gold tracking-widest uppercase">
                              Đang bốc thăm ngẫu nhiên...
                            </div>
                            <div className="text-xs text-text-tertiary">
                              Hệ thống đang đảo tên các ứng viên
                            </div>
                          </div>
                        ) : chosenName ? (
                          <div className="p-4 rounded-xl bg-accent-gold/10 border-2 border-accent-gold/60 shadow-[0_0_20px_rgba(251,191,36,0.15)] space-y-2">
                            <div className="text-[10px] font-bold tracking-widest text-accent-gold uppercase flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="size-3.5 text-accent-gold" />
                              <span>ĐẠI DIỆN THUYẾT TRÌNH VÒNG 3</span>
                            </div>
                            <div className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-cyan-300">
                              {chosenName}
                            </div>
                            <div className="text-xs text-text-secondary">
                              {state.stage3Picker?.chosenMemberRole} • {state.stage3Picker?.chosenMemberInstitution}
                            </div>

                            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleStartStage3PitchTimer(selectedTeam.id, chosenName)}
                                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_12px_rgba(16,185,129,0.3)] cursor-pointer transition-all"
                              >
                                <Play className="size-3.5 fill-current" />
                                <span>BẮT ĐẦU 5 PHÚT THUYẾT TRÌNH</span>
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  updateState(
                                    (prev) => ({
                                      ...prev,
                                      stage3Picker: {
                                        ...prev.stage3Picker,
                                        chosenMemberId: null,
                                        chosenMemberName: null,
                                        chosenMemberRole: null,
                                        chosenMemberInstitution: null,
                                        completedAt: null,
                                      },
                                    }),
                                    { recordUndo: false, log: 'Đặt lại kết quả bốc thăm' }
                                  )
                                }
                                className="px-3 py-2 rounded-lg bg-surface-raised border border-surface-border text-xs text-text-tertiary hover:text-text-primary cursor-pointer font-medium"
                              >
                                Bốc Thăm Lại
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 py-4">
                            <div className="inline-flex p-3 rounded-full bg-surface-raised border border-surface-border text-text-tertiary">
                              <Dices className="size-8" />
                            </div>
                            <div className="text-base font-bold text-text-primary">
                              Sẵn Sàng Bốc Thăm Đại Diện Đội {selectedTeam?.name}
                            </div>
                            <div className="text-xs text-text-tertiary max-w-sm mx-auto">
                              Có {activeMembers.length} thành viên hợp lệ tham gia bốc thăm ngẫu nhiên.
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Roll Button */}
                      <div className="pt-3 border-t border-surface-border/60">
                        <button
                          type="button"
                          disabled={isRolling || activeMembers.length === 0}
                          onClick={() => handleRollStage3Member(selectedTeam.id)}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-accent-violet via-purple-600 to-indigo-600 hover:from-accent-violet/90 hover:to-indigo-500 text-white text-sm font-bold tracking-wider uppercase transition-all shadow-[0_0_16px_rgba(168,85,247,0.35)] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                          <Dices className={`size-4 ${isRolling ? 'animate-spin' : ''}`} />
                          <span>
                            {isRolling
                              ? 'ĐANG QUAY BỐC THĂM...'
                              : activeMembers.length === 0
                              ? 'CHƯA CÓ THÀNH VIÊN ĐƯỢC CHỌN'
                              : 'QUAY BỐC THĂM THÀNH VIÊN'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })()}

            {adminActiveTab === 'BOOTH_VOTING' && (
              /* PRO-CONSOLE BOOTH VOTING GRID */
              <div className="rounded-xl border border-surface-border bg-[#0A1120] overflow-hidden shadow-elevation-2">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-surface-raised/70 border-b border-surface-border text-[11px] font-semibold text-text-tertiary uppercase tracking-wider font-sans">
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
                              <span className="text-sm font-bold text-text-primary truncate">
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
            <div className="flex items-center justify-between text-xs text-text-tertiary mt-3 px-1 font-sans">
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

              {/* LED Preview Content */}
              {ledSnapshot.displayView === 'TIMER' ? (
                <div className="rounded-lg bg-surface-base border border-brand-cyan/40 p-3 text-center space-y-2">
                  <div className="text-[10px] font-mono text-brand-cyan uppercase tracking-wider font-bold">
                    MÀN HÌNH ĐẾM GIỜ FULLSCREEN
                  </div>
                  <div className="text-sm font-bold text-text-primary truncate">
                    {state.teams.find((t) => t.id === ledSnapshot.timer?.activeTeamId)?.name || 'Chung'}
                  </div>
                  <div className="font-mono text-2xl font-bold text-brand-cyan tabular-nums tracking-wider">
                    {formatTimerSeconds(adminTimerSeconds)}
                  </div>
                  <div className="text-[10px] font-mono text-text-tertiary truncate">
                    {ledSnapshot.timer?.roundLabel}
                  </div>
                </div>
              ) : ledSnapshot.displayView === 'STAGE3_PICKER' ? (
                <div className="rounded-lg bg-surface-base border border-accent-gold/40 p-3 text-center space-y-2">
                  <div className="text-[10px] font-mono text-accent-gold uppercase tracking-wider font-bold">
                    BỐC THĂM V3 FULLSCREEN
                  </div>
                  <div className="text-xs font-bold text-text-primary truncate">
                    {state.teams.find((t) => t.id === ledSnapshot.stage3Picker?.teamId)?.name || 'Chưa chọn'}
                  </div>
                  <div className="p-2 rounded bg-surface-raised border border-accent-gold/30">
                    {ledSnapshot.stage3Picker?.isRolling ? (
                      <div className="text-xs font-mono text-accent-gold animate-pulse font-bold">
                        🎲 ĐANG QUAY SỐ...
                      </div>
                    ) : ledSnapshot.stage3Picker?.chosenMemberName ? (
                      <div>
                        <div className="text-[10px] font-mono text-text-tertiary">ĐẠI DIỆN:</div>
                        <div className="text-sm font-bold text-brand-cyan truncate">
                          {ledSnapshot.stage3Picker.chosenMemberName}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[11px] font-mono text-text-tertiary">CHỜ BỐC THĂM</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 text-xs font-mono">
                  {ledSnapshot.timer?.showOverlayOnScoreboard &&
                    ledSnapshot.timer.mode !== 'STOPPED' && (
                      <div className="flex items-center justify-between px-2 py-1 rounded bg-brand-cyan/10 border border-brand-cyan/40 text-[10px]">
                        <span className="font-bold text-brand-cyan">⏱️ LIVE TIMER</span>
                        <span className="font-mono font-bold text-text-primary">
                          {formatTimerSeconds(adminTimerSeconds)}
                        </span>
                      </div>
                    )}
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
                          <span className="truncate text-text-primary text-[11px] font-semibold">
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
              )}
            </div>

            {/* Quick Action Shortcuts Legend */}
            <div className="rounded-xl border border-surface-border bg-[#0A1120] p-3 text-[11px] font-mono text-text-tertiary space-y-1">
              <div className="text-text-secondary font-bold font-sans">Phím tắt nhanh:</div>
              <div><kbd className="px-1 bg-black/40 rounded text-semantic-success">Space</kbd> Bắt đầu / Tạm dừng giờ</div>
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
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-primary flex items-center gap-1.5">
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
