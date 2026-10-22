import { NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabaseServer'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'application/pdf',
]
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2MB

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || ''
    const supabaseAdmin = createSupabaseServiceClient()

    let teamId: string | null = null
    let leaderId: string | null = null
    let teamName = 'Đội thi'
    let expectedAmount = 0
    let publicUrl: string | null = null

    // Case 1: Client already uploaded directly to Supabase Storage (bypasses Vercel 4.5MB limit completely)
    if (contentType.includes('application/json')) {
      const body = await request.json()
      teamId = body.teamId || null
      leaderId = body.leaderId || null
      teamName = body.teamName || 'Đội thi'
      expectedAmount = Number(body.expectedAmount || 0)
      publicUrl = body.receiptUrl || null

      if (!publicUrl) {
        return NextResponse.json(
          { ok: false, error: 'Thiếu đường dẫn ảnh biên lai chuyển khoản (receiptUrl).' },
          { status: 400 }
        )
      }
    } else {
      // Case 2: Fallback - FormData multipart upload
      const formData = await request.formData()
      teamId = formData.get('teamId') as string | null
      leaderId = formData.get('leaderId') as string | null
      teamName = (formData.get('teamName') as string | null) || 'Đội thi'
      expectedAmount = Number(formData.get('expectedAmount') || 0)
      const file = formData.get('file') as File | null

      if (!file) {
        return NextResponse.json(
          { ok: false, error: 'Vui lòng tải lên ảnh chụp màn hình biên lai chuyển khoản.' },
          { status: 400 }
        )
      }

      // 1. Validation kích thước tệp (2MB)
      if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json(
          { ok: false, error: 'Ảnh biên lai không được vượt quá 2MB.' },
          { status: 400 }
        )
      }

      // 2. Validation định dạng tệp
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            ok: false,
            error: 'Định dạng tệp không hợp lệ. Chỉ chấp nhận ảnh JPG, PNG, WebP, HEIC hoặc PDF.',
          },
          { status: 400 }
        )
      }

      // 3. Upload file lên Supabase Storage bucket 'payment-receipts' bằng Service Role Client
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const fileName = `receipts/${teamId}_${Date.now()}.${ext}`

      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const { error: uploadErr } = await supabaseAdmin.storage
        .from('payment-receipts')
        .upload(fileName, buffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadErr) {
        console.error('[api/payments/submit] Storage Upload error:', uploadErr)
        return NextResponse.json(
          { ok: false, error: `Không thể tải lên ảnh biên lai: ${uploadErr.message}` },
          { status: 500 }
        )
      }

      // 4. Lấy Public URL của biên lai
      const { data: urlData } = supabaseAdmin.storage
        .from('payment-receipts')
        .getPublicUrl(fileName)

      publicUrl = urlData.publicUrl
    }

    if (!teamId || !leaderId) {
      return NextResponse.json(
        { ok: false, error: 'Thiếu thông tin mã đội thi hoặc trưởng đội.' },
        { status: 400 }
      )
    }

    if (!publicUrl) {
      return NextResponse.json(
        { ok: false, error: 'Không lấy được đường dẫn biên lai thanh toán.' },
        { status: 400 }
      )
    }
    // 5. Cập nhật bảng teams
    const submittedAt = new Date().toISOString()
    const { error: updateErr } = await supabaseAdmin
      .from('teams')
      .update({
        status: 'locked_pending_payment',
        payment_amount: expectedAmount,
        payment_receipt_url: publicUrl,
        payment_submitted_at: submittedAt,
        payment_rejected_reason: null,
      })
      .eq('id', teamId)

    if (updateErr) {
      console.error('[api/payments/submit] Update team error:', updateErr)
      return NextResponse.json(
        { ok: false, error: `Cập nhật thông tin đội thất bại: ${updateErr.message}` },
        { status: 500 }
      )
    }

    // 6. Gửi thông báo cho Leader
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: leaderId,
        title: 'Đã gửi biên lai lệ phí',
        message: `Biên lai lệ phí của đội "${teamName}" đã được ghi nhận và đang chờ Ban tổ chức đối soát.`,
        type: 'system',
        link: '/dashboard',
        is_read: false,
      })
    } catch (notifErr) {
      console.warn('[api/payments/submit] Notification warning:', notifErr)
    }

    return NextResponse.json({ ok: true, receiptUrl: publicUrl })
  } catch (err: any) {
    console.error('[api/payments/submit] Exception:', err)
    return NextResponse.json(
      { ok: false, error: err.message || 'Lỗi máy chủ khi xử lý biên lai thanh toán.' },
      { status: 500 }
    )
  }
}
