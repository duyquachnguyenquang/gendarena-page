import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase'
import { formatBytes } from '@/services/submissions'
import { parseSubmissionAttachments } from '@/types/submission'

export interface ExportSubmissionsOptions {
  phaseId?: string
  phaseTitle?: string
  submissionIds?: string[]
}

export interface ExportResult {
  ok: boolean
  count?: number
  filename?: string
  error?: string
}

interface MemberProfile {
  id: string
  uid?: string | null
  full_name: string | null
  email: string | null
  phone: string | null
  university: string | null
  faculty: string | null
  major: string | null
  dob: string | null
  facebook_url: string | null
  role: 'leader' | 'member'
}

/**
 * Generate a 30-day signed download URL from Supabase Storage.
 * Expiry: 30 days = 2,592,000 seconds.
 */
async function getSigned30DayUrl(
  supabase: ReturnType<typeof createClient>,
  filePath: string | null | undefined
): Promise<string | null> {
  if (!filePath) return null
  try {
    const { data, error } = await supabase.storage
      .from('submissions')
      .createSignedUrl(filePath, 60 * 60 * 24 * 30) // 30 days

    if (error || !data?.signedUrl) {
      console.warn('[exportSubmissions] Error creating signed URL for', filePath, error)
      return null
    }
    return data.signedUrl
  } catch (err) {
    console.warn('[exportSubmissions] Failed to generate signed URL:', err)
    return null
  }
}

/**
 * Main function to export all submissions, deliverables (with 30-day links),
 * and full contestant profiles into a professionally structured Excel (.xlsx) file.
 */
