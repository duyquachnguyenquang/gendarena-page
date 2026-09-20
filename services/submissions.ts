/**
 * Submission service — all upload/query logic lives here.
 * Uses @supabase/ssr browser client (createClient from @/lib/supabase).
 *
 * Multi-deliverable architecture:
 *   1. pitch_deck (File: PDF/PPTX/PPT or Link: Canva/Google Slides/Figma/Drive...)
 *   2. report (File: PDF/DOCX/DOC or Link: Google Docs/Notion/Coda...)
 * Total file size limit: <= 10 MB across all uploaded files in a submission.
 */

import { createClient } from '@/lib/supabase'
import { notifySubmissionSuccess } from '@/services/notifications'
import type {
  Submission,
  SubmissionHistory,
  TeamRecord,
  ServiceResult,
  TopicCategory,
  SubmissionAttachments,
  DeliverableItem,
  SubmissionKind,
} from '@/types/submission'
import { parseSubmissionAttachments } from '@/types/submission'

const BUCKET = 'submissions'
export const MAX_TOTAL_FILE_SIZE = 10 * 1024 * 1024 // 10 MB total for all files combined

// Allowed extensions and MIME types
const PITCH_DECK_EXTS = ['.pdf', '.pptx', '.ppt']
const REPORT_EXTS = ['.pdf', '.docx', '.doc']

const EXTENSION_MIME_MAP: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.doc': 'application/msword',
}

/**
 * Resolves canonical MIME type for a file if browser detection is missing or generic.
 */
export function resolveMimeType(file: File): string {
  if (file.type && file.type !== 'application/octet-stream') {
    return file.type
  }
  const name = file.name.toLowerCase()
  const ext = name.slice(name.lastIndexOf('.'))
  return EXTENSION_MIME_MAP[ext] || file.type || 'application/octet-stream'
}

// ─── Format helper ───────────────────────────────────────────────────────────

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Validate a specific deliverable file format.
 */
export function validateDeliverableFile(file: File, type: 'pitch_deck' | 'report'): string | null {
  const name = file.name.toLowerCase()
  const ext = name.slice(name.lastIndexOf('.'))

  if (type === 'pitch_deck') {
    if (!PITCH_DECK_EXTS.includes(ext)) {
      return `Slide Pitch-deck chỉ chấp nhận file ${PITCH_DECK_EXTS.join(', ')}`
    }
  } else {
    if (!REPORT_EXTS.includes(ext)) {
      return `Báo cáo đề án bằng chữ chỉ chấp nhận file ${REPORT_EXTS.join(', ')}`
    }
  }

  if (file.size > MAX_TOTAL_FILE_SIZE) {
    return `File đơn vượt quá giới hạn tối đa 10 MB (${formatBytes(file.size)}). Vui lòng nén file.`
  }

  return null
}

/**
 * Validates the combined total size of all uploaded files in a submission.
 */
export function validateTotalFileSize(files: (File | null | undefined)[]): {
  valid: boolean
  totalBytes: number
  error: string | null
} {
  const activeFiles = files.filter((f): f is File => !!f)
  const totalBytes = activeFiles.reduce((acc, f) => acc + f.size, 0)

  if (totalBytes > MAX_TOTAL_FILE_SIZE) {
    return {
      valid: false,
      totalBytes,
      error: `Tổng dung lượng các file tải lên là ${formatBytes(totalBytes)}, vượt quá giới hạn 10 MB. Vui lòng nén file hoặc dùng đường dẫn trực tuyến.`,
    }
  }

  return {
    valid: true,
    totalBytes,
    error: null,
  }
}

/**
 * Legacy single-file validation (for backward compat).
 */
export function validateFile(file: File): string | null {
  return validateDeliverableFile(file, 'pitch_deck')
}

const URL_REGEX = /^https?:\/\/.+\..+/

/**
 * Client-side URL validation.
 * Returns null if valid, or a Vietnamese error message string.
 */
export function validateUrl(url: string): string | null {
  if (!url || !url.trim()) return 'Vui lòng nhập đường dẫn liên kết bài nộp.'
  if (!URL_REGEX.test(url.trim())) {
    return 'Đường dẫn không hợp lệ. Phải bắt đầu bằng http:// hoặc https://'
  }
  return null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Remove characters unsafe for storage paths. */
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase()
}

