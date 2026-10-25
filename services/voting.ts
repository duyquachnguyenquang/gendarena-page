import { createSupabaseServiceClient } from '@/lib/supabaseServer'
import { VOTING_CONFIG, PINNED_FINALIST_TEAM_IDS, DISPLAY_NAMES_BY_ID, NON_VOTING_TEAM_IDS, EVENTISTA_VOTING_URL } from '@/config/voting'
import type { TeamVote, TeamMember } from '@/types/voting'

// Curated high-resolution 4:5 portrait posters tailored by category
const CATEGORY_POSTERS: Record<string, string[]> = {
  'Logistics và Chuỗi cung ứng': [
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1000&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=1000&auto=format&fit=crop&q=80',
  ],
  'Xã hội và Môi trường': [
    'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=1000&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1000&auto=format&fit=crop&q=80',
  ],
  'Kinh doanh, Thương mại và Tài chính': [
    'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1000&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1000&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1000&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1000&auto=format&fit=crop&q=80',
  ],
  'Giáo dục': [
    'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1000&auto=format&fit=crop&q=80',
  ],
  default: [
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1000&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1000&auto=format&fit=crop&q=80',
  ],
}

const CATEGORY_TAGS: Record<string, string[]> = {
  'Logistics và Chuỗi cung ứng': ['Logistics', 'Smart Supply', 'AI'],
  'Xã hội và Môi trường': ['GreenTech', 'Bền Vững', 'ESG'],
  'Kinh doanh, Thương mại và Tài chính': ['FinTech', 'E-Commerce', 'B2B'],
  'Y tế và Sức khỏe': ['HealthTech', 'MedAI', 'Sức Khỏe'],
  'Giáo dục': ['EdTech', 'AI Learning', 'Đổi Mới'],
  default: ['Tech Startup', 'AI', 'Innovation'],
}

/**
 * Normalizes university name for clean editorial display.
 */
function normalizeUniversity(uni?: string | null): string {
  if (!uni) return 'GenD Arena'
  const normalized = uni.trim().normalize('NFC')
  if (/Giao thông Vận tải|GTVT|UTH/i.test(normalized)) return 'ĐH Giao thông Vận tải TP.HCM'
  if (/Kinh tế - Luật|UEL/i.test(normalized)) return 'ĐH Kinh tế - Luật - ĐHQG TP.HCM'
  if (/Ngoại thương|FTU/i.test(normalized)) return 'ĐH Ngoại Thương TP.HCM'
  if (/Bách Khoa/i.test(normalized)) return 'ĐH Bách Khoa TP.HCM'
  if (/Khoa học Xã hội và Nhân văn|KHXH&NV/i.test(normalized)) return 'ĐH KHXH&NV TP.HCM'
  if (/Khoa học tự nhiên|KHTN/i.test(normalized)) return 'ĐH Khoa học Tự nhiên - ĐHQG TP.HCM'
  if (/Công nghệ thông tin|UIT/i.test(normalized)) return 'ĐH Công nghệ Thông tin - ĐHQG TP.HCM'
  if (/Văn Lang/i.test(normalized)) return 'ĐH Văn Lang'
  if (/Ngân hàng|HUB/i.test(normalized)) return 'ĐH Ngân hàng TP.HCM'
  if (/FPT/i.test(normalized)) return 'ĐH FPT TP.HCM'
  if (/Quốc tế|HCMIU/i.test(normalized)) return 'ĐH Quốc Tế - ĐHQG TP.HCM'
  if (/Sư Phạm Kỹ Thuật|Công Nghệ Kỹ Thuật/i.test(normalized)) return 'ĐH Sư Phạm Kỹ Thuật TP.HCM'
  if (/Kinh tế|UEH/i.test(normalized)) return 'ĐH Kinh tế TP.HCM'
  if (/Công nghệ TP\.HCM|HUTECH/i.test(normalized)) return 'ĐH HUTECH'
  return normalized
}

/**
 * Fetches the official Top 10 voting teams directly from the competition database.
 * If specific finalist IDs are pinned in config, those teams are prioritized and sorted in exact order.
 * Otherwise, top verified teams with valid submissions are returned.
 * Falls back to curated config if DB connection is unavailable.
 */
