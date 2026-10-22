'use client'

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase'
import { generateQrMatrix } from '@/lib/qr-generator'
import type {
  BoothVotingSettings,
  BoothTeamScoreRow,
  BoothGateMode,
  BoothIpMode,
} from '@/lib/booth-voting'
import DotGridBackground from '@/components/dot-grid-background'
import LoadingScreen from '@/components/loading-screen'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  ArrowLeft,
  QrCode,
  Radio,
  ShieldCheck,
  ShieldAlert,
  Download,
  Copy,
  Check,
  ExternalLink,
  Trophy,
  RefreshCw,
  Lock,
  Unlock,
  Clock,
  FileSpreadsheet,
  Sparkles,
  Wifi,
  Globe,
  Laptop,
} from 'lucide-react'

const PRODUCTION_ORIGIN = 'https://gendarena.com'

function QrSvg({
  value,
  size = 176,
}: {
  value: string
  size?: number
}) {
  const matrix = useMemo(() => generateQrMatrix(value), [value])
  const count = matrix.length
  const quietZone = 3
  const totalModules = count + quietZone * 2

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${totalModules} ${totalModules}`}
      shapeRendering="crispEdges"
      className="rounded-xl bg-white p-1.5 shadow-md"
      aria-label={`QR Code cho ${value}`}
    >
      <rect width={totalModules} height={totalModules} fill="#FFFFFF" />
      {matrix.map((row, r) =>
        row.map((dark, c) =>
          dark ? (
            <rect
              key={`${r}-${c}`}
              x={c + quietZone}
              y={r + quietZone}
              width={1}
              height={1}
              fill="#060B19"
            />
          ) : null
        )
      )}
    </svg>
  )
}

export default function AdminBoothVotingPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [activeTab, setActiveTab] = useState<'LIVE' | 'QR_KIT' | 'SETTINGS'>('LIVE')
  const [settings, setSettings] = useState<BoothVotingSettings | null>(null)
  const [gate, setGate] = useState<{
    isOpen: boolean
    phase: 'UPCOMING' | 'ACTIVE' | 'ENDED'
    serverTime: string
  } | null>(null)
  const [teams, setTeams] = useState<BoothTeamScoreRow[]>([])
  const [totalVotes, setTotalVotes] = useState(0)
  const [totalBlocked, setTotalBlocked] = useState(0)
  const [lastSyncedAt, setLastSyncedAt] = useState<string>('')
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [localOrigin, setLocalOrigin] = useState<string>('http://localhost:3000')
  const [isLocalEnv, setIsLocalEnv] = useState<boolean>(false)
  // Default QR code always encodes production https://gendarena.com so printed QR standees never accidentally contain localhost
  const [qrTargetEnv, setQrTargetEnv] = useState<'PROD' | 'LOCAL'>('PROD')

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location?.origin) {
      const currentOrigin = window.location.origin
      const isLocal =
        currentOrigin.includes('localhost') ||
        currentOrigin.includes('127.0.0.1') ||
        currentOrigin.includes('192.168.')
      setIsLocalEnv(isLocal)
      if (isLocal) {
        setLocalOrigin(currentOrigin)
      }
    }
  }, [])

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/booth-voting', { cache: 'no-store' })
      if (res.status === 403) {
        router.push('/login')
        return
      }
      if (!res.ok) return
      const data = await res.json()
      setSettings(data.settings)
      setGate(data.gate)
      setTeams(data.teams || [])
      setTotalVotes(data.totalVotes || 0)
      setTotalBlocked(data.totalBlocked || 0)
      setLastSyncedAt(
        new Date().toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      )
    } catch (err) {
      console.error('Error syncing booth voting dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [router])

  // Initial auth check + Realtime subscription + 3-second fallback sync
  useEffect(() => {
    let isMounted = true

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!isMounted) return
      if (!user) {
        router.push('/login')
        return
      }
      await fetchDashboard()
    }

    init()

    const channel = supabase
      .channel('btc-booth-voting-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'booth_vote_counts' },
        () => {
          fetchDashboard()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'booth_voting_settings' },
        () => {
          fetchDashboard()
        }
      )
      .subscribe()

    const pollTimer = setInterval(() => {
      fetchDashboard()
    }, 3000)

    return () => {
      isMounted = false
      clearInterval(pollTimer)
      supabase.removeChannel(channel)
    }
  }, [fetchDashboard, router, supabase])

  const handleUpdateSettings = async (
    patch: Partial<{
      gate_mode: BoothGateMode
      ip_mode: BoothIpMode
      block_vpn: boolean
    }>
  ) => {
    try {
      setSavingSettings(true)
      const res = await fetch('/api/admin/booth-voting', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (res.ok) {
        const data = await res.json()
        setSettings(data.settings)
        setGate(data.gate)
        if (data.teams) setTeams(data.teams)
      }
    } finally {
      setSavingSettings(false)
    }
  }

  const getProdVoteUrl = useCallback(
    (team: BoothTeamScoreRow) => `${PRODUCTION_ORIGIN}/vote/booth/${team.slug}`,
    []
  )

  const getLocalVoteUrl = useCallback(
    (team: BoothTeamScoreRow) => `${localOrigin}/vote/booth/${team.slug}`,
    [localOrigin]
  )

  const getActiveQrUrl = useCallback(
    (team: BoothTeamScoreRow) =>
      qrTargetEnv === 'LOCAL' && isLocalEnv ? getLocalVoteUrl(team) : getProdVoteUrl(team),
    [getLocalVoteUrl, getProdVoteUrl, isLocalEnv, qrTargetEnv]
  )

  const handleCopyText = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  /**
   * Generates and downloads a high-resolution 1200x1600 PNG Standee QR Card for a team booth.
   * Uses the selected QR domain (defaults to https://gendarena.com).
   */
  const handleDownloadQrStandeePng = (team: BoothTeamScoreRow) => {
    const url = getActiveQrUrl(team)
    const matrix = generateQrMatrix(url)
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 1600
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Dark Arena Background
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 1600)
    bgGrad.addColorStop(0, '#050814')
    bgGrad.addColorStop(0.5, '#0B132B')
    bgGrad.addColorStop(1, '#050814')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, 1200, 1600)

    // Cyan Border Frame
    ctx.strokeStyle = '#00F0FF'
    ctx.lineWidth = 6
    ctx.strokeRect(48, 48, 1104, 1504)

    // Header Title
    ctx.fillStyle = '#00F0FF'
    ctx.font = 'bold 34px Inter, Arial, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('GEND ARENA 2026 • TOP 5 CHUNG KẾT GIAN HÀNG', 600, 145)

    // Team Badge & Name
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 42px monospace'
    ctx.fillText(`GIAN HÀNG ĐỘI #${team.msbc}`, 600, 230)

    ctx.fillStyle = '#00F0FF'
    ctx.font = 'bold 70px Inter, Arial, sans-serif'
    ctx.fillText(team.team_name.toUpperCase(), 600, 325)

    ctx.fillStyle = '#94A3B8'
    ctx.font = '30px Inter, Arial, sans-serif'
    ctx.fillText(team.institution, 600, 385)

    // White QR Card Box
    const qrBoxSize = 760
    const qrBoxX = (1200 - qrBoxSize) / 2
    const qrBoxY = 445
    ctx.fillStyle = '#FFFFFF'
    ctx.beginPath()
    ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 32)
    ctx.fill()

    // Draw QR Matrix inside White Box
    const quietZone = 4
    const totalModules = matrix.length + quietZone * 2
    const cellSize = qrBoxSize / totalModules
    ctx.fillStyle = '#050814'
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c]) {
          ctx.fillRect(
            Math.floor(qrBoxX + (c + quietZone) * cellSize),
            Math.floor(qrBoxY + (r + quietZone) * cellSize),
            Math.ceil(cellSize),
            Math.ceil(cellSize)
          )
        }
      }
    }

    // Instructions Footer
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 42px Inter, Arial, sans-serif'
    ctx.fillText('QUÉT MÃ QR ĐỂ BÌNH CHỌN NGAY', 600, 1300)

    ctx.fillStyle = '#00F0FF'
    ctx.font = 'bold 32px monospace'
    ctx.fillText('Khung giờ: 14:00 – 15:30 | Ngày 08/11/2026', 600, 1365)

    ctx.fillStyle = '#94A3B8'
    ctx.font = '26px monospace'
    ctx.fillText(url, 600, 1435)

    ctx.fillStyle = '#64748B'
    ctx.font = '22px Inter, Arial, sans-serif'
    ctx.fillText(
      'Không cần đăng nhập • Không thu thập dữ liệu cá nhân • 1 Thiết bị/IP = 1 Lượt Vote',
      600,
      1495
    )

    const link = document.createElement('a')
    link.download = `QR-Gian-Hang-Top5-${team.msbc}-${team.slug}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const handleExportExcel = () => {
    const sorted = [...teams].sort((a, b) => b.vote_count - a.vote_count)
    const rows = sorted.map((t, index) => ({
      'Hạng': index + 1,
      'Mã Gian Hàng': `#${t.msbc}`,
      'Tên Đội Thi (Top 5)': t.team_name,
      'Trường / Đơn vị': t.institution,
      'Lĩnh vực': t.category,
      'Số Phiếu Hợp Lệ': t.vote_count,
      'Lượt Gian Lận Đã Chặn': t.blocked_count,
      'Lần Vote Cuối': t.last_vote_at
        ? new Date(t.last_vote_at).toLocaleString('vi-VN')
        : 'Chưa có',
      'Link Gian Hàng Chính Thức': getProdVoteUrl(t),
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Top5_GianHang_0811')
    XLSX.writeFile(wb, `GenDArena2026_Top5_VotingGianHang_08112026.xlsx`)
  }

  if (loading) {
    return <LoadingScreen text="Đang kết nối hệ thống Real-time Bình chọn Gian hàng Top 5..." />
  }

  const sortedTeams = [...teams].sort(
    (a, b) => b.vote_count - a.vote_count || a.msbc.localeCompare(b.msbc)
  )
  const maxVotes = Math.max(1, sortedTeams[0]?.vote_count || 1)

  return (
    <div className="relative min-h-screen bg-surface-base text-text-primary overflow-hidden pb-16">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <DotGridBackground />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[650px] h-96 rounded-full bg-brand-cyan/5 blur-[150px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-surface-border bg-surface-base/85 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-text-secondary hover:text-brand-cyan transition-colors mb-3"
          >
            <ArrowLeft className="size-3.5" />
            Quay lại Trung tâm kiểm soát BTC
          </Link>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <Badge variant="warning" size="sm">
                  BTC • TOP 5 CHUNG KẾT (08/11/2026)
                </Badge>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-cyan/15 border border-brand-cyan/30 text-brand-cyan text-xs font-mono">
                  <Radio className="size-3 animate-pulse" />
                  Real-time Sync ({lastSyncedAt})
                </span>
                {gate?.isOpen ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-semantic-success/15 border border-semantic-success/40 text-semantic-success text-xs font-mono font-bold">
                    <span className="size-2 rounded-full bg-semantic-success animate-pulse" />
                    CỔNG ĐANG MỞ
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-raised border border-surface-border text-text-tertiary text-xs font-mono">
                    <Lock className="size-3" />
                    CỔNG ĐANG ĐÓNG ({gate?.phase})
                  </span>
                )}
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
                Điều Hành Voting Gian Hàng Top 5 Chung Kết
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-text-secondary">
                Top 5: <strong>Aqua Radar, Axiom, Viet Nam Safe, Ngũ Long Công Chúa, Change yourself</strong> • 14:00 – 15:30 ngày 08/11/2026
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportExcel}
                leftIcon={<FileSpreadsheet className="size-4 text-semantic-success" />}
              >
                Xuất Excel Điểm Số
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchDashboard}
                leftIcon={<RefreshCw className="size-3.5" />}
              >
                Làm mới
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-surface-border">
            <button
              type="button"
              onClick={() => setActiveTab('LIVE')}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'LIVE'
                  ? 'bg-brand-cyan text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                  : 'bg-surface-raised text-text-secondary hover:text-text-primary border border-surface-border'
              }`}
            >
              <Trophy className="size-3.5" />
              <span>1. Bảng Điểm Real-time ({totalVotes} phiếu)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('QR_KIT')}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'QR_KIT'
                  ? 'bg-brand-cyan text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                  : 'bg-surface-raised text-text-secondary hover:text-text-primary border border-surface-border'
              }`}
            >
              <QrCode className="size-3.5" />
              <span>2. Mã QR Top 5 Đội Thi (Tải & In Standee)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SETTINGS')}
              className={`px-4 py-2 rounded-lg text-xs font-bold font-mono uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'SETTINGS'
                  ? 'bg-brand-cyan text-slate-950 shadow-[0_0_15px_rgba(0,240,255,0.4)]'
                  : 'bg-surface-raised text-text-secondary hover:text-text-primary border border-surface-border'
              }`}
            >
              <ShieldCheck className="size-3.5" />
              <span>3. Đóng/Mở Cổng & Cấu Hình Chống Gian Lận</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 space-y-6">
        {/* Top Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4 border-brand-cyan/30 bg-surface-overlay">
            <div className="flex items-center justify-between text-xs text-text-tertiary">
              <span>Tổng phiếu hợp lệ (Top 5)</span>
              <Sparkles className="size-4 text-brand-cyan" />
            </div>
            <p className="font-mono text-3xl font-extrabold text-brand-cyan mt-2 tabular-nums">
              {totalVotes.toLocaleString('vi-VN')}
            </p>
            <p className="text-[11px] text-text-tertiary mt-1">
              Tự động nhảy số khi khán giả bấm Vote
            </p>
          </Card>

          <Card className="p-4 border-semantic-danger/30 bg-surface-overlay">
            <div className="flex items-center justify-between text-xs text-text-tertiary">
              <span>Lượt gian lận/trùng bị chặn</span>
              <ShieldAlert className="size-4 text-semantic-danger" />
            </div>
            <p className="font-mono text-3xl font-extrabold text-semantic-danger mt-2 tabular-nums">
              {totalBlocked.toLocaleString('vi-VN')}
            </p>
            <p className="text-[11px] text-text-tertiary mt-1">
              Đã chặn tab Ẩn danh, trùng IP & VPN
            </p>
          </Card>

          <Card className="p-4 bg-surface-overlay">
            <div className="flex items-center justify-between text-xs text-text-tertiary">
              <span>Chế độ Cổng Bình Chọn</span>
              <Clock className="size-4 text-semantic-warning" />
            </div>
            <p className="font-display text-lg font-bold text-text-primary mt-2">
              {settings?.gate_mode === 'force_open'
                ? 'Đang Mở Cưỡng Bức (Test/Live)'
                : settings?.gate_mode === 'force_closed'
                ? 'Đã Khóa Cưỡng Bức'
                : 'Tự Động (14:00–15:30 08/11)'}
            </p>
            <div className="mt-2 flex items-center gap-2">
              {settings?.gate_mode !== 'force_open' ? (
                <button
                  type="button"
                  disabled={savingSettings}
                  onClick={() => handleUpdateSettings({ gate_mode: 'force_open' })}
                  className="text-[11px] font-mono px-2.5 py-1 rounded bg-semantic-success/20 text-semantic-success border border-semantic-success/40 hover:bg-semantic-success/30 cursor-pointer"
                >
                  Mở cổng ngay (Để Test)
                </button>
              ) : (
                <button
                  type="button"
                  disabled={savingSettings}
                  onClick={() => handleUpdateSettings({ gate_mode: 'auto' })}
                  className="text-[11px] font-mono px-2.5 py-1 rounded bg-semantic-warning/20 text-semantic-warning border border-semantic-warning/40 hover:bg-semantic-warning/30 cursor-pointer"
                >
                  Về chế độ Tự động (08/11)
                </button>
              )}
            </div>
          </Card>

          <Card className="p-4 bg-surface-overlay">
            <div className="flex items-center justify-between text-xs text-text-tertiary">
              <span>Chính sách Chặn IP & VPN</span>
              <Wifi className="size-4 text-accent-violet" />
            </div>
            <p className="font-display text-sm font-bold text-text-primary mt-2">
              {settings?.ip_mode === 'strict'
                ? 'Nghiêm ngặt: 1 IP & 1 Máy = 1 Vote/Đội'
                : 'Wi-Fi Hội trường: 1 Máy = 1 Vote/Đội'}
            </p>
            <p className="text-[11px] text-semantic-success mt-1">
              ✓ Đang bật chặn VPN / Proxy / Ẩn danh
            </p>
          </Card>
        </div>

        {/* TAB 1: LIVE SCOREBOARD */}
        {activeTab === 'LIVE' && (
          <div className="rounded-2xl border border-surface-border bg-surface-overlay overflow-hidden shadow-elevation-2">
            <div className="px-6 py-4 border-b border-surface-border flex flex-wrap items-center justify-between gap-2 bg-surface-raised/40">
              <div>
                <h2 className="font-display text-base font-bold text-text-primary">
                  Bảng Xếp Hạng Điểm Bình Chọn Gian Hàng — TOP 5 CHUNG KẾT (Real-time)
                </h2>
                <p className="text-xs text-text-tertiary">
                  Cập nhật tức thời theo từng lượt quét QR của khán giả tại 5 gian hàng thi Chung kết
                </p>
              </div>
              <span className="text-xs font-mono text-brand-cyan">
                Tổng cộng: {totalVotes} lượt vote hợp lệ
              </span>
            </div>

            <div className="divide-y divide-surface-border">
              {sortedTeams.map((team, idx) => {
                const pct =
                  totalVotes > 0 ? ((team.vote_count / totalVotes) * 100).toFixed(1) : '0.0'
                const barWidth =
                  team.vote_count > 0
                    ? Math.max(4, Math.round((team.vote_count / maxVotes) * 100))
                    : 0

                return (
                  <div
                    key={team.team_id}
                    className={`px-6 py-4 transition-colors hover:bg-surface-raised/30 ${
                      idx === 0 && team.vote_count > 0
                        ? 'bg-yellow-950/15 border-l-4 border-l-yellow-400'
                        : idx === 1 && team.vote_count > 0
                        ? 'bg-slate-800/15 border-l-4 border-l-slate-300'
                        : idx === 2 && team.vote_count > 0
                        ? 'bg-amber-950/15 border-l-4 border-l-amber-500'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank */}
                      <div className="w-9 text-center font-mono font-bold text-sm text-text-tertiary shrink-0">
                        #{idx + 1}
                      </div>

                      {/* Team Thumbnail */}
                      <div className="relative size-12 rounded-lg overflow-hidden border border-surface-border shrink-0 bg-surface-raised">
                        <Image
                          src={team.posterUrl}
                          alt={team.team_name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>

                      {/* Team Info & Bar */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="px-2 py-0.5 rounded bg-brand-cyan/15 border border-brand-cyan/30 font-mono text-xs font-bold text-brand-cyan">
                              Gian hàng #{team.msbc}
                            </span>
                            <h3 className="font-display text-base font-bold text-text-primary truncate">
                              {team.team_name}
                            </h3>
                            <span className="hidden md:inline text-xs text-text-tertiary truncate">
                              • {team.institution}
                            </span>
                          </div>

                          <div className="flex items-baseline gap-3 shrink-0">
                            {team.blocked_count > 0 && (
                              <span
                                className="text-[11px] font-mono text-semantic-danger"
                                title="Số lượt trùng IP/Thiết bị đã bị chặn"
                              >
                                Đã chặn: {team.blocked_count}
                              </span>
                            )}
                            <span className="text-xs font-mono text-text-tertiary">{pct}%</span>
                            <span className="font-mono text-2xl font-extrabold text-brand-cyan tabular-nums">
                              {team.vote_count.toLocaleString('vi-VN')}
                            </span>
                            <span className="text-[11px] font-mono text-text-tertiary uppercase">
                              phiếu
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 w-full rounded-full bg-surface-raised overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-brand-cyan to-accent-violet transition-all duration-500"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 2: QR CODE KIT FOR TOP 5 TEAMS */}
        {activeTab === 'QR_KIT' && (
          <div className="space-y-6">
            <Card className="p-5 border-brand-cyan/30 bg-surface-overlay">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-text-primary">
                    Bộ Mã QR Trực Tiếp Từng Gian Hàng — TOP 5 ĐỘI CHUNG KẾT
                  </h2>
                  <p className="text-xs text-text-secondary mt-1">
                    Mặc định Mã QR và Standee PNG được tạo với tên miền chính thức{' '}
                    <strong className="text-brand-cyan font-mono">https://gendarena.com</strong> để
                    in ấn ngay. Khi bạn đang chạy trên máy cá nhân, hệ thống hiển thị kèm link{' '}
                    <strong className="text-semantic-warning font-mono">localhost</strong> bên dưới
                    để bạn bấm test trực tiếp.
                  </p>
                </div>

                {isLocalEnv && (
                  <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-raised border border-surface-border">
                    <button
                      type="button"
                      onClick={() => setQrTargetEnv('PROD')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        qrTargetEnv === 'PROD'
                          ? 'bg-brand-cyan text-slate-950'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <Globe className="size-3.5" />
                      <span>Mã QR: gendarena.com (Chuẩn Deploy)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrTargetEnv('LOCAL')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        qrTargetEnv === 'LOCAL'
                          ? 'bg-semantic-warning text-slate-950'
                          : 'text-text-secondary hover:text-text-primary'
                      }`}
                    >
                      <Laptop className="size-3.5" />
                      <span>Mã QR: Localhost (Test)</span>
                    </button>
                  </div>
                )}
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {teams.map((team) => {
                const prodUrl = getProdVoteUrl(team)
                const localUrl = getLocalVoteUrl(team)
                const qrUrl = getActiveQrUrl(team)
                const isProdCopied = copiedKey === `prod_${team.team_id}`
                const isLocalCopied = copiedKey === `local_${team.team_id}`

                return (
                  <Card
                    key={team.team_id}
                    className="p-5 bg-surface-overlay border-surface-border hover:border-brand-cyan/40 transition-all flex flex-col sm:flex-row items-center gap-5"
                  >
                    {/* Crisp SVG QR Code */}
                    <div className="shrink-0 flex flex-col items-center gap-2">
                      <QrSvg value={qrUrl} size={172} />
                      <span className="text-[11px] font-mono text-brand-cyan font-semibold">
                        {qrTargetEnv === 'LOCAL' && isLocalEnv
                          ? 'QR: Localhost'
                          : 'QR: gendarena.com'}
                      </span>
                    </div>

                    {/* Team Metadata & Both Links (Production + Local Test) */}
                    <div className="flex-1 min-w-0 space-y-3 text-center sm:text-left w-full">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-brand-cyan/15 text-brand-cyan font-mono text-xs font-bold mb-1">
                          GIAN HÀNG #{team.msbc} • TOP 5
                        </div>
                        <h3 className="font-display text-xl font-bold text-text-primary truncate">
                          {team.team_name}
                        </h3>
                        <p className="text-xs text-text-secondary truncate">{team.institution}</p>
                      </div>

                      {/* Official Production URL (gendarena.com) */}
                      <div className="space-y-1 text-left">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-brand-cyan flex items-center gap-1">
                          <Globe className="size-3" />
                          Link Chính Thức (Deploy Production):
                        </span>
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 p-2 rounded-lg bg-surface-raised border border-brand-cyan/30 font-mono text-[11px] text-brand-cyan truncate">
                            {prodUrl}
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleCopyText(`prod_${team.team_id}`, prodUrl)}
                            leftIcon={
                              isProdCopied ? (
                                <Check className="size-3.5 text-semantic-success" />
                              ) : (
                                <Copy className="size-3.5" />
                              )
                            }
                          >
                            {isProdCopied ? 'Đã copy' : 'Copy'}
                          </Button>
                        </div>
                      </div>

                      {/* Local Test URL (Shown when running on localhost for instant testing) */}
                      {isLocalEnv && (
                        <div className="space-y-1 text-left">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-semantic-warning flex items-center gap-1">
                            <Laptop className="size-3" />
                            Link Test Local (Trên máy của bạn):
                          </span>
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 p-2 rounded-lg bg-surface-raised border border-semantic-warning/30 font-mono text-[11px] text-semantic-warning truncate">
                              {localUrl}
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleCopyText(`local_${team.team_id}`, localUrl)}
                              leftIcon={
                                isLocalCopied ? (
                                  <Check className="size-3.5 text-semantic-success" />
                                ) : (
                                  <Copy className="size-3.5" />
                                )
                              }
                            >
                              {isLocalCopied ? 'Đã copy' : 'Copy'}
                            </Button>
                            <Link
                              href={`/vote/booth/${team.slug}`}
                              target="_blank"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-semantic-warning/15 border border-semantic-warning/40 hover:bg-semantic-warning/25 text-xs font-semibold text-semantic-warning transition-colors shrink-0"
                            >
                              <span>Test ngay</span>
                              <ExternalLink className="size-3" />
                            </Link>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleDownloadQrStandeePng(team)}
                          leftIcon={<Download className="size-3.5" />}
                        >
                          Tải Standee QR (PNG)
                        </Button>

                        {!isLocalEnv && (
                          <Link
                            href={`/vote/booth/${team.slug}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-surface-border hover:border-brand-cyan text-xs text-text-secondary hover:text-brand-cyan transition-colors"
                          >
                            <span>Mở trang bình chọn</span>
                            <ExternalLink className="size-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          </div>
        )}

        {/* TAB 3: GATE & ANTI-CHEAT SETTINGS */}
        {activeTab === 'SETTINGS' && settings && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 bg-surface-overlay space-y-4">
              <CardHeader className="p-0">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="size-5 text-brand-cyan" />
                  Điều Khiển Đóng / Mở Cổng Bình Chọn
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Mặc định hệ thống tự động mở lúc 14:00:00 và đóng lúc 15:30:00 ngày 08/11/2026
                  (GMT+7). BTC có thể mở sớm để kiểm thử hoặc điều chỉnh trực tiếp tại sự kiện.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-0 space-y-3 pt-2">
                {(
                  [
                    {
                      mode: 'auto' as BoothGateMode,
                      title: 'Tự động theo lịch chuẩn (Khuyên dùng)',
                      desc: 'Tự động mở từ 14:00:00 đến 15:30:00 ngày 08/11/2026',
                      icon: Clock,
                    },
                    {
                      mode: 'force_open' as BoothGateMode,
                      title: 'Mở cổng ngay lập tức (Force Open)',
                      desc: 'Cho phép khán giả quét QR và bấm Bình chọn ngay bây giờ (dùng để test hoặc khi trễ lịch)',
                      icon: Unlock,
                    },
                    {
                      mode: 'force_closed' as BoothGateMode,
                      title: 'Đóng cổng khẩn cấp (Force Closed)',
                      desc: 'Khóa toàn bộ nút bình chọn tại tất cả 5 gian hàng ngay lập tức',
                      icon: Lock,
                    },
                  ] as const
                ).map((item) => {
                  const Icon = item.icon
                  const selected = settings.gate_mode === item.mode
                  return (
                    <button
                      key={item.mode}
                      type="button"
                      disabled={savingSettings}
                      onClick={() => handleUpdateSettings({ gate_mode: item.mode })}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                        selected
                          ? 'border-brand-cyan bg-brand-cyan/10 shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                          : 'border-surface-border bg-surface-raised/50 hover:border-surface-border-strong'
                      }`}
                    >
                      <Icon
                        className={`size-5 mt-0.5 shrink-0 ${
                          selected ? 'text-brand-cyan' : 'text-text-tertiary'
                        }`}
                      />
                      <div>
                        <p className="font-display text-sm font-bold text-text-primary">
                          {item.title}
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">{item.desc}</p>
                      </div>
                    </button>
                  )
                })}
              </CardContent>
            </Card>

            <Card className="p-6 bg-surface-overlay space-y-4">
              <CardHeader className="p-0">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShieldCheck className="size-5 text-brand-cyan" />
                  Cấu Hình Bảo Mật IP, Chặn VPN & Chống Ẩn Danh
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Hệ thống luôn kích hoạt nhận diện Vân tay phần cứng (chặn tab Ẩn danh) và không
                  thu thập bất kỳ dữ liệu cá nhân nào.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-0 space-y-3 pt-2">
                {(
                  [
                    {
                      mode: 'strict' as BoothIpMode,
                      title: 'Chặn nghiêm ngặt: 1 IP & 1 Thiết bị = 1 Vote / Đội (Mặc định)',
                      desc: 'Mỗi địa chỉ IP mạng và mỗi máy chỉ bình chọn được 1 lần cho mỗi đội thi.',
                    },
                    {
                      mode: 'venue_wifi' as BoothIpMode,
                      title: 'Chế độ Wi-Fi Hội trường chung: 1 Thiết bị phần cứng = 1 Vote / Đội',
                      desc: 'Dùng khi nhiều khán giả bắt chung 1 cục Wi-Fi sự kiện (trùng IP). Vẫn chặn tab Ẩn danh theo phần cứng máy và giới hạn chống spam.',
                    },
                  ] as const
                ).map((item) => {
                  const selected = settings.ip_mode === item.mode
                  return (
                    <button
                      key={item.mode}
                      type="button"
                      disabled={savingSettings}
                      onClick={() => handleUpdateSettings({ ip_mode: item.mode })}
                      className={`w-full text-left p-4 rounded-xl border transition-all cursor-pointer ${
                        selected
                          ? 'border-brand-cyan bg-brand-cyan/10'
                          : 'border-surface-border bg-surface-raised/50 hover:border-surface-border-strong'
                      }`}
                    >
                      <p className="font-display text-sm font-bold text-text-primary">
                        {item.title}
                      </p>
                      <p className="text-xs text-text-secondary mt-1">{item.desc}</p>
                    </button>
                  )
                })}

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={savingSettings}
                    onClick={() => handleUpdateSettings({ block_vpn: !settings.block_vpn })}
                    className={`w-full text-left p-4 rounded-xl border transition-all flex items-center justify-between gap-4 cursor-pointer ${
                      settings.block_vpn
                        ? 'border-semantic-success/50 bg-semantic-success/10'
                        : 'border-surface-border bg-surface-raised/50'
                    }`}
                  >
                    <div>
                      <p className="font-display text-sm font-bold text-text-primary">
                        Chặn VPN / Proxy / 1.1.1.1 WARP / Giả DNS / IP Quốc Tế
                      </p>
                      <p className="text-xs text-text-secondary mt-0.5">
                        Tự động từ chối lượt bình chọn nếu phát hiện VPN, máy chủ ảo hoặc đổi vùng mạng.
                      </p>
                    </div>
                    <Badge variant={settings.block_vpn ? 'success' : 'default'} size="sm">
                      {settings.block_vpn ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                    </Badge>
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