/** Build the storage path following RLS format: {uid}/{phase_id}/{ts}-{prefix}-{name} */
function buildStoragePath(userId: string, phaseId: string, filename: string, prefix = ''): string {
  const sanitized = sanitizeFilename(filename)
  const pfx = prefix ? `${prefix}-` : ''
  return `${userId}/${phaseId}/${Date.now()}-${pfx}${sanitized}`
}

/** Extract all storage file paths from a submission record */
export function extractStoragePaths(sub: Submission | null | undefined): string[] {
  if (!sub) return []
  const paths = new Set<string>()

  if (sub.file_path) {
    paths.add(sub.file_path)
  }

  const attachments = sub.attachments || parseSubmissionAttachments(sub)
  if (attachments) {
    if (attachments.pitch_deck.file_path) paths.add(attachments.pitch_deck.file_path)
    if (attachments.report.file_path) paths.add(attachments.report.file_path)
  }

  return Array.from(paths).filter(Boolean)
}

// ─── Team queries ─────────────────────────────────────────────────────────────

/**
 * Get all teams the current user belongs to.
 */
export async function getMyTeams(userId: string): Promise<TeamRecord[]> {
  const supabase = createClient()

  try {
    // 1. Fetch via team_members
    let memberTeams: TeamRecord[] = []
    const { data: memberData, error: memberErr } = await supabase
      .from('team_members')
      .select('team_id, teams(id, name, competition_id, leader_id, status)')
      .eq('user_id', userId)

    if (!memberErr && memberData) {
      memberTeams = memberData
        .flatMap((m: any) => (m.teams ? (Array.isArray(m.teams) ? m.teams : [m.teams]) : []))
        .filter(Boolean)
    } else {
      const { data: fallbackMemberData } = await supabase
        .from('team_members')
        .select('team_id, teams(id, name, competition_id, leader_id)')
        .eq('user_id', userId)
      if (fallbackMemberData) {
        memberTeams = fallbackMemberData
          .flatMap((m: any) => (m.teams ? (Array.isArray(m.teams) ? m.teams : [m.teams]) : []))
          .filter(Boolean)
      }
    }

    // 2. Fetch directly where user is leader_id in teams table
    let leaderTeams: TeamRecord[] = []
    const { data: lData, error: lErr } = await supabase
      .from('teams')
      .select('id, name, competition_id, leader_id, status')
      .eq('leader_id', userId)

    if (!lErr && lData) {
      leaderTeams = lData as TeamRecord[]
    } else {
      const { data: fallbackLeaderData } = await supabase
        .from('teams')
        .select('id, name, competition_id, leader_id')
        .eq('leader_id', userId)
      if (fallbackLeaderData) {
        leaderTeams = fallbackLeaderData as TeamRecord[]
      }
    }

    const teamMap = new Map<string, TeamRecord>()
    ;[...memberTeams, ...leaderTeams].forEach((t) => {
      if (t && t.id) {
        teamMap.set(t.id, {
          ...t,
          status: t.status || 'draft',
        })
      }
    })

    return Array.from(teamMap.values())
  } catch (err) {
    console.error('getMyTeams error:', err)
    return []
  }
}

// ─── Submission queries ───────────────────────────────────────────────────────

/**
 * Get the current active submission for a given (team_id, phase_id) pair.
 */
export async function getCurrentSubmission(
  teamId: string,
  phaseId: string,
): Promise<Submission | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('team_id', teamId)
    .eq('phase_id', phaseId)
    .maybeSingle()

  if (error) {
    console.error('getCurrentSubmission error:', error)
    return null
  }

  if (!data) return null

  const row = data as Submission
  row.attachments = parseSubmissionAttachments(row)
  return row
}

/**
 * Get submission history for a given (team_id, phase_id) pair, sorted newest first.
 */
export async function getSubmissionHistory(
  teamId: string,
  phaseId: string,
): Promise<SubmissionHistory[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('submission_history')
    .select('*, profiles(email)')
    .eq('team_id', teamId)
    .eq('phase_id', phaseId)
    .order('deleted_at', { ascending: false })

  if (error) {
    console.error('getSubmissionHistory error:', error)
    return []
  }

  return (data ?? []).map((r) => {
    const row = r as SubmissionHistory
    row.attachments = parseSubmissionAttachments(row)
    return row
  })
}

