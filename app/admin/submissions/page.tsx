'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Loading from '@/components/loading'
import DotGridBackground from '@/components/dot-grid-background'
import { getDownloadUrl, getAllSubmissionsForAdmin, formatBytes } from '@/services/submissions'
import {
  getScoringRounds,
  saveAdminScore,
  type ScoringRound,
} from '@/services/scoring'
import type { AdminSubmissionRow, TopicCategory } from '@/types/submission'
import { TOPIC_CATEGORY_CONFIG, parseSubmissionAttachments } from '@/types/submission'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  ArrowLeft,
  FileText,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Scale,
  Pencil,
  BookOpen,
  User,
  MessageSquare,
  Presentation,
  FileSpreadsheet,
  Download,
  Search,
  CheckSquare,
  Square,
  Check,
  X,
} from 'lucide-react'
import { exportSubmissionsToExcel } from '@/services/exportSubmissions'

type Phase = { id: string; title: string }
type TabKey = 'all' | 'pending' | 'scored' | string

// ─── Topic Badge ──────────────────────────────────────────────────────────────

function TopicBadge({ topic }: { topic: TopicCategory | string | null | undefined }) {
  if (!topic) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium bg-surface-overlay border-surface-border text-text-tertiary">
        Chưa chọn chủ đề
      </span>
    )
  }
  const cfg = TOPIC_CATEGORY_CONFIG[topic as TopicCategory]
  if (!cfg) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium bg-surface-overlay border-surface-border text-text-tertiary">
        {topic}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'brand'; icon: React.ReactNode }> = {
    pending:   { label: 'Chờ chấm', variant: 'default',  icon: <Clock className="size-3" /> },
    submitted: { label: 'Đã nộp',   variant: 'default',  icon: <Clock className="size-3" /> },
    scored:    { label: 'Đã chấm',  variant: 'success',  icon: <CheckCircle className="size-3" /> },
    reviewing: { label: 'Đang xem', variant: 'info',     icon: <AlertCircle className="size-3" /> },
    rejected:  { label: 'Từ chối',  variant: 'danger',   icon: <XCircle className="size-3" /> },
  }
  const badge = map[status] ?? { label: status, variant: 'default' as const, icon: null }
  return (
    <Badge variant={badge.variant} size="sm">
      <span className="flex items-center gap-1">
        {badge.icon}
        {badge.label}
      </span>
    </Badge>
  )
}

function parseCommentAndJudge(rawComment?: string | null): { judgeName: string; comment: string } {
  if (!rawComment) return { judgeName: '', comment: '' }
  const match = rawComment.match(/^\[BGK:\s*([^\]]+)\]\s*([\s\S]*)$/)
  if (match) {
    return {
      judgeName: match[1].trim(),
      comment: match[2].trim(),
    }
  }
  return { judgeName: '', comment: rawComment }
}

// ─── Admin Scoring Dialog ─────────────────────────────────────────────────────

interface ScoringModalProps {
  submission: AdminSubmissionRow
  rounds: ScoringRound[]
  adminId: string
  onClose: () => void
  onSaved: () => void
}

