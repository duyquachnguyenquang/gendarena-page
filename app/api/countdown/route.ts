import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabaseServer'

interface CountdownConfig {
  phaseId?: string | null
  phaseTitle: string
  targetDate: string
  label?: string
  milestone?: 'open' | 'close' | 'custom'
  updatedAt?: string
}

const CONFIG_FILE_PATH = path.join(process.cwd(), 'data', 'countdown_config.json')

function readConfigFile(): CountdownConfig | null {
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const raw = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8')
      return JSON.parse(raw) as CountdownConfig
    }
  } catch (err) {
    console.error('Error reading countdown_config.json:', err)
  }
  return null
}

function writeConfigFile(config: CountdownConfig): boolean {
  try {
    const dir = path.dirname(CONFIG_FILE_PATH)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8')
    return true
  } catch (err) {
    console.error('Error writing countdown_config.json:', err)
    return false
  }
}

export async function GET() {
  try {
    // 1. Read persistent file config if available
    const fileConfig = readConfigFile()

    // 2. Query Supabase for current phases
    const supabase = createSupabaseServiceClient()
    const { data: phases } = await supabase
      .from('competition_phases')
      .select('*')
      .order('display_order', { ascending: true })

    const now = new Date().getTime()

    // If file config exists and has a valid targetDate, check if it's usable
    if (fileConfig && fileConfig.targetDate) {
      return NextResponse.json(
        {
          success: true,
          config: fileConfig,
          phases: phases || [],
        },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      )
    }

    // Fallback: Compute intelligent default from active phase in DB
    const activePhase =
      phases?.find((p) => p.status === 'active') ||
      phases?.find((p) => p.submission_open) ||
      phases?.[0]

    let fallbackDate = '2026-09-22T23:59:59+07:00'
    let fallbackTitle = activePhase?.title || 'Gia hạn đăng ký vòng Sơ loại: DREAM'
    let fallbackLabel = 'Đếm ngược đóng cổng nộp bài'
    let fallbackMilestone: 'open' | 'close' | 'custom' = 'close'

    if (activePhase) {
      const opensAt = activePhase.submission_opens_at ? new Date(activePhase.submission_opens_at).getTime() : 0
      const closesAt = activePhase.submission_closes_at ? new Date(activePhase.submission_closes_at).getTime() : 0

      if (opensAt && now < opensAt) {
        fallbackDate = activePhase.submission_opens_at
        fallbackLabel = 'Đếm ngược mở đơn'
        fallbackMilestone = 'open'
      } else if (closesAt && now < closesAt) {
        fallbackDate = activePhase.submission_closes_at
        fallbackLabel = 'Đếm ngược đóng cổng nộp bài'
        fallbackMilestone = 'close'
      } else if (activePhase.end_date) {
        fallbackDate = `${activePhase.end_date}T23:59:59+07:00`
        fallbackLabel = 'Đếm ngược kết thúc vòng'
        fallbackMilestone = 'close'
      }
    }

    const fallbackConfig: CountdownConfig = {
      phaseId: activePhase?.id || null,
      phaseTitle: fallbackTitle,
      targetDate: fallbackDate,
      label: fallbackLabel,
      milestone: fallbackMilestone,
      updatedAt: new Date().toISOString(),
    }

    // Persist this fallback config so it's locked in
    writeConfigFile(fallbackConfig)

    return NextResponse.json(
      {
        success: true,
        config: fallbackConfig,
        phases: phases || [],
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  } catch (error: any) {
    console.error('GET /api/countdown error:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    // 1. Verify user is admin
    const userClient = await createSupabaseServerClient()
    const {
      data: { user },
    } = await userClient.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Vui lòng đăng nhập tài khoản BTC.' },
        { status: 401 }
      )
    }

    const { data: profile } = await userClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Chỉ Ban Tổ Chức (Admin) mới có quyền chỉnh sửa đồng hồ.' },
        { status: 403 }
      )
    }

    // 2. Parse request body
    const body = await req.json()
    const { phaseId, title, targetDate, milestone = 'close', label } = body

    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: 'Tên vòng thi không được để trống.' },
        { status: 400 }
      )
    }

    if (!targetDate) {
      return NextResponse.json(
        { success: false, error: 'Ngày và giờ đếm ngược không được để trống.' },
        { status: 400 }
      )
    }

    const isoString = new Date(targetDate).toISOString()
    const dateOnly = targetDate.slice(0, 10)
    const trimmedTitle = title.trim()

    // 3. Update Supabase using Service Role Client (bypasses RLS guaranteed!)
    const serviceClient = createSupabaseServiceClient()

    if (phaseId) {
      const updateData: Record<string, any> = {
        title: trimmedTitle,
        updated_at: new Date().toISOString(),
      }

      if (milestone === 'open') {
        updateData.submission_opens_at = isoString
        updateData.start_date = dateOnly
      } else {
        // 'close' or 'custom'
        updateData.submission_closes_at = isoString
        updateData.end_date = dateOnly
      }

      const { error: phaseError } = await serviceClient
        .from('competition_phases')
        .update(updateData)
        .eq('id', phaseId)

      if (phaseError) {
        console.error('Error updating competition_phases:', phaseError)
      }
    }

    // Also update competitions table for cross-platform alignment
    try {
      const compUpdate: Record<string, any> = {}
      if (milestone === 'open') {
        compUpdate.submission_start = isoString
      } else {
        compUpdate.submission_end = isoString
        compUpdate.registration_end = isoString
      }
      await serviceClient
        .from('competitions')
        .update(compUpdate)
        .not('id', 'is', null)
    } catch (compErr) {
      console.error('Error syncing competition:', compErr)
    }

    // 4. Save to persistent file data/countdown_config.json
    const newConfig: CountdownConfig = {
      phaseId: phaseId || null,
      phaseTitle: trimmedTitle,
      targetDate: isoString,
      label: label || (milestone === 'open' ? 'Đếm ngược mở đơn' : 'Đếm ngược đóng cổng nộp bài'),
      milestone: milestone,
      updatedAt: new Date().toISOString(),
    }

    writeConfigFile(newConfig)

    return NextResponse.json({
      success: true,
      message: 'Cập nhật đồng hồ đếm ngược thành công và đã lưu vĩnh viễn!',
      config: newConfig,
    })
  } catch (error: any) {
    console.error('POST /api/countdown error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Lỗi xử lý lưu đồng hồ đếm ngược' },
      { status: 500 }
    )
  }
}
