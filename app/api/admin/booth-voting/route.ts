import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import {
  getBoothVotingDashboardData,
  evaluateBoothGateStatus,
  updateBoothVotingSettings,
  type BoothGateMode,
  type BoothIpMode,
} from '@/lib/booth-voting'

export const dynamic = 'force-dynamic'

async function verifyAdminSession() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { isAdmin: false }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  return { isAdmin: profile?.role === 'admin', userId: user.id }
}

export async function GET() {
  try {
    const auth = await verifyAdminSession()
    if (!auth.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Chỉ dành cho BTC.' }, { status: 403 })
    }

    const dashboard = await getBoothVotingDashboardData(true)
    const gate = evaluateBoothGateStatus(dashboard.settings)

    const totalVotes = dashboard.teams.reduce((acc, t) => acc + (t.vote_count || 0), 0)
    const totalBlocked = dashboard.teams.reduce((acc, t) => acc + (t.blocked_count || 0), 0)

    return NextResponse.json(
      {
        settings: dashboard.settings,
        gate,
        teams: dashboard.teams,
        totalVotes,
        totalBlocked,
        usingFallbackDb: dashboard.usingFallbackDb,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  } catch (error) {
    console.error('[API GET /api/admin/booth-voting] Error:', error)
    return NextResponse.json({ error: 'Lỗi tải dữ liệu quản trị gian hàng.' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAdminSession()
    if (!auth.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized: Chỉ dành cho BTC.' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const patch: {
      gate_mode?: BoothGateMode
      ip_mode?: BoothIpMode
      block_vpn?: boolean
      start_time?: string
      end_time?: string
    } = {}

    if (body.gate_mode && ['auto', 'force_open', 'force_closed'].includes(body.gate_mode)) {
      patch.gate_mode = body.gate_mode as BoothGateMode
    }
    if (body.ip_mode && ['strict', 'venue_wifi'].includes(body.ip_mode)) {
      patch.ip_mode = body.ip_mode as BoothIpMode
    }
    if (typeof body.block_vpn === 'boolean') {
      patch.block_vpn = body.block_vpn
    }
    if (typeof body.start_time === 'string' && body.start_time.trim()) {
      patch.start_time = body.start_time.trim()
    }
    if (typeof body.end_time === 'string' && body.end_time.trim()) {
      patch.end_time = body.end_time.trim()
    }

    const updatedSettings = await updateBoothVotingSettings(patch)
    const dashboard = await getBoothVotingDashboardData(true)
    const gate = evaluateBoothGateStatus(updatedSettings)

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
      gate,
      teams: dashboard.teams,
      usingFallbackDb: dashboard.usingFallbackDb,
    })
  } catch (error) {
    console.error('[API PATCH /api/admin/booth-voting] Error:', error)
    return NextResponse.json(
      { error: 'Không thể cập nhật cấu hình bình chọn gian hàng.' },
      { status: 500 }
    )
  }
}
