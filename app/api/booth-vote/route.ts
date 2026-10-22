import { NextRequest, NextResponse } from 'next/server'
import {
  resolveBoothTeam,
  getBoothVotingDashboardData,
  evaluateBoothGateStatus,
  inspectClientNetwork,
  hashAnonymousIdentifier,
  issueBoothChallenge,
  verifyBoothChallengeAndPoW,
  checkHasAlreadyVoted,
  recordBoothVote,
} from '@/lib/booth-voting'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const teamKey = searchParams.get('team') || searchParams.get('teamId')
    const rawDeviceHash = searchParams.get('deviceHash') || ''
    const rawCanvasHash = searchParams.get('canvasHash') || ''
    const tzOffsetParam = searchParams.get('tzOffset')
    const tzOffset = tzOffsetParam !== null ? Number(tzOffsetParam) : undefined

    const dashboard = await getBoothVotingDashboardData()
    const gate = evaluateBoothGateStatus(dashboard.settings)

    // If no specific team requested, return overall public summary
    if (!teamKey) {
      return NextResponse.json(
        {
          gate,
          settings: {
            gate_mode: dashboard.settings.gate_mode,
            start_time: dashboard.settings.start_time,
            end_time: dashboard.settings.end_time,
            ip_mode: dashboard.settings.ip_mode,
            block_vpn: dashboard.settings.block_vpn,
          },
          teams: dashboard.teams,
        },
        {
          headers: {
            'Cache-Control': 'no-store, max-age=0',
          },
        }
      )
    }

    const team = resolveBoothTeam(teamKey)
    if (!team) {
      return NextResponse.json(
        { error: 'Không tìm thấy đội thi gian hàng.' },
        { status: 404 }
      )
    }

    const net = await inspectClientNetwork(request.headers, tzOffset)
    const ipHash = hashAnonymousIdentifier('ip', net.clientIp)
    const challenge = issueBoothChallenge(team.id, ipHash)

    // Check HTTP-only cookie first
    const cookieKey = `gend_bv_http_${team.slug}`
    const cookieReceipt = request.cookies.get(cookieKey)?.value

    let alreadyVoted = Boolean(cookieReceipt)
    let receiptCode = cookieReceipt || undefined
    let reasonCode = cookieReceipt ? 'ALREADY_VOTED_COOKIE' : undefined

    if (!alreadyVoted && rawDeviceHash) {
      const serverDeviceHash = hashAnonymousIdentifier('dev', rawDeviceHash)
      const serverCanvasHash = rawCanvasHash
        ? hashAnonymousIdentifier('canvas', rawCanvasHash)
        : undefined

      const status = await checkHasAlreadyVoted(
        team.id,
        ipHash,
        serverDeviceHash,
        serverCanvasHash
      )
      if (status.alreadyVoted) {
        alreadyVoted = true
        reasonCode = status.reasonCode
        receiptCode = status.receiptCode
      }
    }

    const teamScore = dashboard.teams.find((t) => t.team_id === team.id)

    return NextResponse.json(
      {
        team: {
          id: team.id,
          msbc: team.msbc,
          slug: team.slug,
          name: team.name,
          institution: team.institution,
          category: team.category,
          slogan: team.slogan,
          summary: team.summary,
          posterUrl: team.posterUrl,
          avatarUrl: team.avatarUrl,
          voteCount: teamScore?.vote_count ?? 0,
        },
        gate,
        challenge,
        alreadyVoted,
        receiptCode,
        reasonCode,
        vpnBlocked: dashboard.settings.block_vpn && net.isVpnOrProxy,
        vpnReason: dashboard.settings.block_vpn ? net.blockReason : undefined,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  } catch (error) {
    console.error('[API GET /api/booth-vote] Error:', error)
    return NextResponse.json(
      { error: 'Lỗi máy chủ khi kiểm tra trạng thái bình chọn.' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    if (!body || !body.teamId || !body.deviceHash) {
      return NextResponse.json(
        {
          success: false,
          code: 'INVALID_PAYLOAD',
          message: 'Dữ liệu xác thực thiết bị không hợp lệ. Vui lòng tải lại trang.',
        },
        { status: 400 }
      )
    }

    const team = resolveBoothTeam(String(body.teamId))
    if (!team) {
      return NextResponse.json(
        {
          success: false,
          code: 'TEAM_NOT_FOUND',
          message: 'Không tìm thấy đội thi gian hàng này.',
        },
        { status: 404 }
      )
    }

    // 1. Check HTTP-only Cookie first (0ms check)
    const cookieKey = `gend_bv_http_${team.slug}`
    const existingCookie = request.cookies.get(cookieKey)?.value
    if (existingCookie) {
      return NextResponse.json(
        {
          success: false,
          code: 'ALREADY_VOTED_DEVICE',
          message: 'Thiết bị của bạn đã bình chọn cho đội thi này rồi.',
          receiptCode: existingCookie,
        },
        { status: 409 }
      )
    }

    const dashboard = await getBoothVotingDashboardData()

    // 2. Inspect Network IP, Proxy Headers, Country, ASN & Timezone
    const tzOffset =
      typeof body.timezoneOffset === 'number' ? body.timezoneOffset : undefined
    const net = await inspectClientNetwork(request.headers, tzOffset)

    if (dashboard.settings.block_vpn && net.isVpnOrProxy) {
      return NextResponse.json(
        {
          success: false,
          code: 'VPN_OR_PROXY_DETECTED',
          message:
            net.blockReason ||
            'Phát hiện kết nối VPN, Proxy hoặc DNS giả lập. Vui lòng tắt VPN (như 1.1.1.1 WARP) và dùng mạng 4G/5G hoặc Wi-Fi trực tiếp.',
        },
        { status: 403 }
      )
    }

    const rawDeviceHash = String(body.deviceHash).trim()
    const rawCanvasHash = body.canvasHash ? String(body.canvasHash).trim() : ''
    const challenge = String(body.challenge || '')
    const powNonce = String(body.powNonce ?? '0')

    const ipHash = hashAnonymousIdentifier('ip', net.clientIp)
    const serverDeviceHash = hashAnonymousIdentifier('dev', rawDeviceHash)
    const serverCanvasHash = rawCanvasHash
      ? hashAnonymousIdentifier('canvas', rawCanvasHash)
      : undefined
    const subnetHash = hashAnonymousIdentifier('subnet', net.subnetPrefix)

    // 3. Verify Cryptographic Challenge & Proof-of-Work Nonce
    const challengeCheck = verifyBoothChallengeAndPoW(
      challenge,
      powNonce,
      team.id,
      ipHash,
      rawDeviceHash
    )
    if (!challengeCheck.valid) {
      return NextResponse.json(
        {
          success: false,
          code: 'CHALLENGE_FAILED',
          message:
            challengeCheck.reason ||
            'Phiên bình chọn đã hết hạn. Vui lòng tải lại trang và bấm Bình chọn lại.',
        },
        { status: 403 }
      )
    }

    // 4. Execute Atomic Vote Recording
    const voteResult = await recordBoothVote({
      teamId: team.id,
      ipHash,
      deviceHash: serverDeviceHash,
      canvasHash: serverCanvasHash,
      subnetHash,
    })

    const statusHttp = voteResult.success
      ? 200
      : voteResult.code.startsWith('ALREADY_VOTED')
      ? 409
      : voteResult.code === 'RATE_LIMITED'
      ? 429
      : 400

    const response = NextResponse.json(voteResult, { status: statusHttp })

    // Set HTTP-only signed receipt cookie so subsequent attempts are blocked at the edge
    if (voteResult.success || voteResult.code.startsWith('ALREADY_VOTED')) {
      response.cookies.set({
        name: cookieKey,
        value: voteResult.receiptCode || 'VOTED',
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      })
    }

    return response
  } catch (error) {
    console.error('[API POST /api/booth-vote] Error:', error)
    return NextResponse.json(
      {
        success: false,
        code: 'SERVER_ERROR',
        message: 'Hệ thống đang xử lý lượng truy cập cao. Vui lòng bấm thử lại sau 2 giây.',
      },
      { status: 500 }
    )
  }
}