/**
 * Generate a temporary signed download URL for a private storage file.
 * Valid for 120 seconds.
 */
export async function getDownloadUrl(filePath: string): Promise<string | null> {
  if (!filePath) return null
  const supabase = createClient()

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 120)

  if (error) {
    console.error('getDownloadUrl error:', error)
    return null
  }

  return data.signedUrl
}

/**
 * Helper to upload a file to Supabase Storage with smart fallback strategies.
 * Tries:
 *  1. Canonical MIME type (e.g. application/vnd.openxmlformats-officedocument.presentationml.presentation)
 *  2. Generic application/octet-stream (if bucket blocks specific MIME type)
 *  3. Omitted contentType (let storage engine infer or accept)
 */
async function uploadToStorageWithFallback(
  supabase: ReturnType<typeof createClient>,
  storagePath: string,
  file: File,
  deliverableLabel: string,
): Promise<string> {
  const primaryMime = resolveMimeType(file)

  // 1. Primary upload attempt
  const { error: firstErr } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: primaryMime,
      upsert: true,
    })

  if (!firstErr) {
    return storagePath
  }

  const errMsg = firstErr.message || ''
  const isMimeError =
    errMsg.toLowerCase().includes('mime type') ||
    errMsg.toLowerCase().includes('not supported') ||
    errMsg.toLowerCase().includes('content-type') ||
    (firstErr as any).statusCode === '415' ||
    (firstErr as any).status === 415

  if (isMimeError) {
    console.warn(`[submissions] Upload with '${primaryMime}' failed (${errMsg}). Retrying with 'application/octet-stream'...`)

    // 2. Retry with generic binary octet-stream
    const { error: retryErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, {
        contentType: 'application/octet-stream',
        upsert: true,
      })

    if (!retryErr) {
      return storagePath
    }

    // 3. Retry without specifying contentType header
    console.warn(`[submissions] Retry with octet-stream failed (${retryErr.message}). Retrying without explicit contentType...`)
    const { error: thirdErr } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, file, {
        upsert: true,
      })

    if (!thirdErr) {
      return storagePath
    }

    throw new Error(
      `Upload file ${deliverableLabel} thất bại: Bucket 'submissions' trên Supabase đang giới hạn MIME type (${firstErr.message}). Vui lòng cập nhật cấu hình bucket 'submissions' trong Supabase SQL Editor bằng script fix_submissions_storage_bucket.sql.`
    )
  }

  throw new Error(`Upload file ${deliverableLabel} thất bại: ${errMsg}`)
}

// ─── Unified Multi-Deliverable Submission Payload ────────────────────────────

export interface UnifiedSubmissionPayload {
  userId: string
  teamId: string
  phaseId: string
  topic: TopicCategory
  pitchDeck: {
    kind: 'file' | 'link'
    file?: File | null
    url?: string | null
  }
  report: {
    kind: 'file' | 'link'
    file?: File | null
    url?: string | null
  }
}

/**
 * Unified submission workflow: handles both initial submission and replace/overwrite.
 *
 * Workflow steps:
 * 1. Validates inputs & total file size (<= 10 MB).
 * 2. Uploads any new files to Supabase Storage.
 * 3. If replacing an existing submission:
 *    - Archives existing submission into `submission_history` with full attachment details.
 *    - Cleans up and deletes all old storage files of the previous submission.
 *    - Updates the existing `submissions` row.
 * 4. If creating a new submission:
 *    - Inserts new row into `submissions`.
 *    - If DB insert fails, cleans up the newly uploaded files.
 * 5. Sends success notification to team members.
 */