export async function exportSubmissionsToExcel(
  options: ExportSubmissionsOptions = {}
): Promise<ExportResult> {
  try {
    const supabase = createClient()

    // ── 1. Query Submissions ──────────────────────────────────────────────────
    let subQuery = supabase
      .from('submissions')
      .select(`
        id,
        team_id,
        phase_id,
        submission_kind,
        file_name,
        file_path,
        file_size,
        submission_url,
        uploaded_at,
        status,
        topic,
        notes,
        teams (
          id,
          name,
          leader_id
        ),
        competition_phases (
          id,
          title
        )
      `)
      .order('uploaded_at', { ascending: false })

    if (options.submissionIds !== undefined) {
      if (options.submissionIds.length === 0) {
        return {
          ok: false,
          error: 'Chưa có bài nộp nào được chọn để xuất file Excel.',
        }
      }
      subQuery = subQuery.in('id', options.submissionIds)
    } else if (options.phaseId) {
      subQuery = subQuery.eq('phase_id', options.phaseId)
    }

    const { data: rawSubmissions, error: subError } = await subQuery

    if (subError) {
      console.error('[exportSubmissions] submissions query failed:', subError)
      return { ok: false, error: `Lỗi truy vấn bài nộp: ${subError.message}` }
    }

    if (!rawSubmissions || rawSubmissions.length === 0) {
      return {
        ok: false,
        error: options.submissionIds
          ? 'Không tìm thấy dữ liệu cho các bài nộp đã chọn.'
          : options.phaseTitle
          ? `Không tìm thấy bài nộp nào trong ${options.phaseTitle}.`
          : 'Không tìm thấy bài nộp nào trong hệ thống.',
      }
    }

    // ── 2. Query Scores Summary ───────────────────────────────────────────────
    const subIds = rawSubmissions.map((s) => s.id)
    const { data: scoresData } = await supabase
      .from('scores')
      .select('submission_id, total_score, comment')
      .in('submission_id', subIds)

    const scoreMap = new Map<string, { total_score: number; comment?: string | null }>()
    scoresData?.forEach((sc) => {
      if (sc.submission_id) {
        scoreMap.set(sc.submission_id, {
          total_score: Number(sc.total_score || 0),
          comment: sc.comment,
        })
      }
    })

    // ── 3. Query Teams, Team Members, and Profiles ───────────────────────────
    const teamIds = Array.from(
      new Set(
        rawSubmissions
          .map((s) => {
            const t = Array.isArray(s.teams) ? s.teams[0] : s.teams
            return t?.id || s.team_id
          })
          .filter(Boolean) as string[]
      )
    )

    // Fetch team members
    const { data: rawMembers, error: membersError } = await supabase
      .from('team_members')
      .select('team_id, user_id, role, joined_at')
      .in('team_id', teamIds)
      .order('joined_at', { ascending: true })

    if (membersError) {
      console.warn('[exportSubmissions] team_members query failed:', membersError)
    }

    // Collect all user IDs: members + team leaders
    const allUserIds = new Set<string>()
    rawMembers?.forEach((m) => {
      if (m.user_id) allUserIds.add(m.user_id)
    })
    rawSubmissions.forEach((s) => {
      const t = Array.isArray(s.teams) ? s.teams[0] : s.teams
      if (t?.leader_id) allUserIds.add(t.leader_id)
    })

    // Fetch profiles
    const { data: rawProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, uid, full_name, email, phone, university, faculty, major, dob, facebook_url')
      .in('id', Array.from(allUserIds))

    if (profilesError) {
      console.warn('[exportSubmissions] profiles query failed:', profilesError)
    }

    const profileMap = new Map<
      string,
      {
        id: string
        uid?: string | null
        full_name: string | null
        email: string | null
        phone: string | null
        university: string | null
        faculty: string | null
        major: string | null
        dob: string | null
        facebook_url: string | null
      }
    >()

    rawProfiles?.forEach((p) => {
      profileMap.set(p.id, p)
    })

    // Group members by team_id
    const teamMembersMap = new Map<string, MemberProfile[]>()
    rawSubmissions.forEach((s) => {
      const t = Array.isArray(s.teams) ? s.teams[0] : s.teams
      const tid = t?.id || s.team_id
      if (!tid) return

      const members: MemberProfile[] = []
      const addedUserIds = new Set<string>()

      // Add leader first
      if (t?.leader_id && profileMap.has(t.leader_id)) {
        const lp = profileMap.get(t.leader_id)!
        members.push({ ...lp, role: 'leader' })
        addedUserIds.add(t.leader_id)
      }

      // Add other team members
      rawMembers
        ?.filter((m) => m.team_id === tid)
        .forEach((m) => {
          if (!addedUserIds.has(m.user_id)) {
            const p = profileMap.get(m.user_id)
            if (p) {
              members.push({ ...p, role: (m.role as 'leader' | 'member') || 'member' })
              addedUserIds.add(m.user_id)
            }
          }
        })

      teamMembersMap.set(tid, members)
    })

    // ── 4. Batch Generate 30-Day Signed URLs for Submissions ─────────────────
    // Prepare deliverables and request signed URLs in parallel
    const submissionRowsWithUrls = await Promise.all(
      rawSubmissions.map(async (s) => {
        const t = Array.isArray(s.teams) ? s.teams[0] : s.teams
        const cp = Array.isArray(s.competition_phases) ? s.competition_phases[0] : s.competition_phases
        const attachments = parseSubmissionAttachments(s)

        // Pitch deck link/url
        let pitchDeckUrl = attachments?.pitch_deck?.url || null
        if (attachments?.pitch_deck?.kind === 'file' && attachments?.pitch_deck?.file_path) {
          pitchDeckUrl = await getSigned30DayUrl(supabase, attachments.pitch_deck.file_path)
        } else if (!pitchDeckUrl && s.file_path) {
          pitchDeckUrl = await getSigned30DayUrl(supabase, s.file_path)
        } else if (!pitchDeckUrl && s.submission_url) {
          pitchDeckUrl = s.submission_url
        }

        // Report link/url
        let reportUrl = attachments?.report?.url || null
        if (attachments?.report?.kind === 'file' && attachments?.report?.file_path) {
          reportUrl = await getSigned30DayUrl(supabase, attachments.report.file_path)
        }

        return {
          raw: s,
          team: t,
          phase: cp,
          attachments,
          pitchDeckUrl,
          reportUrl,
          scoreInfo: scoreMap.get(s.id),
          members: teamMembersMap.get(t?.id || s.team_id) || [],
        }
      })
    )

    // ── 5. Build Sheet 1: Danh sách bài thi ──────────────────────────────────
    type Sheet1Row = {
      'STT': number
      'Tên đội': string
      'Tên đội trưởng': string
      'Lĩnh vực': string
      'Link mở Pitch-Deck': string
      'Link mở Báo cáo Đề án': string
    }

    const sheet1Data: Sheet1Row[] = submissionRowsWithUrls.map((item, index) => {
      const { raw, team, pitchDeckUrl, reportUrl, members } = item

      const leader = members.find((m) => m.role === 'leader') || members[0]

      return {
        'STT': index + 1,
        'Tên đội': team?.name || 'Đội thi',
        'Tên đội trưởng': leader?.full_name || 'Chưa cập nhật',
        'Lĩnh vực': raw.topic || 'Chưa chọn',
        'Link mở Pitch-Deck': pitchDeckUrl || 'Không có',
        'Link mở Báo cáo Đề án': reportUrl || 'Không có',
      }
    })

    // ── 6. Build Sheet 2: Danh sách thí sinh chi tiết ─────────────────────────
    type Sheet2Row = {
      'STT': number
      'Tên đội thi': string
      'Chủ đề': string
      'Vai trò': string
      'Họ và tên': string
      'Mã thí sinh (UID)': string
      'Số điện thoại': string
      'Email': string
      'Trường Đại học / Cao đẳng': string
      'Khoa / Viện': string
      'Chuyên ngành': string
      'Ngày sinh': string
      'Facebook cá nhân': string
    }

    const sheet2Data: Sheet2Row[] = []
    let memberStt = 1
    const seenTeamIds = new Set<string>()

    submissionRowsWithUrls.forEach((item) => {
      const { raw, team, members } = item
      const teamId = team?.id || raw.team_id
      // Tránh trùng lặp danh sách thành viên nếu 1 đội có nhiều bài thi được chọn
      if (teamId && seenTeamIds.has(teamId)) {
        return
      }
      if (teamId) {
        seenTeamIds.add(teamId)
      }

      const teamName = team?.name || 'Đội thi'
      const topic = raw.topic || 'Chưa chọn'

      if (members.length === 0) {
        sheet2Data.push({
          'STT': memberStt++,
          'Tên đội thi': teamName,
          'Chủ đề': topic,
          'Vai trò': 'Trưởng đội',
          'Họ và tên': 'Chưa cập nhật thông tin',
          'Mã thí sinh (UID)': '',
          'Số điện thoại': '',
          'Email': '',
          'Trường Đại học / Cao đẳng': '',
          'Khoa / Viện': '',
          'Chuyên ngành': '',
          'Ngày sinh': '',
          'Facebook cá nhân': '',
        })
      } else {
        members.forEach((m) => {
          sheet2Data.push({
            'STT': memberStt++,
            'Tên đội thi': teamName,
            'Chủ đề': topic,
            'Vai trò': m.role === 'leader' ? 'Trưởng đội' : 'Thành viên',
            'Họ và tên': m.full_name || 'Thí sinh',
            'Mã thí sinh (UID)': m.uid || '',
            'Số điện thoại': m.phone || '',
            'Email': m.email || '',
            'Trường Đại học / Cao đẳng': m.university || '',
            'Khoa / Viện': m.faculty || '',
            'Chuyên ngành': m.major || '',
            'Ngày sinh': m.dob || '',
            'Facebook cá nhân': m.facebook_url || '',
          })
        })
      }
    })

    // ── 7. Convert to Excel Sheets & Apply Hyperlinks / Widths ────────────────
    const wb = XLSX.utils.book_new()

    // Sheet 1
    const ws1 = XLSX.utils.json_to_sheet(sheet1Data)

    // Set column widths for Sheet 1
    ws1['!cols'] = [
      { wch: 6 },  // STT
      { wch: 28 }, // Tên đội
      { wch: 26 }, // Tên đội trưởng
      { wch: 32 }, // Lĩnh vực
      { wch: 65 }, // Link mở Pitch-Deck
      { wch: 65 }, // Link mở Báo cáo Đề án
    ]

    // Embed clickable hyperlinks into Sheet 1 for Slide and Report URLs
    // Header is row 0, data starts at row 1
    submissionRowsWithUrls.forEach((item, idx) => {
      const rowIndex = idx + 1 // 1-based index in sheet (row 0 is header)
      
      // Column E is 'Link mở Pitch-Deck' (0-indexed col 4)
      if (item.pitchDeckUrl && item.pitchDeckUrl.startsWith('http')) {
        const cellRef = XLSX.utils.encode_cell({ c: 4, r: rowIndex })
        if (ws1[cellRef]) {
          ws1[cellRef].l = {
            Target: item.pitchDeckUrl,
            Tooltip: 'Nhấp để mở Slide Pitch-Deck',
          }
        }
      }

      // Column F is 'Link mở Báo cáo Đề án' (0-indexed col 5)
      if (item.reportUrl && item.reportUrl.startsWith('http')) {
        const cellRef = XLSX.utils.encode_cell({ c: 5, r: rowIndex })
        if (ws1[cellRef]) {
          ws1[cellRef].l = {
            Target: item.reportUrl,
            Tooltip: 'Nhấp để mở Báo cáo Đề án',
          }
        }
      }
    })

    XLSX.utils.book_append_sheet(wb, ws1, 'Danh sách bài thi')

    // Sheet 2
    const ws2 = XLSX.utils.json_to_sheet(sheet2Data)
    ws2['!cols'] = [
      { wch: 6 },  // STT
      { wch: 24 }, // Tên đội thi
      { wch: 22 }, // Chủ đề
      { wch: 14 }, // Vai trò
      { wch: 24 }, // Họ và tên
      { wch: 14 }, // Mã thí sinh (UID)
      { wch: 15 }, // Số điện thoại
      { wch: 28 }, // Email
      { wch: 32 }, // Trường Đại học / Cao đẳng
      { wch: 24 }, // Khoa / Viện
      { wch: 24 }, // Chuyên ngành
      { wch: 14 }, // Ngày sinh
      { wch: 35 }, // Facebook cá nhân
    ]

    // Embed hyperlinks for Facebook URLs in Sheet 2 (col 12)
    sheet2Data.forEach((row, idx) => {
      const rowIndex = idx + 1
      if (row['Facebook cá nhân'] && row['Facebook cá nhân'].startsWith('http')) {
        const cellRef = XLSX.utils.encode_cell({ c: 12, r: rowIndex })
        if (ws2[cellRef]) {
          ws2[cellRef].l = {
            Target: row['Facebook cá nhân'],
            Tooltip: 'Mở trang Facebook',
          }
        }
      }
    })

    XLSX.utils.book_append_sheet(wb, ws2, 'Danh sách thí sinh chi tiết')

    // ── 8. Trigger Browser File Download ──────────────────────────────────────
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const sanitizeName = (str: string) =>
      str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 25)

    let safeNamePart = 'BaiNop'
    if (rawSubmissions.length === 1) {
      const firstTeam = Array.isArray(rawSubmissions[0].teams) ? rawSubmissions[0].teams[0] : rawSubmissions[0].teams
      const teamName = firstTeam?.name || 'DoiThi'
      safeNamePart = sanitizeName(teamName) || 'DoiThi'
    } else if (options.submissionIds && options.submissionIds.length > 0) {
      const phasePart = options.phaseTitle ? sanitizeName(options.phaseTitle) + '_' : ''
      safeNamePart = `${phasePart}${rawSubmissions.length}_BaiNop`
    } else if (options.phaseTitle) {
      safeNamePart = sanitizeName(options.phaseTitle) || 'VongThi'
    } else {
      safeNamePart = `${rawSubmissions.length}_Doi`
    }
    const fileName = `GenD_Arena_BaiNop_${safeNamePart}_${today}.xlsx`

    XLSX.writeFile(wb, fileName)

    return {
      ok: true,
      count: rawSubmissions.length,
      filename: fileName,
    }
  } catch (err: unknown) {
    console.error('[exportSubmissionsToExcel] Fatal error:', err)
    const errMsg = err instanceof Error ? err.message : String(err || 'Đã xảy ra lỗi khi tạo file Excel.')
    return {
      ok: false,
      error: errMsg,
    }
  }
}
