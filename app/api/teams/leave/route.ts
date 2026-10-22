import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabaseServer'

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

    // 1. Xóa thành viên khỏi team_members
    const { error: deleteMemberErr } = await supabaseAdmin
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', userId)

    if (deleteMemberErr) {
      console.error('[api/teams/leave] Delete member error:', deleteMemberErr)
      return NextResponse.json(
        { ok: false, error: `Không thể xóa thành viên: ${deleteMemberErr.message}` },
        { status: 500 }
      )
    }

    // 2. Dọn sạch toàn bộ các bản ghi team_join_requests và team_invites liên quan
    await Promise.allSettled([
      supabaseAdmin
        .from('team_join_requests')
        .delete()
        .eq('team_id', teamId)
        .eq('requester_id', userId),
      supabaseAdmin
        .from('team_invites')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', userId),
    ])

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[api/teams/leave] Exception:', err)
    return NextResponse.json(
      { ok: false, error: err?.message || 'Lỗi máy chủ khi rời đội thi.' },
      { status: 500 }
    )
  }
}
