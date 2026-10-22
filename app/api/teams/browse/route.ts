import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabaseServer'
import type { PublicProfileFields } from '@/types/profile'
import type { BrowseTeam, TeamMemberDetail, TeamMemberProfile } from '@/services/teams'
import { isTesterOrAdminRole } from '@/lib/auth/roles'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DEFAULT_PUBLIC_FIELDS: PublicProfileFields = {
  phone: false,
  email: false,
  facebook_url: true,
  university: true,
  faculty: true,
  major: true,
  achievements: true,
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const userId = body.userId

    const supabaseAdmin = createSupabaseServiceClient()

    // 1. Xác định vai trò của người gọi yêu cầu (Requester)
    let requesterRole: string | null = null
    if (userId) {
      const { data: requester } = await supabaseAdmin
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .maybeSingle()

      requesterRole = requester?.role ?? null
    }

    const isTesterOrAdmin = isTesterOrAdminRole(requesterRole)

    // 2. Lấy danh sách đội thi đang mở tuyển thành viên
    const { data: teamsData, error: teamsError } = await supabaseAdmin
      .from('teams')
      .select(`
        id, name, description, max_members, is_open, leader_id, competition_id, created_at,
        competitions(title),
        team_members(id, role, user_id, joined_at)
      `)
      .eq('is_open', true)

    if (teamsError) {
      console.error('[api/teams/browse] Teams fetch error:', teamsError)
      return NextResponse.json(
        { ok: false, error: 'Không thể tải danh sách đội thi. Vui lòng thử lại sau.' },
        { status: 500 }
      )
    }

    if (!teamsData || teamsData.length === 0) {
      return NextResponse.json({ ok: true, teams: [] })
    }

    // 3. Tập hợp ID tất cả người dùng (Leader và Members)
    const allUserIds = Array.from(
      new Set(
        teamsData
          .flatMap((t: any) => [
            t.leader_id,
            ...(t.team_members || []).map((m: any) => m.user_id),
          ])
          .filter(Boolean)
      )
    )

    // 4. Lấy đầy đủ profiles của tất cả thành viên liên quan
    const profileMap: Record<string, TeamMemberProfile & { role?: string }> = {}
    if (allUserIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, university, faculty, major, avatar_url, role, uid, phone, email, facebook_url, achievements, is_profile_public, public_fields')
        .in('id', allUserIds)

      if (profilesError) {
        console.error('[api/teams/browse] Profiles fetch error:', profilesError)
      } else if (profilesData) {
        profilesData.forEach((p) => {
          const pf: PublicProfileFields = {
            ...DEFAULT_PUBLIC_FIELDS,
            ...((p.public_fields as PublicProfileFields) || {}),
          }

          // Bảo mật dữ liệu: Masking các trường nhạy cảm trừ khi là chính chủ hoặc admin
          const isSelf = userId && p.id === userId
          const isFullAccess = isSelf || requesterRole === 'admin'

          profileMap[p.id] = {
            id: p.id,
            uid: p.uid ?? null,
            full_name: p.full_name ?? null,
            avatar_url: p.avatar_url ?? null,
            role: p.role ?? null,
            university: isFullAccess || pf.university !== false ? (p.university ?? null) : null,
            faculty: isFullAccess || pf.faculty !== false ? (p.faculty ?? null) : null,
            major: isFullAccess || pf.major !== false ? (p.major ?? null) : null,
            achievements: isFullAccess || pf.achievements !== false ? (p.achievements ?? null) : null,
            phone: isFullAccess || pf.phone ? (p.phone ?? null) : null,
            email: isFullAccess || pf.email ? (p.email ?? null) : null,
            facebook_url: isFullAccess || pf.facebook_url ? (p.facebook_url ?? null) : null,
            is_profile_public: p.is_profile_public ?? null,
            public_fields: pf,
          }
        })
      }
    }

    // 5. Chuẩn hóa dữ liệu đội thi
    const processedTeams: BrowseTeam[] = teamsData.map((t: any) => {
      const rawMembers: any[] = t.team_members || []
      const members: TeamMemberDetail[] = rawMembers.map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        role: m.role,
        joined_at: m.joined_at,
        profile: profileMap[m.user_id] ?? null,
      }))

      // Đảm bảo Leader luôn nằm trong danh sách members nếu bảng team_members chưa ghi nhận
      if (t.leader_id && !members.some((m) => m.user_id === t.leader_id)) {
        members.unshift({
          user_id: t.leader_id,
          role: 'leader',
          joined_at: t.created_at || new Date().toISOString(),
          profile: profileMap[t.leader_id] ?? null,
        })
      }

      return {
        id: t.id,
        name: t.name,
        description: t.description,
        max_members: t.max_members,
        is_open: t.is_open,
        leader_id: t.leader_id,
        competition_id: t.competition_id,
        leader: profileMap[t.leader_id] ?? null,
        competitions: t.competitions ?? null,
        members,
      }
    })

    // 6. Áp dụng quy tắc phân quyền:
    // - Tester hoặc Admin: Xem ĐẦY ĐỦ cả đội thí sinh thực tế và đội của Tester.
    // - Thí sinh thực tế (Participant / Role khác): TUYỆT ĐỐI KHÔNG xem đội do Tester lập hoặc có thành viên Tester.
    const availableTeams = processedTeams.filter((t) => {
      // Ẩn đội đã đầy thành viên
      if (t.members.length >= t.max_members) return false

      if (!isTesterOrAdmin) {
        // Kiểm tra xem Leader có phải Tester không
        const isLeaderTester = t.leader?.role === 'tester' || profileMap[t.leader_id]?.role === 'tester'
        if (isLeaderTester) return false

        // Kiểm tra xem trong các thành viên có ai mang role Tester không
        const hasTesterMember = t.members.some(
          (m) => m.profile?.role === 'tester' || profileMap[m.user_id]?.role === 'tester'
        )
        if (hasTesterMember) return false
      }

      return true
    })

    return NextResponse.json({
      ok: true,
      teams: availableTeams,
    })
  } catch (err: any) {
    console.error('[api/teams/browse] Exception:', err)
    return NextResponse.json(
      { ok: false, error: err?.message || 'Lỗi máy chủ khi lấy danh sách đội thi.' },
      { status: 500 }
    )
  }
}
