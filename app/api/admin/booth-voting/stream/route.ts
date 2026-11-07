import { NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import {
  getBoothVotingDashboardData,
  subscribeBoothLiveEvents,
  type BoothLiveEvent,
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

  return { isAdmin: profile?.role === 'admin' }
}

/**
 * Server-Sent Events (SSE) Stream Endpoint for BTC Dashboard
 * Delivers zero-latency (< 50ms) push notifications directly into the BTC browser
 * whenever a vote is cast or blocked, completely eliminating polling delays.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminSession()
    if (!auth.isAdmin) {
      return new Response('Unauthorized: Chỉ dành cho BTC.', { status: 403 })
    }

    const encoder = new TextEncoder()
    let cleanup: (() => void) | null = null
    let heartbeatTimer: NodeJS.Timeout | null = null

    const stream = new ReadableStream({
      start(controller) {
        // 1. Send initial snapshot immediately upon connection
        getBoothVotingDashboardData()
          .then((dashboard) => {
            const initialEvent: BoothLiveEvent = {
              type: 'SETTINGS_UPDATED',
              settings: dashboard.settings,
              timestamp: new Date().toISOString(),
            }
            try {
              controller.enqueue(
                encoder.encode(`event: init\ndata: ${JSON.stringify({ ...dashboard, type: 'INIT' })}\n\n`)
              )
            } catch {}
          })
          .catch(() => {})

        // 2. Subscribe to live server events (triggered directly inside recordBoothVote in < 5ms)
        const onLiveEvent = (event: BoothLiveEvent) => {
          try {
            controller.enqueue(
              encoder.encode(`event: message\ndata: ${JSON.stringify(event)}\n\n`)
            )
          } catch {
            // Client closed connection
          }
        }

        cleanup = subscribeBoothLiveEvents(onLiveEvent)

        // 3. Heartbeat keep-alive every 15s to prevent intermediate reverse-proxies from closing the socket
        heartbeatTimer = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(`: ping\n\n`))
          } catch {
            if (heartbeatTimer) clearInterval(heartbeatTimer)
          }
        }, 15000)
      },
      cancel() {
        if (heartbeatTimer) clearInterval(heartbeatTimer)
        if (cleanup) cleanup()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform, no-store',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch (err) {
    console.error('[SSE /api/admin/booth-voting/stream] Error:', err)
    return new Response('Lỗi kết nối Stream SSE', { status: 500 })
  }
}
