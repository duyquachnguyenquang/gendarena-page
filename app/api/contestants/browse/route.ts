import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabaseServer'
import { isProfileComplete } from '@/lib/profile-utils'
import type { PublicProfileFields, TeamingContestant } from '@/types/profile'

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

    if (!userId) {
      return NextResponse.json(
        { ok: false, error: 'Thiếu định danh người dùng (userId).' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createSupabaseServiceClient()

    // 1. Kiểm tra hồ sơ của người gọi (Requester)
    const { data: requester, error: reqErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (reqErr || !requester) {
      return NextResponse.json(
        { ok: false, error: 'Không tìm thấy hồ sơ người dùng.' },
        { status: 404 }
      )
    }

    // 2. Kiểm tra điều kiện tiên quyết: Thí sinh phải hoàn thiện toàn bộ thông tin cá nhân (Tester được miễn kiểm tra để kiểm thử)
    const isRequesterTesterOrAdmin = requester.role === 'tester' || requester.role === 'admin'
    if (!isRequesterTesterOrAdmin && !isProfileComplete(requester)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Vui lòng hoàn thiện đầy đủ hồ sơ cá nhân để có thể xem thông tin các thí sinh khác.',
          isIncomplete: true,
        },
        { status: 403 }
      )
    }

    // 3. Kiểm tra trạng thái đội thi của Requester
    const [{ data: memberRecord }, { data: leaderRecord }] = await Promise.all([
      supabaseAdmin.from('team_members').select('team_id').eq('user_id', userId).maybeSingle(),
      supabaseAdmin.from('teams').select('id, name, is_open, max_members').eq('leader_id', userId).maybeSingle(),
    ])

    const userHasTeam = Boolean(memberRecord || leaderRecord)

    // 4. Lấy danh sách toàn bộ thí sinh đã có đội (cả Leader và Member)
    const [membersRes, leadersRes] = await Promise.all([
      supabaseAdmin.from('team_members').select('user_id'),
      supabaseAdmin.from('teams').select('leader_id'),
    ])

    const teamedUserIds = new Set<string>()
    membersRes.data?.forEach((m: { user_id: string | null }) => {
      if (m.user_id) teamedUserIds.add(m.user_id)
    })
    leadersRes.data?.forEach((t: { leader_id: string | null }) => {
      if (t.leader_id) teamedUserIds.add(t.leader_id)
    })

    // 5. Truy vấn danh sách thí sinh có bật công khai hồ sơ ghép đội
    // Logic Tester:
    // - Tester (hoặc Admin) có thể xem toàn bộ (cả thí sinh thực tế và tài khoản tester để kiểm thử).
    // - Thí sinh thực tế CHỈ xem được các thí sinh thực tế, tuyệt đối không xem được tester.
    let query = supabaseAdmin
      .from('profiles')
      .select('id, uid, full_name, avatar_url, email, phone, facebook_url, university, faculty, major, achievements, is_profile_public, public_fields, created_at, dob, role')
      .eq('is_profile_public', true)
      .neq('id', userId)

    if (!isRequesterTesterOrAdmin) {
      // Loại bỏ tài khoản tester khỏi kết quả của thí sinh
      query = query.neq('role', 'tester')
    }

    const { data: publicProfiles, error: fetchErr } = await query

    if (fetchErr) {
      console.error('[api/contestants/browse] Fetch error:', fetchErr)
      return NextResponse.json(
        { ok: false, error: 'Không thể tải danh sách thí sinh. Vui lòng thử lại sau.' },
        { status: 500 }
      )
    }

    // 6. Lọc: Chỉ lấy thí sinh CHƯA CÓ ĐỘI và đã hoàn thiện hồ sơ
    const teamlessContestants = (publicProfiles || []).filter((p) => {
      // Loại trừ người đã có đội
      if (teamedUserIds.has(p.id)) return false
      // Chỉ lấy hồ sơ hợp lệ / hoàn thiện
      if (!isProfileComplete(p)) return false
      // Thí sinh thực tế không được xem tài khoản tester
      if (!isRequesterTesterOrAdmin && p.role === 'tester') return false
      return true
    })

    // 7. Bảo mật dữ liệu: Áp dụng Field Masking theo cấu hình public_fields của từng thí sinh
    const maskedContestants: TeamingContestant[] = teamlessContestants.map((p) => {
      const pf: PublicProfileFields = {
        ...DEFAULT_PUBLIC_FIELDS,
        ...(p.public_fields as PublicProfileFields || {}),
      }

      return {
        id: p.id,
        uid: p.uid,
        full_name: p.full_name,
        avatar_url: p.avatar_url,
        email: pf.email ? p.email : null,
        phone: pf.phone ? p.phone : null,
        facebook_url: pf.facebook_url ? p.facebook_url : null,
        university: pf.university !== false ? p.university : null,
        faculty: pf.faculty !== false ? p.faculty : null,
        major: pf.major !== false ? p.major : null,
        achievements: pf.achievements !== false ? p.achievements : null,
        public_fields: pf,
        created_at: p.created_at,
      }
    })

    return NextResponse.json({
      ok: true,
      userHasTeam,
      contestants: maskedContestants,
    })
  } catch (err: any) {
    console.error('[api/contestants/browse] Exception:', err)
    return NextResponse.json(
      { ok: false, error: err?.message || 'Lỗi máy chủ khi lấy danh sách thí sinh.' },
      { status: 500 }
    )
  }
}