export async function submitUnifiedSubmission(
  payload: UnifiedSubmissionPayload,
  existing: Submission | null,
): Promise<ServiceResult> {
  const supabase = createClient()
  const { userId, teamId, phaseId, topic, pitchDeck, report } = payload

  // 1. Validation
  if (!topic) {
    return { ok: false, error: 'Vui lòng chọn 1 trong 5 nhóm chủ đề bắt buộc.' }
  }

  // Pitch-deck validation
  if (pitchDeck.kind === 'file') {
    if (!pitchDeck.file) return { ok: false, error: 'Vui lòng chọn file Slide Pitch-deck.' }
    const err = validateDeliverableFile(pitchDeck.file, 'pitch_deck')
    if (err) return { ok: false, error: err }
  } else {
    const err = validateUrl(pitchDeck.url || '')
    if (err) return { ok: false, error: `Link Pitch-deck: ${err}` }
  }

  // Report validation
  if (report.kind === 'file') {
    if (!report.file) return { ok: false, error: 'Vui lòng chọn file Báo cáo đề án bằng chữ.' }
    const err = validateDeliverableFile(report.file, 'report')
    if (err) return { ok: false, error: err }
  } else {
    const err = validateUrl(report.url || '')
    if (err) return { ok: false, error: `Link Báo cáo đề án: ${err}` }
  }

  // Total size validation
  const filesToUpload: File[] = []
  if (pitchDeck.kind === 'file' && pitchDeck.file) filesToUpload.push(pitchDeck.file)
  if (report.kind === 'file' && report.file) filesToUpload.push(report.file)

  const sizeValidation = validateTotalFileSize(filesToUpload)
  if (!sizeValidation.valid) {
    return { ok: false, error: sizeValidation.error! }
  }

  // 2. Upload files to Storage with resilient fallback handling
  const uploadedStoragePaths: string[] = []
  let pitchDeckStoragePath: string | null = null
  let reportStoragePath: string | null = null

  try {
    if (pitchDeck.kind === 'file' && pitchDeck.file) {
      pitchDeckStoragePath = buildStoragePath(userId, phaseId, pitchDeck.file.name, 'pitchdeck')
      await uploadToStorageWithFallback(
        supabase,
        pitchDeckStoragePath,
        pitchDeck.file,
        'Slide Pitch-deck'
      )
      uploadedStoragePaths.push(pitchDeckStoragePath)
    }

    if (report.kind === 'file' && report.file) {
      reportStoragePath = buildStoragePath(userId, phaseId, report.file.name, 'report')
      await uploadToStorageWithFallback(
        supabase,
        reportStoragePath,
        report.file,
        'Báo cáo đề án'
      )
      uploadedStoragePaths.push(reportStoragePath)
    }
  } catch (uploadError: any) {
    // Cleanup any partially uploaded files
    if (uploadedStoragePaths.length > 0) {
      await supabase.storage.from(BUCKET).remove(uploadedStoragePaths)
    }
    return { ok: false, error: uploadError.message || 'Lỗi khi tải file lên hệ thống lưu trữ.' }
  }

  // 3. Prepare structured attachments and summary fields
  const attachments: SubmissionAttachments = {
    pitch_deck: {
      kind: pitchDeck.kind,
      file_name: pitchDeck.file?.name ?? null,
      file_path: pitchDeckStoragePath,
      file_size: pitchDeck.file?.size ?? null,
      file_type: pitchDeck.file?.type ?? null,
      url: pitchDeck.kind === 'link' ? pitchDeck.url?.trim() ?? null : null,
    },
    report: {
      kind: report.kind,
      file_name: report.file?.name ?? null,
      file_path: reportStoragePath,
      file_size: report.file?.size ?? null,
      file_type: report.file?.type ?? null,
      url: report.kind === 'link' ? report.url?.trim() ?? null : null,
    },
  }

  // Summary fields for top-level columns
  const hasFiles = filesToUpload.length > 0
  const hasLinks = pitchDeck.kind === 'link' || report.kind === 'link'
  const submissionKind: SubmissionKind = hasFiles && hasLinks ? 'both' : hasFiles ? 'file' : 'link'

  const fileNames = [attachments.pitch_deck.file_name, attachments.report.file_name].filter(Boolean)
  const summaryFileName = fileNames.length > 0 ? fileNames.join(' + ') : null
  const summaryFilePath = pitchDeckStoragePath || reportStoragePath || null
  const summaryUrl = attachments.pitch_deck.url || attachments.report.url || null
  const totalBytes = sizeValidation.totalBytes > 0 ? sizeValidation.totalBytes : null
  const notesJson = JSON.stringify({ version: 2, attachments })

  // 4. Execute DB mutation (Replace or Insert)
  if (existing) {
    // ─── REPLACE FLOW ──────────────────────────────────────────────────────────
    // Step 4.1: Archive existing submission to submission_history
    const oldAttachments = existing.attachments || parseSubmissionAttachments(existing)
    const historyReason = JSON.stringify({
      reason: 'replaced',
      attachments: oldAttachments,
      summary: existing.file_name || existing.submission_url,
    })

    let { error: historyError } = await supabase.from('submission_history').insert({
      team_id: existing.team_id,
      phase_id: existing.phase_id,
      file_name: existing.file_name,
      file_size: existing.file_size,
      submission_kind: existing.submission_kind,
      submission_url: existing.submission_url,
      uploaded_by: existing.uploaded_by,
      uploaded_at: existing.uploaded_at,
      deleted_at: new Date().toISOString(),
      reason: historyReason,
      topic: existing.topic,
    })

    if (historyError && historyError.message?.includes('submission_kind_check')) {
      const fallbackHistoryKind = existing.file_path ? 'file' : 'link'
      const retryHistory = await supabase.from('submission_history').insert({
        team_id: existing.team_id,
        phase_id: existing.phase_id,
        file_name: existing.file_name,
        file_size: existing.file_size,
        submission_kind: fallbackHistoryKind,
        submission_url: existing.submission_url,
        uploaded_by: existing.uploaded_by,
        uploaded_at: existing.uploaded_at,
        deleted_at: new Date().toISOString(),
        reason: historyReason,
        topic: existing.topic,
      })
      historyError = retryHistory.error
    }

    if (historyError) {
      console.error('DB history insert error:', historyError)
      // Cleanup newly uploaded files
      if (uploadedStoragePaths.length > 0) {
        await supabase.storage.from(BUCKET).remove(uploadedStoragePaths)
      }
      return { ok: false, error: `Lưu lịch sử bài cũ thất bại: ${historyError.message}` }
    }

    // Step 4.2: Delete old files from Supabase Storage to free space
    const oldStoragePaths = extractStoragePaths(existing)
    if (oldStoragePaths.length > 0) {
      const { error: delOldErr } = await supabase.storage.from(BUCKET).remove(oldStoragePaths)
      if (delOldErr) {
        console.warn('Could not delete old storage files (non-critical):', delOldErr)
      }
    }

    // Step 4.3: Update existing submission row
    let { error: updateError } = await supabase
      .from('submissions')
      .update({
        file_path: summaryFilePath,
        file_name: summaryFileName,
        file_size: totalBytes,
        file_type: filesToUpload[0]?.type || null,
        submission_url: summaryUrl,
        submission_kind: submissionKind,
        uploaded_by: userId,
        uploaded_at: new Date().toISOString(),
        status: 'submitted',
        notes: notesJson,
        topic,
      })
      .eq('id', existing.id)

    if (updateError && updateError.message?.includes('submission_kind_check') && submissionKind === 'both') {
      const fallbackKind = hasFiles ? 'file' : 'link'
      const retryUpdate = await supabase
        .from('submissions')
        .update({
          file_path: summaryFilePath,
          file_name: summaryFileName,
          file_size: totalBytes,
          file_type: filesToUpload[0]?.type || null,
          submission_url: summaryUrl,
          submission_kind: fallbackKind,
          uploaded_by: userId,
          uploaded_at: new Date().toISOString(),
          status: 'submitted',
          notes: notesJson,
          topic,
        })
        .eq('id', existing.id)
      updateError = retryUpdate.error
    }

    if (updateError) {
      console.error('DB update error:', updateError)
      if (uploadedStoragePaths.length > 0) {
        await supabase.storage.from(BUCKET).remove(uploadedStoragePaths)
      }
      return { ok: false, error: `Cập nhật bài nộp thất bại: ${updateError.message}` }
    }

    // Notify team
    notifySubmissionSuccess({
      teamId,
      submitterId: userId,
      action: 'replace',
      detail: `Đã thay thế bài nộp (Gồm Slide Pitch-deck & Báo cáo đề án)`,
    }).catch((err) => console.warn('[submissions.ts] notifySubmissionSuccess error:', err))

    return { ok: true, data: undefined }
  } else {
    // ─── INSERT FLOW ───────────────────────────────────────────────────────────
    let { error: dbError } = await supabase.from('submissions').insert({
      team_id: teamId,
      phase_id: phaseId,
      file_path: summaryFilePath,
      file_name: summaryFileName,
      file_size: totalBytes,
      file_type: filesToUpload[0]?.type || null,
      submission_url: summaryUrl,
      submission_kind: submissionKind,
      uploaded_by: userId,
      uploaded_at: new Date().toISOString(),
      status: 'submitted',
      notes: notesJson,
      topic,
    })

    if (dbError && dbError.message?.includes('submission_kind_check') && submissionKind === 'both') {
      const fallbackKind = hasFiles ? 'file' : 'link'
      const retryInsert = await supabase.from('submissions').insert({
        team_id: teamId,
        phase_id: phaseId,
        file_path: summaryFilePath,
        file_name: summaryFileName,
        file_size: totalBytes,
        file_type: filesToUpload[0]?.type || null,
        submission_url: summaryUrl,
        submission_kind: fallbackKind,
        uploaded_by: userId,
        uploaded_at: new Date().toISOString(),
        status: 'submitted',
        notes: notesJson,
        topic,
      })
      dbError = retryInsert.error
    }

    if (dbError) {
      console.error('DB insert error:', dbError)
      if (uploadedStoragePaths.length > 0) {
        await supabase.storage.from(BUCKET).remove(uploadedStoragePaths)
      }
      return { ok: false, error: `Lưu dữ liệu bài nộp thất bại: ${dbError.message}` }
    }

    // Notify team
    notifySubmissionSuccess({
      teamId,
      submitterId: userId,
      action: 'submit',
      detail: `Đã nộp bài thành công (Gồm Slide Pitch-deck & Báo cáo đề án)`,
    }).catch((err) => console.warn('[submissions.ts] notifySubmissionSuccess error:', err))

    return { ok: true, data: undefined }
  }
}

