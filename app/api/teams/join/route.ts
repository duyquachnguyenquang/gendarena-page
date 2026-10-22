import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabaseServer'
import { isProfileComplete } from '@/lib/profile-utils'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const { teamId, userId } = await request.json()

    if (!teamId || !userId) {
      return NextResponse.json(
        { ok: false, error: 'Thiếu thông tin mã đội hoặc người dùng.' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createSupabaseServiceClient()

    // 1. Kiểm tra hồ sơ cá nhân
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    const isTester = profile.role === 'tester'
    if (!isTester && !isProfileComplete(profile)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Vui lòng hoàn thiện hồ sơ cá nhân trước khi xin gia nhập đội.',
          isIncomplete: true,
        },
        { status: 400 }
      )
    }

    // 2. Kiểm tra xem user đã có đội chưa (cả member và leader)
    const [{ data: memberRecord }, { data: leaderRecord }] = await Promise.all([
      supabaseAdmin.from('team_members').select('team_id').eq('user_id', userId).maybeSingle(),
      supabaseAdmin.from('teams').select('id').eq('leader_id', userId).maybeSingle(),
    ])

    if (memberRecord || leaderRecord) {
      return NextResponse.json(
        { ok: false, error: 'Bạn đã là thành viên của một đội thi khác.' },
        { status: 400 }
      )
    }

    // 3. Kiểm tra thông tin đội thi
    const { data: team, error: teamErr } = await supabaseAdmin
      .from('teams')
      .select('id, name, leader_id, max_members, is_open, team_members(id), leader:profiles!leader_id(role)')
      .eq('id', teamId)
      .maybeSingle()

    if (teamErr || !team) {
      return NextResponse.json(
        { ok: false, error: 'Không tìm thấy đội thi.' },
        { status: 404 }
      )
    }

    const teamLeaderRole = (team.leader as any)?.role

    // Thí sinh thực tế tuyệt đối không được tham gia hoặc gửi yêu cầu vào đội của Tester
    if (!isTester && profile.role !== 'admin' && teamLeaderRole === 'tester') {
      return NextResponse.json(
        { ok: false, error: 'Không tìm thấy đội thi.' },
        { status: 404 }
      )
    }

    if (!team.is_open) {
      return NextResponse.json(
        { ok: false, error: 'Đội thi này hiện đang đóng tuyển thành viên.' },
        { status: 400 }
      )
    }

    const currentCount = team.team_members?.length || 0
    if (currentCount >= team.max_members) {
      return NextResponse.json(
        { ok: false, error: 'Đội thi đã đủ số lượng thành viên tối đa.' },
        { status: 400 }
      )
    }

    // 4. Xóa sạch mọi request cũ giữa user và team này (kể cả accepted, rejected) để tránh lỗi UNIQUE 23505
    await supabaseAdmin
      .from('team_join_requests')
      .delete()
      .eq('team_id', teamId)
      .eq('requester_id', userId)

    // 5. Tạo mới join request với status = 'pending'
    const { error: insertErr } = await supabaseAdmin
      .from('team_join_requests')
      .insert({
        team_id: teamId,
        requester_id: userId,
        status: 'pending',
        created_at: new Date().toISOString(),
      })

    if (insertErr) {
      console.error('[api/teams/join] Insert error:', insertErr)
      return NextResponse.json(
        { ok: false, error: `Không thể gửi yêu cầu: ${insertErr.message}` },
        { status: 500 }
      )
    }

    // 6. Gửi thông báo cho Đội trưởng
    // Chỉ gửi thông báo nếu người xin gia nhập KHÔNG PHẢI là tester (trừ khi chính đội trưởng cũng là tester)
    if (team.leader_id && (!isTester || teamLeaderRole === 'tester')) {
      try {
        await supabaseAdmin.from('notifications').insert({
          user_id: team.leader_id,
          title: 'Yêu cầu gia nhập đội thi',
          message: `${profile.full_name || 'Một thí sinh'} đã gửi yêu cầu gia nhập đội "${team.name}".`,
          type: 'team_request',
          link: '/dashboard',
          is_read: false,
        })
      } catch (notifErr) {
        console.warn('[api/teams/join] Notification warning:', notifErr)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[api/teams/join] Exception:', err)
    return NextResponse.json(
      { ok: false, error: err?.message || 'Lỗi máy chủ khi gửi yêu cầu gia nhập đội.' },
      { status: 500 }
    )
  }
}
