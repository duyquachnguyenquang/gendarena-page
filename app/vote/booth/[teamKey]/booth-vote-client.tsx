'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Sparkles,
  RefreshCw,
  Building2,
  Tag,
  Lock,
  Vote,
} from 'lucide-react'
import type { BoothTeamInfo } from '@/lib/booth-voting'
import {
  computeDeviceSecurityPayload,
  solveChallengePoW,
  getLocalVoteReceipt,
  saveLocalVoteReceipt,
  type DeviceSecurityPayload,
} from '@/lib/device-fingerprint'

interface BoothVoteClientProps {
  team: BoothTeamInfo
  initialGate: {
    isOpen: boolean
    phase: 'UPCOMING' | 'ACTIVE' | 'ENDED'
    serverTime: string
  }
  initialSettings: {
    start_time: string
    end_time: string
  }
}

type VoteUiState =
  | 'INITIALIZING'
  | 'READY'
  | 'SUBMITTING'
  | 'VOTED_SUCCESS'
  | 'ALREADY_VOTED'
  | 'VPN_BLOCKED'
  | 'ERROR'

export default function BoothVoteClient({
  team,
  initialGate,
  initialSettings,
}: BoothVoteClientProps) {
  const [gate, setGate] = useState(initialGate)
  const [settings, setSettings] = useState(initialSettings)
  const [uiState, setUiState] = useState<VoteUiState>('INITIALIZING')
  const [challenge, setChallenge] = useState<string>('')
  const [devicePayload, setDevicePayload] = useState<DeviceSecurityPayload | null>(null)
  const [receiptCode, setReceiptCode] = useState<string>('')
  const [votedAt, setVotedAt] = useState<string>('')
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [countdownText, setCountdownText] = useState<string>('')

  const verifySessionWithServer = useCallback(async () => {
    try {
      setUiState('INITIALIZING')
      // 1. Check local multi-storage receipt first for instant feedback
      const localReceipt = await getLocalVoteReceipt(team.id)

      // 2. Compute anonymous hardware fingerprint (works identically in Incognito)
      const secPayload = await computeDeviceSecurityPayload()
      setDevicePayload(secPayload)

      // 3. Query server for challenge token, live gate status, VPN check & device/IP duplicate check
      const params = new URLSearchParams({
        team: team.id,
        deviceHash: secPayload.deviceHash,
        canvasHash: secPayload.canvasHash,
        tzOffset: String(secPayload.timezoneOffset),
      })

      const res = await fetch(`/api/booth-vote?${params.toString()}`, {
        method: 'GET',
        cache: 'no-store',
      })

      if (!res.ok) {
        setUiState('READY')
        return
      }

      const data = await res.json()
      if (data.gate) setGate(data.gate)
      if (data.challenge) setChallenge(data.challenge)

      if (data.vpnBlocked) {
        setStatusMessage(
          data.vpnReason ||
            'Phát hiện kết nối VPN, Proxy hoặc DNS trung gian. Vui lòng tắt VPN (như 1.1.1.1 WARP) để bình chọn.'
        )
        setUiState('VPN_BLOCKED')
        return
      }

      if (localReceipt || data.alreadyVoted) {
        setReceiptCode(localReceipt?.receiptCode || data.receiptCode || `BV-${team.msbc}-VERIFIED`)
        setVotedAt(localReceipt?.votedAt || new Date().toISOString())
        setStatusMessage(
          'Mỗi thiết bị / địa chỉ IP chỉ được bình chọn 1 lần duy nhất cho mỗi đội thi.'
        )
        setUiState('ALREADY_VOTED')
        return
      }

      setUiState('READY')
    } catch {
      setUiState('READY')
    }
  }, [team.id, team.msbc])

  useEffect(() => {
    verifySessionWithServer()
  }, [verifySessionWithServer])

  // Live countdown timer for 14:00 - 15:30 08/11/2026
  useEffect(() => {
    const updateTimer = () => {
      const now = Date.now()
      const startMs = new Date(settings.start_time).getTime()
      const endMs = new Date(settings.end_time).getTime()

      if (gate.phase === 'UPCOMING' && now < startMs) {
        const diff = Math.max(0, startMs - now)
        const d = Math.floor(diff / (1000 * 60 * 60 * 24))
        const h = Math.floor((diff / (1000 * 60 * 60)) % 24)
        const m = Math.floor((diff / (1000 * 60)) % 60)
        const s = Math.floor((diff / 1000) % 60)
        setCountdownText(
          d > 0
            ? `${d} ngày ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
            : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        )
      } else if (gate.phase === 'UPCOMING' && now >= startMs && now <= endMs) {
        // Automatically unlock when 14:00 arrives!
        setGate({ isOpen: true, phase: 'ACTIVE', serverTime: new Date(now).toISOString() })
      } else if (gate.isOpen && now <= endMs) {
        const diff = Math.max(0, endMs - now)
        const m = Math.floor(diff / (1000 * 60))
        const s = Math.floor((diff / 1000) % 60)
        setCountdownText(`Còn ${m} phút ${String(s).padStart(2, '0')} giây`)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [gate.isOpen, gate.phase, settings.start_time, settings.end_time])

  const handleCastVote = async () => {
    if (uiState === 'SUBMITTING' || !gate.isOpen) return

    try {
      setUiState('SUBMITTING')
      setStatusMessage('')

      const sec = devicePayload || (await computeDeviceSecurityPayload())
      if (!devicePayload) setDevicePayload(sec)

      // Ensure we have a valid challenge token
      let activeChallenge = challenge
      if (!activeChallenge) {
        const preRes = await fetch(
          `/api/booth-vote?team=${encodeURIComponent(team.id)}&deviceHash=${sec.deviceHash}`,
          { cache: 'no-store' }
        )
        const preData = await preRes.json().catch(() => ({}))
        activeChallenge = preData.challenge || ''
      }

      const powNonce = await solveChallengePoW(activeChallenge, team.id, sec.deviceHash)

      const res = await fetch('/api/booth-vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: team.id,
          deviceHash: sec.deviceHash,
          canvasHash: sec.canvasHash,
          challenge: activeChallenge,
          powNonce,
          timezoneOffset: sec.timezoneOffset,
          incognitoSuspected: sec.incognitoSuspected,
        }),
      })

      const result = await res.json()

      if (res.ok && result.success) {
        const code = result.receiptCode || `BV-${team.msbc}`
        const timestamp = result.votedAt || new Date().toISOString()
        await saveLocalVoteReceipt({
          teamId: team.id,
          receiptCode: code,
          votedAt: timestamp,
        })
        setReceiptCode(code)
        setVotedAt(timestamp)
        setStatusMessage(result.message || 'Bình chọn gian hàng thành công!')
        setUiState('VOTED_SUCCESS')
        return
      }

      if (result.code === 'VPN_OR_PROXY_DETECTED') {
        setStatusMessage(
          result.message ||
            'Phát hiện kết nối VPN / Proxy / DNS trung gian. Vui lòng tắt VPN và dùng mạng trực tiếp.'
        )
        setUiState('VPN_BLOCKED')
        return
      }

      if (result.code && String(result.code).startsWith('ALREADY_VOTED')) {
        const code = result.receiptCode || `BV-${team.msbc}-LOCKED`
        await saveLocalVoteReceipt({
          teamId: team.id,
          receiptCode: code,
          votedAt: new Date().toISOString(),
        })
        setReceiptCode(code)
        setStatusMessage(
          result.message || 'Thiết bị hoặc địa chỉ IP này đã bình chọn cho đội thi này rồi.'
        )
        setUiState('ALREADY_VOTED')
        return
      }

      if (result.code === 'GATE_CLOSED') {
        setGate({ isOpen: false, phase: 'ENDED', serverTime: new Date().toISOString() })
        setStatusMessage(result.message || 'Cổng bình chọn gian hàng hiện đang đóng.')
        setUiState('READY')
        return
      }

      setStatusMessage(result.message || 'Không thể gửi bình chọn. Vui lòng thử lại.')
      setUiState('ERROR')
    } catch {
      setStatusMessage('Kết nối mạng gián đoạn. Vui lòng bấm thử lại.')
      setUiState('ERROR')
    }
  }

  return (
    <div className="min-h-screen bg-surface-base text-text-primary flex flex-col justify-between relative overflow-hidden">
      {/* Ambient Background Glow */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[500px] h-[320px] rounded-full bg-brand-cyan/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[450px] h-[280px] rounded-full bg-accent-violet/10 blur-[120px]" />
      </div>

      <main className="relative z-10 w-full max-w-md mx-auto px-4 pt-5 pb-10 flex-1 flex flex-col justify-center">
        {/* Official Event Top Bar */}
        <div className="flex items-center justify-between gap-2 mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-raised border border-surface-border text-[11px] font-mono uppercase tracking-wider text-text-secondary">
            <Sparkles className="size-3.5 text-brand-cyan shrink-0" />
            <span>Chung Kết • 08/11/2026</span>
          </div>

          {gate.isOpen ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-semantic-success/15 border border-semantic-success/40 text-semantic-success text-[11px] font-mono font-semibold">
              <span className="size-2 rounded-full bg-semantic-success animate-pulse" />
              <span>ĐANG MỞ VOTE</span>
            </div>
          ) : gate.phase === 'UPCOMING' ? (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-semantic-warning/15 border border-semantic-warning/40 text-semantic-warning text-[11px] font-mono font-semibold">
              <Clock className="size-3" />
              <span>14:00 – 15:30</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-raised border border-surface-border text-text-tertiary text-[11px] font-mono">
              <Lock className="size-3" />
              <span>ĐÃ ĐÓNG CỔNG</span>
            </div>
          )}
        </div>

        {/* Team Booth Main Card */}
        <div className="rounded-2xl border border-surface-border-strong bg-surface-overlay/95 backdrop-blur-md shadow-elevation-3 overflow-hidden">
          {/* Team Official Visual Poster + MSBC Badge */}
          <div className="relative w-full aspect-[4/3] bg-surface-raised overflow-hidden">
            <Image
              src={team.posterUrl}
              alt={`Đội thi ${team.name}`}
              fill
              priority
              sizes="(max-width: 640px) 100vw, 448px"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface-overlay via-surface-overlay/30 to-transparent" />

            {/* Top Badges on Image */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
              <span className="px-3 py-1 rounded-lg bg-surface-base/90 backdrop-blur-md border border-brand-cyan/50 font-mono text-xs font-bold text-brand-cyan shadow-lg">
                GIAN HÀNG #{team.msbc}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-surface-base/85 backdrop-blur-md border border-surface-border text-[11px] font-medium text-text-secondary truncate max-w-[60%]">
                {team.category}
              </span>
            </div>

            {/* Team Name Overlay at Bottom of Image */}
            <div className="absolute bottom-3 left-4 right-4">
              <p className="text-[11px] font-mono uppercase tracking-widest text-brand-cyan font-semibold mb-0.5">
                ĐỘI THI CHUNG KẾT
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-md">
                {team.name}
              </h1>
            </div>
          </div>

          {/* Team Info & Direct Action Body */}
          <div className="p-5 space-y-5">
            {/* Institution & Slogan */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Building2 className="size-3.5 text-brand-cyan shrink-0" />
                <span className="font-medium">{team.institution}</span>
              </div>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed line-clamp-3">
                {team.summary}
              </p>
            </div>

            {/* Interactive Voting State Box */}
            <div className="pt-1">
              {uiState === 'INITIALIZING' && (
                <div className="w-full py-6 rounded-xl border border-surface-border bg-surface-raised/60 flex flex-col items-center justify-center gap-2.5">
                  <div className="size-7 rounded-full border-2 border-brand-cyan border-t-transparent animate-spin" />
                  <span className="text-xs font-mono text-text-tertiary">
                    Đang kết nối cổng bình chọn gian hàng...
                  </span>
                </div>
              )}

              {uiState === 'VOTED_SUCCESS' && (
                <div className="rounded-xl border-2 border-semantic-success/60 bg-semantic-success/10 p-5 text-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
                  <div className="size-12 rounded-full bg-semantic-success/20 border border-semantic-success/40 flex items-center justify-center mx-auto text-semantic-success">
                    <CheckCircle2 className="size-7" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-bold text-semantic-success">
                      BÌNH CHỌN THÀNH CÔNG!
                    </h2>
                    <p className="text-xs text-text-secondary mt-1">
                      Cảm ơn bạn đã bình chọn cho gian hàng đội{' '}
                      <strong className="text-text-primary">{team.name}</strong>. Điểm số đã được
                      cập nhật trực tiếp về hệ thống BTC.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-semantic-success/20 flex items-center justify-between text-[11px] font-mono text-text-tertiary">
                    <span>Mã xác nhận: {receiptCode}</span>
                    <span>
                      {votedAt
                        ? new Date(votedAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })
                        : 'Hợp lệ'}
                    </span>
                  </div>
                </div>
              )}

              {uiState === 'ALREADY_VOTED' && (
                <div className="rounded-xl border border-brand-cyan/40 bg-brand-cyan/10 p-5 text-center space-y-3">
                  <div className="size-11 rounded-full bg-brand-cyan/20 border border-brand-cyan/40 flex items-center justify-center mx-auto text-brand-cyan">
                    <ShieldCheck className="size-6" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-brand-cyan">
                      ĐÃ GHI NHẬN BÌNH CHỌN CỦA BẠN
                    </h2>
                    <p className="text-xs text-text-secondary mt-1">
                      {statusMessage ||
                        `Bạn đã bình chọn cho gian hàng đội ${team.name}. Mỗi thiết bị / IP chỉ được bình chọn 1 lần cho mỗi đội.`}
                    </p>
                  </div>
                  {receiptCode && (
                    <div className="pt-2 border-t border-brand-cyan/20 text-[11px] font-mono text-text-tertiary">
                      Mã ghi nhận: <span className="text-brand-cyan font-semibold">{receiptCode}</span>
                    </div>
                  )}
                </div>
              )}

              {uiState === 'VPN_BLOCKED' && (
                <div className="rounded-xl border border-semantic-danger/50 bg-semantic-danger/10 p-5 text-center space-y-3">
                  <div className="size-11 rounded-full bg-semantic-danger/20 border border-semantic-danger/40 flex items-center justify-center mx-auto text-semantic-danger">
                    <ShieldAlert className="size-6" />
                  </div>
                  <div>
                    <h2 className="font-display text-base font-bold text-semantic-danger">
                      TỪ CHỐI KẾT NỐI VPN / PROXY / DNS GIẢ LẬP
                    </h2>
                    <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                      {statusMessage}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={verifySessionWithServer}
                    className="w-full py-2.5 px-4 rounded-lg bg-surface-raised hover:bg-surface-elevated border border-surface-border text-xs font-semibold text-text-primary inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <RefreshCw className="size-3.5" />
                    <span>Đã tắt VPN — Kiểm tra lại</span>
                  </button>
                </div>
              )}

              {(uiState === 'READY' || uiState === 'SUBMITTING' || uiState === 'ERROR') && (
                <div className="space-y-3">
                  {uiState === 'ERROR' && statusMessage && (
                    <div className="p-3 rounded-lg border border-semantic-danger/40 bg-semantic-danger/10 text-xs text-semantic-danger text-center">
                      {statusMessage}
                    </div>
                  )}

                  {gate.isOpen ? (
                    <>
                      <button
                        type="button"
                        disabled={uiState === 'SUBMITTING'}
                        onClick={handleCastVote}
                        className="w-full py-4 px-6 rounded-xl font-display text-base sm:text-lg font-extrabold tracking-wide uppercase text-slate-950 bg-gradient-to-r from-brand-cyan via-cyan-300 to-brand-cyan shadow-[0_0_25px_rgba(0,240,255,0.45)] hover:shadow-[0_0_35px_rgba(0,240,255,0.7)] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 disabled:opacity-60 cursor-pointer"
                      >
                        {uiState === 'SUBMITTING' ? (
                          <>
                            <div className="size-5 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                            <span>ĐANG GHI NHẬN ĐIỂM...</span>
                          </>
                        ) : (
                          <>
                            <Vote className="size-5 stroke-[2.5]" />
                            <span>BÌNH CHỌN CHO {team.name}</span>
                          </>
                        )}
                      </button>

                      {countdownText && (
                        <p className="text-center text-[11px] font-mono text-brand-cyan">
                          ⏱ Khung giờ bình chọn gian hàng: {countdownText}
                        </p>
                      )}
                    </>
                  ) : gate.phase === 'UPCOMING' ? (
                    <div className="rounded-xl border border-semantic-warning/40 bg-semantic-warning/10 p-4 text-center space-y-2">
                      <div className="flex items-center justify-center gap-1.5 text-semantic-warning text-xs font-mono font-bold uppercase">
                        <Clock className="size-4" />
                        <span>Chưa đến giờ mở cổng bình chọn</span>
                      </div>
                      <p className="text-xs text-text-secondary">
                        Phần thi gian hàng diễn ra từ{' '}
                        <strong className="text-text-primary">14:00 đến 15:30 ngày 08/11/2026</strong>.
                      </p>
                      {countdownText && (
                        <div className="pt-1 font-mono text-lg font-bold text-semantic-warning tracking-wider">
                          {countdownText}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-surface-border bg-surface-raised/80 p-4 text-center space-y-1.5">
                      <div className="flex items-center justify-center gap-1.5 text-text-secondary text-xs font-mono font-bold uppercase">
                        <Lock className="size-3.5" />
                        <span>Cổng bình chọn gian hàng đã khép lại</span>
                      </div>
                      <p className="text-xs text-text-tertiary">
                        Thời gian bình chọn (14:00 – 15:30 ngày 08/11/2026) đã kết thúc.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Zero-PII & Security Notice Footer inside Card */}
            <div className="pt-3 border-t border-surface-border flex items-center justify-between gap-2 text-[11px] text-text-tertiary">
              <span className="inline-flex items-center gap-1">
                <ShieldCheck className="size-3.5 text-brand-cyan shrink-0" />
                Không thu thập dữ liệu cá nhân
              </span>
              <span className="font-mono">1 IP/Máy = 1 Vote</span>
            </div>
          </div>
        </div>

        {/* Link back to full Top 10 overview if audience wants to browse */}
        <div className="mt-5 text-center">
          <Link
            href="/vote"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-text-tertiary hover:text-brand-cyan transition-colors"
          >
            <Tag className="size-3" />
            <span>Xem danh sách 10 đội thi Chung kết GenD Arena 2026</span>
          </Link>
        </div>
      </main>
    </div>
  )
}
