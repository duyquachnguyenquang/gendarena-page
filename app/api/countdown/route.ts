import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { createSupabaseServiceClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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

    // Fallback: Default to Round 3 configuration
    const fallbackConfig: CountdownConfig = {
      phaseId: null,
      phaseTitle: 'Vòng 3: Chung Kết',
      targetDate: '2026-11-08T13:00:00+07:00',
      label: 'Đếm ngược Vòng 3: Chung Kết',
      milestone: 'custom',
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
  return NextResponse.json(
    {
      success: false,
      error: 'Tính năng chỉnh sửa đồng hồ từ giao diện admin đã bị vô hiệu hóa. Cài đặt được quản lý trực tiếp qua code.',
    },
    { status: 403 }
  )
}