function AdminScoringModal({ submission, rounds, adminId, onClose, onSaved }: ScoringModalProps) {
  // Find default round matching submission phase, or active/first round
  const defaultRound = useMemo(() => {
    if (submission.phase_id) {
      const match = rounds.find(r => r.phase_id === submission.phase_id)
      if (match) return match
    }
    return rounds.find(r => r.scoring_open) ?? rounds[0] ?? null
  }, [rounds, submission.phase_id])

  const existingScore = submission.scores?.[0]
  const parsed = useMemo(() => parseCommentAndJudge(existingScore?.comment), [existingScore?.comment])

  const [selectedRoundId, setSelectedRoundId] = useState<string>(
    existingScore?.round_id || defaultRound?.id || ''
  )
  const [offlineJudgeName, setOfflineJudgeName] = useState(parsed.judgeName)
  const [comment, setComment] = useState(parsed.comment)
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>(() => {
    if (existingScore?.criteria_scores && Object.keys(existingScore.criteria_scores).length > 0) {
      return { ...existingScore.criteria_scores }
    }
    return {}
  })
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const activeRound = useMemo(() => {
    return rounds.find(r => r.id === selectedRoundId) ?? defaultRound
  }, [rounds, selectedRoundId, defaultRound])

  // Real-time calculated total score based on weights
  const computedTotalScore = useMemo(() => {
    if (!activeRound?.criteria || activeRound.criteria.length === 0) {
      const vals = Object.values(criteriaScores)
      if (vals.length === 0) return 0
      const sum = vals.reduce((acc, v) => acc + (Number(v) || 0), 0)
      return Math.round((sum / vals.length) * 10) / 10
    }

    let weightedSum = 0
    let totalWeight = 0

    for (const crit of activeRound.criteria) {
      const weight = Number(crit.weight) || 0
      const score = Number(criteriaScores[crit.id]) || 0
      weightedSum += score * weight
      totalWeight += weight
    }

    if (totalWeight === 0) return 0
    const finalScore = weightedSum / totalWeight
    return Math.round(finalScore * 10) / 10
  }, [activeRound, criteriaScores])

  const handleScoreChange = (criterionId: string, value: string, maxScore = 10) => {
    const num = parseFloat(value)
    if (isNaN(num)) {
      setCriteriaScores(prev => {
        const next = { ...prev }
        delete next[criterionId]
        return next
      })
    } else {
      const clamped = Math.min(maxScore, Math.max(0, num))
      setCriteriaScores(prev => ({
        ...prev,
        [criterionId]: clamped,
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrorMsg('')

    const result = await saveAdminScore({
      submission_id: submission.id,
      admin_id: adminId,
      round_id: activeRound?.id || null,
      criteria_scores: criteriaScores,
      offline_judge_name: offlineJudgeName.trim() || null,
      comment: comment.trim() || null,
      total_score: computedTotalScore,
    })

    setSaving(false)

    if (!result.ok) {
      setErrorMsg(result.error || 'Lưu điểm thất bại.')
    } else {
      onSaved()
      onClose()
    }
  }

  const attachments = submission.attachments || parseSubmissionAttachments(submission)

  const openFileOrUrl = async (path?: string | null, url?: string | null) => {
    if (url) {
      window.open(url, '_blank')
      return
    }
    if (path) {
      const signedUrl = await getDownloadUrl(path)
      if (signedUrl) window.open(signedUrl, '_blank')
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-7">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Scale className="size-5 text-brand-cyan" />
            <DialogTitle className="text-lg font-bold text-text-primary">
              Chấm điểm bài dự thi (Admin Entry)
            </DialogTitle>
          </div>
          <DialogDescription>
            Nhập kết quả đánh giá theo barem tiêu chí thay cho Ban Giám Khảo ngoại tuyến.
          </DialogDescription>
        </DialogHeader>

        {/* Submission Context Info Box */}
        <div className="mt-3 p-4 rounded-xl border border-surface-border bg-surface-overlay space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display text-base font-bold text-text-primary">
              {submission.teams?.name ?? 'Đội thi'}
            </h3>
            <div className="flex items-center gap-2">
              <TopicBadge topic={submission.topic} />
              <StatusBadge status={submission.status} />
            </div>
          </div>

          <div className="text-xs text-text-secondary pt-1 border-t border-surface-border">
            <span>
              Vòng thi: <strong className="text-text-primary">{submission.competition_phases?.title ?? '—'}</strong>
            </span>
          </div>

          {/* Dual Deliverables View Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-surface-border">
            {attachments?.pitch_deck && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<Presentation className="size-3.5 text-brand-cyan" />}
                rightIcon={<ExternalLink className="size-3" />}
                onClick={() => openFileOrUrl(attachments.pitch_deck.file_path, attachments.pitch_deck.url)}
                className="text-xs h-8"
              >
                Slide Pitch-Deck: {attachments.pitch_deck.kind === 'file' ? (attachments.pitch_deck.file_name || 'File Slide') : 'Link trực tuyến'}
              </Button>
            )}
            {attachments?.report && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                leftIcon={<FileSpreadsheet className="size-3.5 text-emerald-400" />}
                rightIcon={<ExternalLink className="size-3" />}
                onClick={() => openFileOrUrl(attachments.report.file_path, attachments.report.url)}
                className="text-xs h-8"
              >
                Báo cáo Đề án: {attachments.report.kind === 'file' ? (attachments.report.file_name || 'File Đề án') : 'Link trực tuyến'}
              </Button>
            )}
          </div>
        </div>

        {errorMsg && (
          <div className="mt-3 p-3 rounded-lg bg-semantic-danger/10 border border-semantic-danger/30 text-xs text-semantic-danger flex items-start gap-2">
            <AlertCircle className="size-4 shrink-0 text-semantic-danger mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Round Selector & Rubric link */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="scoring-round-select" className="block text-xs font-semibold text-text-secondary">
                Vòng chấm &amp; Barem áp dụng <span className="text-semantic-danger">*</span>
              </label>
              {activeRound?.rubric_url && (
                <a
                  href={activeRound.rubric_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-brand-cyan hover:underline"
                >
                  <BookOpen className="size-3.5" />
                  <span>Xem tài liệu barem</span>
                </a>
              )}
            </div>
            {rounds.length > 0 ? (
              <select
                id="scoring-round-select"
                value={selectedRoundId}
                onChange={(e) => setSelectedRoundId(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-surface-border bg-surface-raised text-sm text-text-primary outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/30 transition-colors cursor-pointer"
              >
                {rounds.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title} {r.scoring_open ? '(Đang mở)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 rounded-lg border border-surface-border bg-surface-overlay text-xs text-text-tertiary">
                Chưa có vòng chấm nào được kích hoạt.
              </div>
            )}
          </div>

          {/* Criteria scoring inputs */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                Barem tiêu chí đánh giá
              </span>
              <span className="text-xs text-text-secondary font-mono">Thang điểm 0 - 10</span>
            </div>

            {activeRound?.criteria && activeRound.criteria.length > 0 ? (
              <div className="space-y-3">
                {activeRound.criteria.map((crit) => {
                  const currentScore = criteriaScores[crit.id] ?? ''
                  return (
                    <div
                      key={crit.id}
                      className="p-3.5 rounded-lg border border-surface-border bg-surface-overlay/80 hover:border-surface-border-strong transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <div>
                          <p className="font-medium text-sm text-text-primary">{crit.name}</p>
                          <p className="text-xs text-text-tertiary mt-1">
                            Trọng số: <span className="text-brand-cyan font-mono font-semibold">{crit.weight}%</span> · Tối đa: <span className="text-text-secondary font-mono">{crit.max_score}đ</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-center">
                          <Input
                            type="number"
                            min={0}
                            max={crit.max_score}
                            step={0.1}
                            value={currentScore}
                            onChange={(e) => handleScoreChange(crit.id, e.target.value, crit.max_score)}
                            placeholder="0.0"
                            className="w-24 text-center font-mono font-bold text-sm bg-surface-raised"
                          />
                          <span className="text-xs text-text-tertiary font-mono">/ {crit.max_score}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Fallback 4 standard criteria if no custom criteria exist in DB */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: 'innovation', label: 'Tính sáng tạo & Đổi mới', weight: '25%' },
                  { key: 'feasibility', label: 'Tính khả thi & Kỹ thuật', weight: '25%' },
                  { key: 'practicality', label: 'Tính thực tiễn & Tác động', weight: '25%' },
                  { key: 'presentation', label: 'Trình bày & Hoàn thiện', weight: '25%' },
                ].map((crit) => (
                  <div key={crit.key} className="p-3 rounded-lg border border-surface-border bg-surface-overlay space-y-1.5">
                    <label className="block text-xs font-medium text-text-primary">
                      {crit.label} <span className="text-brand-cyan font-mono text-[11px]">({crit.weight})</span>
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={10}
                      step={0.1}
                      value={criteriaScores[crit.key] ?? ''}
                      onChange={(e) => handleScoreChange(crit.key, e.target.value, 10)}
                      placeholder="Điểm 0 - 10"
                      className="font-mono"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Real-time Total Score Preview */}
          <div className="p-4 rounded-xl border border-brand-cyan/30 bg-brand-cyan/5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-cyan">
                Tổng điểm quy đổi (Hệ 10)
              </p>
              <p className="text-xs text-text-secondary mt-0.5">
                Tự động tính theo trọng số của các tiêu chí
              </p>
            </div>
            <div className="text-right">
              <span className="font-mono text-3xl font-extrabold text-brand-cyan">
                {computedTotalScore.toFixed(2)}
              </span>
              <span className="text-xs text-text-tertiary ml-1 font-mono">/ 10</span>
            </div>
          </div>

          {/* Offline Judge Name (Optional) */}
          <div className="space-y-1.5">
            <label htmlFor="offline-judge-name" className="block text-xs font-semibold text-text-secondary">
              Tên Giám khảo chấm thi (Ngoại tuyến)
            </label>
            <Input
              id="offline-judge-name"
              type="text"
              value={offlineJudgeName}
              onChange={(e) => setOfflineJudgeName(e.target.value)}
              placeholder="VD: TS. Nguyễn Văn A, Giám khảo 1..."
              leftIcon={<User className="size-4" />}
            />
            <p className="text-[11px] text-text-tertiary">
              Ghi chú tên chuyên gia/giám khảo đã trực tiếp chấm bài nộp này
            </p>
          </div>

          {/* Feedback & Comments */}
          <div className="space-y-1.5">
            <label htmlFor="score-comment" className="block text-xs font-semibold text-text-secondary">
              Nhận xét &amp; Đánh giá chi tiết
            </label>
            <textarea
              id="score-comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Nhập nhận xét, ưu điểm, nhược điểm và đóng góp cho đề án của đội thi..."
              className="w-full rounded-lg border border-surface-border bg-surface-raised px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/30 transition-colors resize-none"
            />
          </div>

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-border">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onClose}
              disabled={saving}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={saving}
              leftIcon={<CheckCircle className="size-4" />}
            >
              {existingScore ? 'Cập nhật điểm' : 'Lưu điểm bài thi'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Export Excel Modal ───────────────────────────────────────────────────────

interface ExportExcelModalProps {
  phases: Phase[]
  submissions: AdminSubmissionRow[]
  initialSelectedIds?: string[]
  activePhaseId?: string
  onClose: () => void
  onExportSuccess: (message: string) => void
}

function ExportExcelModal({
  phases,
  submissions,
  initialSelectedIds = [],
  activePhaseId,
  onClose,
  onExportSuccess,
}: ExportExcelModalProps) {
  const defaultPhaseId = useMemo(() => {
    if (activePhaseId && activePhaseId !== 'all' && activePhaseId !== 'pending' && activePhaseId !== 'scored') {
      return activePhaseId
    }
    const prelim = phases.find(
      (p) => p.title.toLowerCase().includes('sơ loại') || p.title.toLowerCase().includes('dream')
    )
    return prelim?.id || 'all'
  }, [phases, activePhaseId])

  const [selectedPhaseId, setSelectedPhaseId] = useState<string>(defaultPhaseId)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'scored'>('all')
  const [isExporting, setIsExporting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Danh sách bài nộp theo vòng thi được chọn
  const phaseSubmissions = useMemo(() => {
    if (selectedPhaseId === 'all') return submissions
    return submissions.filter((s) => s.phase_id === selectedPhaseId)
  }, [submissions, selectedPhaseId])

  // Tập hợp ID các bài nộp được chọn để xuất
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (initialSelectedIds.length > 0) {
      return new Set(initialSelectedIds)
    }
    // Mặc định chọn tất cả các bài thuộc vòng thi đang hiển thị
    const initialPool = defaultPhaseId === 'all'
      ? submissions
      : submissions.filter((s) => s.phase_id === defaultPhaseId)
    return new Set(initialPool.map((s) => s.id))
  })

  // Danh sách bài nộp hiển thị (đã áp dụng lọc Vòng + Tìm kiếm + Trạng thái)
  const visibleSubmissions = useMemo(() => {
    return phaseSubmissions.filter((sub) => {
      // Lọc trạng thái
      if (statusFilter === 'pending') {
        const isPending = sub.status === 'pending' || sub.status === 'submitted' || sub.status === 'reviewing'
        if (!isPending) return false
      } else if (statusFilter === 'scored') {
        const isScored = sub.status === 'scored' || (sub.scores && sub.scores.length > 0)
        if (!isScored) return false
      }

      // Lọc từ khóa tìm kiếm (tên đội, chủ đề, tên file)
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      const teamName = (sub.teams?.name || '').toLowerCase()
      const topic = (sub.topic || '').toLowerCase()
      const fileName = (sub.file_name || '').toLowerCase()
      return teamName.includes(q) || topic.includes(q) || fileName.includes(q)
    })
  }, [phaseSubmissions, statusFilter, searchQuery])

  // Chọn / bỏ chọn 1 bài
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Chọn tất cả các bài đang hiển thị theo bộ lọc
  const handleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      visibleSubmissions.forEach((s) => next.add(s.id))
      return next
    })
  }

  // Bỏ chọn tất cả các bài đang hiển thị
  const handleDeselectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      visibleSubmissions.forEach((s) => next.delete(s.id))
      return next
    })
  }

  // Xóa toàn bộ lựa chọn
  const handleClearAll = () => {
    setSelectedIds(new Set())
  }

  const allVisibleSelected =
    visibleSubmissions.length > 0 &&
    visibleSubmissions.every((s) => selectedIds.has(s.id))

  const handleStartExport = async () => {
    if (selectedIds.size === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 bài nộp để xuất file Excel.')
      return
    }

    setIsExporting(true)
    setErrorMsg('')
    try {
      const targetPhase = phases.find((p) => p.id === selectedPhaseId)
      const res = await exportSubmissionsToExcel({
        phaseId: selectedPhaseId === 'all' ? undefined : selectedPhaseId,
        phaseTitle: selectedPhaseId === 'all' ? 'Tất cả các vòng' : targetPhase?.title,
        submissionIds: Array.from(selectedIds),
      })

      if (!res.ok) {
        setErrorMsg(res.error || 'Xuất file Excel thất bại.')
        setIsExporting(false)
      } else {
        onExportSuccess(
          `Đã xuất thành công ${res.count} bài nộp ra file "${res.filename}"! File gồm Sheet 1 (Danh sách bài thi) và Sheet 2 (Chi tiết thí sinh của các đội được chọn).`
        )
        onClose()
      }
    } catch (err: unknown) {
      console.error('Export error:', err)
      const msg = err instanceof Error ? err.message : String(err || 'Đã xảy ra lỗi không xác định khi xuất file.')
      setErrorMsg(msg)
      setIsExporting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !isExporting && onClose()}>
      <DialogContent className="max-w-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <FileSpreadsheet className="size-5 text-emerald-400" />
            <DialogTitle className="text-lg font-bold text-text-primary">
              Xuất dữ liệu bài nộp ra Excel (BGK)
            </DialogTitle>
          </div>
          <DialogDescription>
            Chọn các bài nộp cần xuất để tạo file Excel. Hệ thống sẽ chỉ xuất bài thi và danh sách thí sinh của các đội thi tương ứng.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 my-2 text-xs">
          {/* Controls: Phase Selector + Search */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                Lọc theo vòng thi:
              </label>
              <select
                value={selectedPhaseId}
                onChange={(e) => {
                  const newPhase = e.target.value
                  setSelectedPhaseId(newPhase)
                }}
                disabled={isExporting}
                className="w-full h-9 px-3 rounded-lg border border-surface-border bg-surface-raised text-xs text-text-primary outline-none focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan/30 transition cursor-pointer"
              >
                <option value="all">Tất cả các vòng thi ({submissions.length})</option>
                {phases.map((p) => {
                  const count = submissions.filter((s) => s.phase_id === p.id).length
                  return (
                    <option key={p.id} value={p.id}>
                      {p.title} ({count})
                    </option>
                  )
                })}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                Tìm kiếm đội thi / chủ đề:
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-text-tertiary" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Nhập tên đội, chủ đề..."
                  disabled={isExporting}
                  className="h-9 pl-8 pr-7 text-xs bg-surface-raised border-surface-border"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick selection toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 rounded-lg bg-surface-overlay border border-surface-border">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-text-primary flex items-center gap-1.5">
                <CheckCircle className="size-3.5 text-emerald-400" />
                Đã chọn: <span className="text-emerald-400 font-bold">{selectedIds.size}</span> / {phaseSubmissions.length} bài
              </span>
            </div>

            <div className="flex items-center gap-2">
              {allVisibleSelected ? (
                <button
                  type="button"
                  onClick={handleDeselectAllVisible}
                  disabled={isExporting}
                  className="text-text-tertiary hover:text-text-primary transition underline text-[11px]"
                >
                  Bỏ chọn kết quả hiển thị
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSelectAllVisible}
                  disabled={isExporting}
                  className="text-brand-cyan hover:underline transition font-medium text-[11px]"
                >
                  Chọn tất cả hiển thị ({visibleSubmissions.length})
                </button>
              )}
              {selectedIds.size > 0 && (
                <>
                  <span className="text-text-disabled">·</span>
                  <button
                    type="button"
                    onClick={handleClearAll}
                    disabled={isExporting}
                    className="text-semantic-danger hover:underline transition text-[11px]"
                  >
                    Bỏ chọn tất cả
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Scrollable list of selectable submissions */}
          <div className="max-h-64 sm:max-h-72 overflow-y-auto space-y-1.5 p-1 rounded-lg border border-surface-border bg-surface-base/60">
            {visibleSubmissions.length === 0 ? (
              <div className="p-8 text-center text-text-tertiary space-y-1">
                <FileText className="size-8 mx-auto text-text-disabled mb-1" />
                <p className="font-medium text-text-secondary">Không tìm thấy bài nộp nào</p>
                <p className="text-[11px]">Thử đổi vòng thi hoặc xóa bớt từ khóa tìm kiếm</p>
              </div>
            ) : (
              visibleSubmissions.map((sub) => {
                const isChecked = selectedIds.has(sub.id)
                const scoreRecord = sub.scores?.[0]
                const hasScore = typeof scoreRecord?.total_score === 'number'
                const attachments = sub.attachments || parseSubmissionAttachments(sub)

                return (
                  <div
                    key={sub.id}
                    onClick={() => toggleSelect(sub.id)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-colors cursor-pointer select-none ${
                      isChecked
                        ? 'bg-emerald-950/25 border-emerald-500/50 text-text-primary shadow-xs'
                        : 'bg-surface-overlay/80 border-surface-border hover:border-surface-border-strong text-text-secondary'
                    }`}
                  >
                    <div className="pt-0.5 shrink-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(sub.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="size-4 rounded border-surface-border accent-emerald-500 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`text-xs font-semibold truncate ${isChecked ? 'text-text-primary' : 'text-text-secondary'}`}>
                          {sub.teams?.name || 'Đội thi'}
                        </span>
                        <TopicBadge topic={sub.topic} />
                        {hasScore ? (
                          <Badge variant="success" size="sm" className="text-[10px] font-mono py-0">
                            {scoreRecord?.total_score.toFixed(1)} / 10
                          </Badge>
                        ) : (
                          <Badge variant="default" size="sm" className="text-[10px] py-0">
                            Chờ chấm
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 text-[11px] text-text-tertiary">
                        <span>{sub.competition_phases?.title || phases.find((p) => p.id === sub.phase_id)?.title || 'Vòng thi'}</span>
                        <span>·</span>
                        <span>{new Date(sub.uploaded_at).toLocaleString('vi-VN')}</span>
                        {attachments?.pitch_deck && (
                          <>
                            <span>·</span>
                            <span className="text-brand-cyan">Slide</span>
                          </>
                        )}
                        {attachments?.report && (
                          <>
                            <span>·</span>
                            <span className="text-emerald-400">Báo cáo</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Info Card */}
          <div className="p-3 rounded-lg border border-surface-border bg-surface-overlay text-[11px] text-text-secondary space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-text-primary">
              <FileSpreadsheet className="size-3.5 text-emerald-400 shrink-0" />
              <span>Cấu trúc xuất: Sheet 1 (Danh sách bài thi) + Sheet 2 (Danh sách thí sinh)</span>
            </div>
            <p className="text-text-tertiary">
              File Excel tải về sẽ gồm: <strong>Sheet 1</strong> (Tên đội, Tên đội trưởng, Lĩnh vực, Link mở Pitch-Deck, Link mở Báo cáo Đề án) và <strong>Sheet 2</strong> (Danh sách chi tiết thí sinh của các đội được chọn). Link tải file mở trực tiếp trong 30 ngày cho BGK.
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-semantic-danger/10 border border-semantic-danger/30 text-semantic-danger flex items-start gap-2">
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-surface-border">
          <div className="text-xs text-text-secondary">
            {selectedIds.size === 0 ? (
              <span className="text-semantic-warning">Chưa chọn bài nộp nào</span>
            ) : (
              <span>Đã chọn <strong>{selectedIds.size}</strong> bài nộp</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={isExporting}
            >
              Hủy
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              leftIcon={<Download className="size-4" />}
              isLoading={isExporting}
              disabled={selectedIds.size === 0 || isExporting}
              onClick={handleStartExport}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium disabled:opacity-50"
            >
              {isExporting
                ? 'Đang tạo link & file Excel...'
                : selectedIds.size > 0
                ? `Bắt đầu xuất Excel (${selectedIds.size} bài)`
                : 'Chọn bài để xuất'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Submissions Page ────────────────────────────────────────────────────

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState<AdminSubmissionRow[]>([])
  const [phases, setPhases] = useState<Phase[]>([])
  const [rounds, setRounds] = useState<ScoringRound[]>([])
  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUid, setCurrentUid] = useState<string>('')
  const [successToast, setSuccessToast] = useState<string | null>(null)
  const [scoringSubmission, setScoringSubmission] = useState<AdminSubmissionRow | null>(null)
  const [showExportModal, setShowExportModal] = useState(false)
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<string[]>([])

  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const loadData = useCallback(async () => {
    try {
      setError(null)
      const [subs, roundsData, phasesRes] = await Promise.all([
        getAllSubmissionsForAdmin(),
        getScoringRounds(),
        supabase.from('competition_phases').select('id, title').order('phase_number'),
      ])
      setSubmissions(subs)
      setRounds(roundsData)
      setPhases(phasesRes.data ?? [])
    } catch (err: unknown) {
      console.error('Failed to load submissions:', err)
      const msg = err instanceof Error ? err.message : String(err || 'Không thể tải danh sách bài nộp.')
      setError(msg)
    }
  }, [supabase])

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login?redirect=/admin/submissions')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      setCurrentUid(user.id)
      await loadData()
      setLoading(false)
    }
    init()
  }, [supabase, router, loadData])

  const openFileOrUrl = async (path?: string | null, url?: string | null) => {
    if (url) {
      window.open(url, '_blank')
      return
    }
    if (path) {
      const signedUrl = await getDownloadUrl(path)
      if (signedUrl) window.open(signedUrl, '_blank')
    }
  }

  // Tab filtering
  const filtered = submissions.filter((sub) => {
    if (activeTab === 'all') return true
    if (activeTab === 'pending') return sub.status === 'pending' || sub.status === 'submitted' || sub.status === 'reviewing'
    if (activeTab === 'scored') return sub.status === 'scored' || (sub.scores && sub.scores.length > 0)
    return sub.phase_id === activeTab
  })

  const pendingCount = submissions.filter(s => s.status === 'pending' || s.status === 'submitted' || s.status === 'reviewing').length
  const scoredCount = submissions.filter(s => s.status === 'scored' || (s.scores && s.scores.length > 0)).length

  if (loading) return <Loading text="Đang tải danh sách bài nộp & barem..." />

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'all', label: 'Tất cả', count: submissions.length },
    { key: 'pending', label: 'Chờ chấm', count: pendingCount },
    { key: 'scored', label: 'Đã chấm', count: scoredCount },
    ...phases.map(p => ({ key: p.id, label: p.title })),
  ]

  return (
    <div className="relative min-h-screen bg-surface-base text-text-primary overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <DotGridBackground />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-cyan/5 blur-[120px]" />
      </div>

      {/* Internal Page Header */}
      <header className="relative z-10 border-b border-surface-border bg-surface-base/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary transition-colors duration-[150ms] mb-4"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Quay lại Control Center
          </Link>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="size-5 text-brand-cyan shrink-0" aria-hidden="true" />
                <Badge variant="warning" size="sm">BTC</Badge>
              </div>
              <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
                Quản lý &amp; Chấm điểm bài dự thi
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Xem chi tiết bài thi, nhập điểm barem thay cho Ban Giám Khảo và quản lý tiến độ chấm thi
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="md"
                leftIcon={<Download className="size-4 text-emerald-400" />}
                onClick={() => setShowExportModal(true)}
                className="border-emerald-500/40 hover:border-emerald-500/70 hover:bg-emerald-500/10 text-emerald-300 font-semibold"
              >
                {selectedSubmissionIds.length > 0
                  ? `Xuất Excel (${selectedSubmissionIds.length} bài đã chọn)`
                  : 'Xuất Excel cho BGK'}
              </Button>
              <Link href="/admin/scoring">
                <Button variant="secondary" size="md" leftIcon={<Scale className="size-4" />}>
                  Cấu hình tiêu chí
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-8 space-y-6">
        {/* Success Toast / Alert */}
        {successToast && (
          <div
            role="status"
            className="flex items-center justify-between gap-3 rounded-lg border border-semantic-success/30 bg-semantic-success/10 px-4 py-3 text-sm text-semantic-success animate-in fade-in duration-200"
          >
            <div className="flex items-center gap-2.5">
              <CheckCircle className="size-4 shrink-0" />
              <span>{successToast}</span>
            </div>
            <button
              onClick={() => setSuccessToast(null)}
              className="text-xs text-semantic-success hover:underline"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Error State Banner */}
        {error && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-lg border border-semantic-danger/30 bg-semantic-danger/10 px-4 py-3 text-sm text-semantic-danger"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadData()}
              className="text-semantic-danger hover:bg-semantic-danger/10 hover:text-semantic-danger shrink-0"
            >
              Thử lại
            </Button>
          </div>
        )}

        {/* Tab Bar */}
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Lọc bài nộp">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-medium transition-colors duration-150 ${
                activeTab === tab.key
                  ? 'bg-brand-cyan/15 border-brand-cyan text-brand-cyan font-semibold'
                  : 'bg-surface-overlay border-surface-border text-text-secondary hover:border-surface-border-strong hover:text-text-primary'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={`px-1.5 py-px rounded text-[10px] font-bold ${
                  activeTab === tab.key ? 'bg-brand-cyan/20 text-brand-cyan' : 'bg-surface-raised text-text-tertiary'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Submissions List Header & Selection Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary pt-1">
          <div className="flex items-center gap-2">
            <span>Hiển thị <strong>{filtered.length}</strong> bài nộp</span>
            {selectedSubmissionIds.length > 0 && (
              <span className="text-emerald-400 font-medium">
                · Đã chọn {selectedSubmissionIds.length} bài
              </span>
            )}
          </div>
          {filtered.length > 0 && (
            <div className="flex items-center gap-2">
              {filtered.every((s) => selectedSubmissionIds.includes(s.id)) ? (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedSubmissionIds((prev) =>
                      prev.filter((id) => !filtered.some((f) => f.id === id))
                    )
                  }
                  className="text-text-tertiary hover:text-text-primary transition underline text-xs"
                >
                  Bỏ chọn danh sách này
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const newIds = new Set(selectedSubmissionIds)
                    filtered.forEach((f) => newIds.add(f.id))
                    setSelectedSubmissionIds(Array.from(newIds))
                  }}
                  className="text-brand-cyan hover:underline transition text-xs font-medium"
                >
                  Chọn tất cả {filtered.length} bài trong tab này
                </button>
              )}
              {selectedSubmissionIds.length > 0 && (
                <>
                  <span className="text-text-disabled">·</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSubmissionIds([])}
                    className="text-semantic-danger hover:underline transition text-xs"
                  >
                    Xóa chọn
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Submissions List */}
        {filtered.length === 0 ? (
          <Card className="p-12 text-center text-text-tertiary">
            <FileText className="size-10 text-text-disabled mx-auto mb-2" />
            <p className="text-sm">
              {activeTab === 'pending'
                ? 'Tất cả các bài nộp đã được chấm điểm hoàn tất.'
                : activeTab === 'scored'
                ? 'Chưa có bài nộp nào được nhập điểm.'
                : 'Chưa có bài nộp nào phù hợp với bộ lọc.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((sub) => {
              const isSelected = selectedSubmissionIds.includes(sub.id)
              const scoreRecord = sub.scores?.[0]
              const hasScore = typeof scoreRecord?.total_score === 'number'
              const parsedJudge = parseCommentAndJudge(scoreRecord?.comment)
              const attachments = sub.attachments || parseSubmissionAttachments(sub)

              return (
                <Card
                  key={sub.id}
                  className={`p-5 transition-colors duration-150 ${
                    isSelected
                      ? 'border-emerald-500/50 bg-emerald-950/10'
                      : 'hover:border-surface-border-strong'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Checkbox for selecting submission */}
                      <div className="pt-0.5 shrink-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedSubmissionIds((prev) =>
                              prev.includes(sub.id) ? prev.filter((id) => id !== sub.id) : [...prev, sub.id]
                            )
                          }}
                          title="Chọn bài này để xuất Excel"
                          className="size-4 rounded border-surface-border accent-emerald-500 cursor-pointer"
                        />
                      </div>

                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Team name + badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-base font-semibold text-text-primary">
                            {sub.teams?.name ?? 'Đội thi'}
                          </h3>
                          <StatusBadge status={sub.status} />
                          <TopicBadge topic={sub.topic} />

                          {/* Score Badge */}
                          {hasScore ? (
                            <Badge variant="success" size="sm" className="font-mono font-bold">
                              <CheckCircle className="size-3 mr-1" />
                              Điểm: {scoreRecord?.total_score.toFixed(1)} / 10
                            </Badge>
                          ) : (
                            <Badge variant="warning" size="sm">
                              <Clock className="size-3 mr-1" />
                              Chưa chấm
                            </Badge>
                          )}
                        </div>

                      {/* Phase + Timestamp */}
                      <p className="text-xs text-text-tertiary">
                        {sub.competition_phases?.title ?? phases.find(p => p.id === sub.phase_id)?.title ?? '—'}
                        {' · '}
                        {new Date(sub.uploaded_at).toLocaleString('vi-VN')}
                        {sub.file_size && (
                          <span className="font-mono ml-2">
                            · Tổng file: {formatBytes(sub.file_size)}
                          </span>
                        )}
                      </p>

                      {/* Dual Deliverables View Buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {attachments?.pitch_deck && (
                          <button
                            type="button"
                            onClick={() => openFileOrUrl(attachments.pitch_deck.file_path, attachments.pitch_deck.url)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-overlay hover:bg-surface-raised border border-surface-border text-xs text-text-secondary hover:text-text-primary transition group"
                          >
                            <Presentation className="size-3.5 text-brand-cyan shrink-0" />
                            <span className="text-text-tertiary">Slide:</span>
                            <span className="font-medium text-text-primary truncate max-w-[130px] sm:max-w-[180px]">
                              {attachments.pitch_deck.file_name || attachments.pitch_deck.url || 'Pitch-Deck'}
                            </span>
                            <ExternalLink className="size-3 text-text-tertiary group-hover:text-brand-cyan" />
                          </button>
                        )}

                        {attachments?.report && (
                          <button
                            type="button"
                            onClick={() => openFileOrUrl(attachments.report.file_path, attachments.report.url)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-overlay hover:bg-surface-raised border border-surface-border text-xs text-text-secondary hover:text-text-primary transition group"
                          >
                            <FileSpreadsheet className="size-3.5 text-emerald-400 shrink-0" />
                            <span className="text-text-tertiary">Đề án:</span>
                            <span className="font-medium text-text-primary truncate max-w-[130px] sm:max-w-[180px]">
                              {attachments.report.file_name || attachments.report.url || 'Báo cáo'}
                            </span>
                            <ExternalLink className="size-3 text-text-tertiary group-hover:text-emerald-400" />
                          </button>
                        )}
                      </div>

                      {/* Offline Judge & Comment Note if present */}
                      {(parsedJudge.judgeName || parsedJudge.comment) && (
                        <div className="mt-2 p-2.5 rounded-lg bg-surface-overlay border border-surface-border text-xs space-y-1">
                          {parsedJudge.judgeName && (
                            <p className="text-brand-cyan font-medium flex items-center gap-1.5">
                              <User className="size-3" />
                              <span>BGK chấm: {parsedJudge.judgeName}</span>
                            </p>
                          )}
                          {parsedJudge.comment && (
                            <p className="text-text-secondary italic flex items-start gap-1.5">
                              <MessageSquare className="size-3 shrink-0 mt-0.5 text-text-tertiary" />
                              <span>{parsedJudge.comment}</span>
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Button
                        variant={hasScore ? 'secondary' : 'primary'}
                        size="sm"
                        leftIcon={hasScore ? <Pencil className="size-3.5" /> : <Scale className="size-3.5" />}
                        onClick={() => setScoringSubmission(sub)}
                      >
                        {hasScore ? 'Sửa điểm' : 'Nhập điểm (Chấm thi)'}
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>

      {/* Admin Scoring Modal */}
      {scoringSubmission && (
        <AdminScoringModal
          submission={scoringSubmission}
          rounds={rounds}
          adminId={currentUid}
          onSaved={() => {
            setSuccessToast('Đã lưu kết quả chấm điểm thành công!')
            loadData()
          }}
          onClose={() => setScoringSubmission(null)}
        />
      )}

      {/* Floating Action Bar when submissions are selected */}
      {selectedSubmissionIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-surface-overlay/95 border border-emerald-500/40 shadow-elevation-3 backdrop-blur-md animate-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="size-4 text-emerald-400" />
            <span className="text-xs sm:text-sm font-semibold text-text-primary whitespace-nowrap">
              Đã chọn {selectedSubmissionIds.length} bài nộp
            </span>
          </div>
          <div className="h-4 w-px bg-surface-border" />
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Download className="size-3.5" />}
            onClick={() => setShowExportModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-xs"
          >
            Xuất Excel ({selectedSubmissionIds.length})
          </Button>
          <button
            type="button"
            onClick={() => setSelectedSubmissionIds([])}
            className="text-text-secondary hover:text-text-primary text-xs underline whitespace-nowrap"
          >
            Bỏ chọn
          </button>
        </div>
      )}

      {/* Export Excel Modal */}
      {showExportModal && (
        <ExportExcelModal
          phases={phases}
          submissions={submissions}
          initialSelectedIds={selectedSubmissionIds}
          activePhaseId={activeTab}
          onClose={() => setShowExportModal(false)}
          onExportSuccess={(msg) => {
            setSuccessToast(msg)
            setSelectedSubmissionIds([])
          }}
        />
      )}
    </div>
  )
}