export async function getVotingTeams(limit = 10): Promise<TeamVote[]> {
  try {
    const supabaseAdmin = createSupabaseServiceClient()

    let query = supabaseAdmin
      .from('teams')
      .select(`
        id, name, description, status, created_at, leader_id,
        team_members(id, role, user_id, joined_at),
        submissions(id, phase_id, topic, submission_url, file_path, file_name, notes, status, uploaded_at)
      `)

    if (PINNED_FINALIST_TEAM_IDS && PINNED_FINALIST_TEAM_IDS.length > 0) {
      query = query.in('id', PINNED_FINALIST_TEAM_IDS)
    } else {
      query = query.eq('status', 'verified').order('created_at', { ascending: true })
    }

    const { data: teamsData, error: teamsError } = await query

    if (teamsError || !teamsData || teamsData.length === 0) {
      console.warn('[services/voting] Could not fetch teams from Supabase, falling back to mock config:', teamsError)
      return VOTING_CONFIG.teams
    }

    // Sort by PINNED_FINALIST_TEAM_IDS strictly if provided
    if (PINNED_FINALIST_TEAM_IDS && PINNED_FINALIST_TEAM_IDS.length > 0) {
      teamsData.sort((a: any, b: any) => {
        const idxA = PINNED_FINALIST_TEAM_IDS.indexOf(a.id)
        const idxB = PINNED_FINALIST_TEAM_IDS.indexOf(b.id)
        return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB)
      })
    }

    // Filter teams that have submissions first; fallback to all verified teams if needed
    const teamsWithSubs = teamsData.filter(
      (t: any) => t.submissions && t.submissions.length > 0
    )
    const selectedTeams =
      PINNED_FINALIST_TEAM_IDS && PINNED_FINALIST_TEAM_IDS.length > 0
        ? teamsData
        : (teamsWithSubs.length >= limit ? teamsWithSubs : teamsData).slice(0, limit)

    // Collect all member user IDs to query profile details
    const memberUserIds = new Set<string>()
    selectedTeams.forEach((t: any) => {
      if (t.leader_id) memberUserIds.add(t.leader_id)
      ;(t.team_members || []).forEach((m: any) => {
        if (m.user_id) memberUserIds.add(m.user_id)
      })
    })

    const { data: profilesData } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, university, faculty, major, avatar_url, role')
      .in('id', Array.from(memberUserIds))

    const profileMap = new Map<string, any>()
    ;(profilesData || []).forEach((p: any) => profileMap.set(p.id, p))

    // Map DB team entities to the strict TeamVote contract
    const mappedTeams: TeamVote[] = selectedTeams.map((team: any, index: number) => {
      const msbc = String(index + 1).padStart(2, '0')
      const order = index + 1
      const submission = team.submissions?.[0] || null
      const topic = submission?.topic || 'Công nghệ & Khởi nghiệp'

      // Lookup curated presentation metadata for fallback/enrichment
      const curated = VOTING_CONFIG.teams.find((ct) => ct.id === team.id)
      const cleanName = DISPLAY_NAMES_BY_ID[team.id] || curated?.name || team.name

      // Parse submission notes attachments (pitch deck & report)
      let notesObj: any = null
      try {
        if (submission?.notes) notesObj = JSON.parse(submission.notes)
      } catch {}

      const pitchDeck = notesObj?.attachments?.pitch_deck
      const pitchFileName = pitchDeck?.file_name || submission?.file_name || ''

      // Map team members with profile details from Supabase
      const members: TeamMember[] = (team.team_members || []).map((m: any) => {
        const prof = profileMap.get(m.user_id)
        const isLeader = m.role === 'leader' || m.user_id === team.leader_id
        return {
          name: prof?.full_name || 'Thành viên',
          role: isLeader ? 'Trưởng nhóm' : 'Thành viên',
          university: normalizeUniversity(prof?.university),
          avatarUrl: prof?.avatar_url || undefined,
        }
      })

      // If team members list was empty, synthesize leader if profile exists
      if (members.length === 0 && team.leader_id) {
        const leaderProf = profileMap.get(team.leader_id)
        if (leaderProf) {
          members.push({
            name: leaderProf.full_name || 'Trưởng nhóm',
            role: 'Trưởng nhóm',
            university: normalizeUniversity(leaderProf.university),
            avatarUrl: leaderProf.avatar_url || undefined,
          })
        }
      }

      // If still empty, fallback to curated members if available
      const finalMembers = members.length > 0 ? members : (curated?.members || [])

      // Extract unique institutions
      const uniqueUnis = Array.from(
        new Set(finalMembers.map((m) => m.university).filter(Boolean))
      )
      const institution =
        uniqueUnis.length > 0 ? uniqueUnis.slice(0, 2).join(' & ') : (curated?.institution || 'GenD Arena 2026')

      // Curated poster visual matching brutalist aesthetic
      const posterPool = CATEGORY_POSTERS[topic] || CATEGORY_POSTERS.default
      const posterUrl = curated?.posterUrl || posterPool[index % posterPool.length]

      // Curated tags
      const tags = curated?.tags && curated.tags.length > 0
        ? curated.tags
        : (CATEGORY_TAGS[topic] || CATEGORY_TAGS.default)

      // Clean slogan & quote
      const cleanDesc = (team.description || '').trim()
      const slogan = cleanDesc
        ? cleanDesc.split('\n')[0].replace(/^[“"']+|[”"']+$/g, '')
        : (curated?.slogan || `Giải pháp tiên phong trong lĩnh vực ${topic}`)

      const quote = curated?.quote || cleanDesc || `Đổi mới sáng tạo và bứt phá cùng GenD Arena 2026.`

      const summary = curated?.summary || (pitchFileName
        ? `Đề án dự thi "${pitchFileName.replace(/\.(pdf|docx|pptx)$/i, '')}" thuộc lĩnh vực ${topic}.`
        : `Giải pháp khởi nghiệp công nghệ đột phá hướng tới chuyển đổi số trong ${topic}.`)

      const problem = curated?.problem || `Thách thức lớn về tối ưu hóa và năng lực cạnh tranh mà cộng đồng trong ngành ${topic} đang đối mặt.`
      const solution = curated?.solution || `Ứng dụng giải pháp công nghệ số và mô hình thực chiến nhằm nâng cao hiệu suất và giải quyết triệt để vấn đề.`

      const isVotingDisabled = Boolean(curated?.votingDisabled || NON_VOTING_TEAM_IDS.includes(team.id))
      const eventistaUrl = isVotingDisabled ? '' : (curated?.eventistaUrl || EVENTISTA_VOTING_URL)
      const directVoteUrl = isVotingDisabled ? undefined : curated?.directVoteUrl

      return {
        id: team.id,
        msbc,
        order,
        name: cleanName,
        slogan,
        quote,
        summary,
        institution,
        category: topic,
        tags,
        description: cleanDesc || curated?.description || summary,
        problem,
        solution,
        techStack: curated?.techStack || ['AI / ML', 'Mobile App', 'Cloud', 'Data Analytics'],
        members: finalMembers,
        avatarUrl: curated?.avatarUrl || posterUrl,
        posterUrl,
        videoPitchUrl: isVotingDisabled ? undefined : curated?.videoPitchUrl,
        videoDuration: isVotingDisabled ? undefined : curated?.videoDuration,
        eventistaUrl,
        directVoteUrl,
        votingDisabled: isVotingDisabled,
        initialVotes: isVotingDisabled ? undefined : (curated?.initialVotes || (1200 + (selectedTeams.length - index) * 115)),
        likesCount: isVotingDisabled ? undefined : (curated?.likesCount || (200 + (selectedTeams.length - index) * 35)),
        viewsCount: isVotingDisabled ? undefined : (curated?.viewsCount || (2500 + (selectedTeams.length - index) * 280)),
      }
    })

    return mappedTeams
  } catch (error) {
    console.error('[services/voting] Error fetching voting teams from DB:', error)
    return VOTING_CONFIG.teams
  }
}
