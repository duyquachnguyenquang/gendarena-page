import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const { inviteId, userId, teamId, invitedUid } = await request.json().catch(() => ({}))

    if (!userId || (!inviteId && !(teamId && invitedUid))) {
      return NextResponse.json(
        { ok: false, error: 'Thiếu thông tin lời mời hoặc người dùng.' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createSupabaseServiceClient()

    // 1. Tìm bản ghi lời mời
    let query = supabaseAdmin.from('team_invites').select('id, team_id, invited_by, status')
    if (inviteId) {
      query = query.eq('id', inviteId)
    } else if (teamId && invitedUid) {
      query = query.eq('team_id', teamId).ilike('invited_uid', invitedUid.trim())
    }

    const { data: invites, error: fetchErr } = await query

    if (fetchErr) {
      console.error('[api/teams/invites/cancel] Query error:', fetchErr)
      return NextResponse.json({ ok: false, error: fetchErr.message }, { status: 500 })
    }

    if (!invites || invites.length === 0) {
      return NextResponse.json({ ok: true, message: 'Không tìm thấy lời mời hoặc đã bị thu hồi trước đó.' })
    }

    const invite = invites[0]

    // 2. Kiểm tra quyền: Người yêu cầu phải là người mời (invited_by) HOẶC là Trưởng đội của team_id
    if (invite.invited_by !== userId) {
      const { data: teamCheck } = await supabaseAdmin
        .from('teams')
        .select('id')
        .eq('id', invite.team_id)
        .eq('leader_id', userId)
        .maybeSingle()

      if (!teamCheck) {
        return NextResponse.json(
          { ok: false, error: 'Bạn không có quyền thu hồi lời mời này.' },
          { status: 403 }
        )
      }
    }

    // 3. Xóa lời mời bằng Service Role (vượt qua RLS client-side)
    const { error: deleteErr } = await supabaseAdmin
      .from('team_invites')
      .delete()
      .eq('id', invite.id)

    if (deleteErr) {
      console.error('[api/teams/invites/cancel] Delete error:', deleteErr)
      return NextResponse.json(
        { ok: false, error: `Không thể thu hồi lời mời: ${deleteErr.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[api/teams/invites/cancel] Exception:', err)
    return NextResponse.json(
      { ok: false, error: err?.message || 'Lỗi máy chủ khi thu hồi lời mời.' },
      { status: 500 }
    )
  }
}