// ─── Backward compatibility wrappers ─────────────────────────────────────────

export async function insertFileSubmission(
  userId: string,
  teamId: string,
  phaseId: string,
  file: File,
  topic: TopicCategory,
): Promise<ServiceResult> {
  return submitUnifiedSubmission(
    {
      userId,
      teamId,
      phaseId,
      topic,
      pitchDeck: { kind: 'file', file },
      report: { kind: 'link', url: 'https://docs.google.com' },
    },
    null,
  )
}

export async function replaceFileSubmission(
  userId: string,
  teamId: string,
  phaseId: string,
  file: File,
  existing: Submission,
  topic: TopicCategory,
): Promise<ServiceResult> {
  return submitUnifiedSubmission(
    {
      userId,
      teamId,
      phaseId,
      topic,
      pitchDeck: { kind: 'file', file },
      report: { kind: 'link', url: 'https://docs.google.com' },
    },
    existing,
  )
}

export async function insertLinkSubmission(
  userId: string,
  teamId: string,
  phaseId: string,
  url: string,
  topic: TopicCategory,
): Promise<ServiceResult> {
  return submitUnifiedSubmission(
    {
      userId,
      teamId,
      phaseId,
      topic,
      pitchDeck: { kind: 'link', url },
      report: { kind: 'link', url },
    },
    null,
  )
}

export async function replaceLinkSubmission(
  userId: string,
  teamId: string,
  phaseId: string,
  url: string,
  existing: Submission,
  topic: TopicCategory,
): Promise<ServiceResult> {
  return submitUnifiedSubmission(
    {
      userId,
      teamId,
      phaseId,
      topic,
      pitchDeck: { kind: 'link', url },
      report: { kind: 'link', url },
    },
    existing,
  )
}

export { insertFileSubmission as insertSubmission }
export { replaceFileSubmission as replaceSubmission }

// ─── Admin helpers ────────────────────────────────────────────────────────────

/**
 * Fetch ALL submissions with joined team name, phase title, score data, and assignment info.
 * This is the single source of truth for /admin/submissions and /admin/assign.
 */
export async function getAllSubmissionsForAdmin(): Promise<import('@/types/submission').AdminSubmissionRow[]> {
  const supabase = createClient()

  // ── Query 1: submissions with team name and phase details ──────────────────
  const { data: subData, error: subError } = await supabase
    .from('submissions')
    .select('id, submission_kind, file_name, submission_url, file_path, uploaded_at, status, phase_id, topic, notes, teams(name), competition_phases(title, scoring_open, scoring_opens_at, scoring_closes_at)')
    .order('uploaded_at', { ascending: false })

  if (subError) {
    console.error('[getAllSubmissionsForAdmin] submissions query failed:', JSON.stringify(subError, null, 2))
    return []
  }

  // ── Query 2: assignments ───────────────────────────────────────────────────
  const { data: assignData, error: assignError } = await supabase
    .from('judge_assignments')
    .select('id, judge_id, submission_id')

  if (assignError) {
    console.error('[getAllSubmissionsForAdmin] judge_assignments query failed:', JSON.stringify(assignError, null, 2))
  }

  // ── Query 3: judge profiles for names ─────────────────────────────────────
  const judgeIds = Array.from(new Set((assignData ?? []).map((a) => a.judge_id).filter(Boolean)))
  let profileMap = new Map<string, string>()

  if (judgeIds.length > 0) {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', judgeIds)

    if (profilesError) {
      console.error('[getAllSubmissionsForAdmin] profiles query failed:', JSON.stringify(profilesError, null, 2))
    } else {
      profileMap = new Map((profilesData ?? []).map((p) => [p.id, p.full_name ?? 'Giám khảo']))
    }
  }

  // ── Query 4: scores summary ──────────────────────────────────────────────
  const { data: scoresData, error: scoresError } = await supabase
    .from('scores')
    .select('id, submission_id, judge_id, total_score, comment, round_id, criteria_scores')

  if (scoresError) {
    console.error('[getAllSubmissionsForAdmin] scores query failed:', JSON.stringify(scoresError, null, 2))
  }

  // Build assignment Map
  const assignMap = new Map<string, { id: string; judge_id: string; full_name?: string }>()
  for (const r of (assignData ?? [])) {
    if (r.submission_id) {
      assignMap.set(r.submission_id, {
        id: r.id,
        judge_id: r.judge_id,
        full_name: profileMap.get(r.judge_id) ?? 'Giám khảo',
      })
    }
  }

  // Build scores Map
  type ScoreEntry = {
    id: string
    judge_id: string
    total_score: number
    comment?: string | null
    round_id?: string | null
    criteria_scores?: Record<string, number>
  }
  const scoresMap = new Map<string, ScoreEntry[]>()
  for (const s of (scoresData ?? [])) {
    if (s.submission_id) {
      const existing = scoresMap.get(s.submission_id) ?? []
      existing.push({
        id: s.id,
        judge_id: s.judge_id,
        total_score: Number(s.total_score ?? 0),
        comment: s.comment,
        round_id: s.round_id,
        criteria_scores: s.criteria_scores,
      })
      scoresMap.set(s.submission_id, existing)
    }
  }

  // ── Normalize and merge ───────────────────────────────────────────────────
  type RawSub = {
    id: string
    submission_kind: string
    file_name: string | null
    submission_url: string | null
    file_path: string | null
    uploaded_at: string
    status: string
    phase_id: string | null
    topic: string | null
    notes: string | null
    teams: { name: string } | { name: string }[] | null
    competition_phases: {
      title: string
      scoring_open?: boolean
      scoring_opens_at?: string | null
      scoring_closes_at?: string | null
    } | {
      title: string
      scoring_open?: boolean
      scoring_opens_at?: string | null
      scoring_closes_at?: string | null
    }[] | null
  }

  return (subData ?? []).map((row): import('@/types/submission').AdminSubmissionRow => {
    const r = row as RawSub
    const teams = Array.isArray(r.teams) ? (r.teams[0] ?? null) : r.teams
    const competition_phases = Array.isArray(r.competition_phases)
      ? (r.competition_phases[0] ?? null)
      : r.competition_phases

    const asgn = assignMap.get(r.id) ?? null
    const assigned_judge = asgn
      ? { id: asgn.id, judge_id: asgn.judge_id, full_name: asgn.full_name }
      : null

    const subScores = scoresMap.get(r.id) ?? []
    const parsedAttachments = parseSubmissionAttachments(r)

    return {
      id: r.id,
      submission_kind: r.submission_kind as import('@/types/submission').SubmissionKind,
      file_name: r.file_name,
      submission_url: r.submission_url,
      file_path: r.file_path,
      uploaded_at: r.uploaded_at,
      status: r.status,
      phase_id: r.phase_id,
      topic: r.topic as import('@/types/submission').TopicCategory | null,
      notes: r.notes,
      attachments: parsedAttachments,
      teams,
      competition_phases,
      assigned_judge,
      scores: subScores,
    }
  })
}


