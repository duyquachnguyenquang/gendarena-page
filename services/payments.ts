import { createClient } from '@/lib/supabase'
import { createNotification } from '@/services/notifications'
import type { AdminPaymentTeam, TeamPaymentStatus } from '@/types/payment'

/**
 * Fetches all teams for the Admin Payment verification portal.
 */
export async function getAdminPaymentTeams(): Promise<AdminPaymentTeam[]> {
  const supabase = createClient()
  try {
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        description,
        max_members,
        status,
        payment_amount,
        payment_receipt_url,
        payment_submitted_at,
        payment_verified_at,
        payment_rejected_reason,
        created_at,
        leader_id,
        leader:profiles!leader_id(id, full_name, email, phone, university),
        competitions(title),
        team_members(user_id)
      `)
      .order('payment_submitted_at', { ascending: false, nullsFirst: false })

    if (teamsError) {
      console.error('[services/payments] Error fetching teams:', teamsError)
      return []
    }

    if (!teamsData) return []

    const formatted: AdminPaymentTeam[] = teamsData.map((t: any) => {
      const memberUserIds = Array.from(
        new Set([
          t.leader_id,
          ...(t.team_members || []).map((m: any) => m.user_id),
        ].filter(Boolean))
      )

      return {
        id: t.id,
        name: t.name,
        description: t.description ?? null,
        max_members: t.max_members ?? 5,
        status: (t.status as TeamPaymentStatus) || 'draft',
        payment_amount: Number(t.payment_amount || 0),
        payment_receipt_url: t.payment_receipt_url ?? null,
        payment_submitted_at: t.payment_submitted_at ?? null,
        payment_verified_at: t.payment_verified_at ?? null,
        payment_rejected_reason: t.payment_rejected_reason ?? null,
        created_at: t.created_at,
        leader_id: t.leader_id,
        leader: t.leader ?? null,
        competitions: t.competitions ?? null,
        members_count: Math.max(1, memberUserIds.length),
        member_user_ids: memberUserIds,
      }
    })

    // Sort order priority:
    // 1. locked_pending_payment (oldest submission first)
    // 2. payment_rejected
    // 3. verified
    // 4. draft
    const statusPriority: Record<TeamPaymentStatus, number> = {
      locked_pending_payment: 1,
      payment_rejected: 2,
      verified: 3,
      draft: 4,
    }

    formatted.sort((a, b) => {
      const priorityA = statusPriority[a.status] ?? 99
      const priorityB = statusPriority[b.status] ?? 99
      if (priorityA !== priorityB) {
        return priorityA - priorityB
      }
      if (a.status === 'locked_pending_payment' && b.status === 'locked_pending_payment') {
        const timeA = new Date(a.payment_submitted_at || a.created_at).getTime()
        const timeB = new Date(b.payment_submitted_at || b.created_at).getTime()
        return timeA - timeB
      }
      const timeA = new Date(a.created_at).getTime()
      const timeB = new Date(b.created_at).getTime()
      return timeB - timeA
    })

    return formatted
  } catch (err) {
    console.error('[services/payments] Exception in getAdminPaymentTeams:', err)
    return []
  }
}

/**
 * Approves a team payment:
 * 1. Sets status = 'verified' and payment_verified_at = now()
 * 2. Sends real-time notification to ALL team members and the leader.
 */
export async function approveTeamPayment(
  teamId: string,
  adminId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient()
  try {
    const verifiedAt = new Date().toISOString()

    const { data: teamData, error: fetchErr } = await supabase
      .from('teams')
      .select('name, leader_id, team_members(user_id)')
      .eq('id', teamId)
      .single()

    if (fetchErr || !teamData) {
      return { ok: false, error: 'Không tìm thấy thông tin đội thi.' }
    }

    const { error: updateErr } = await supabase
      .from('teams')
      .update({
        status: 'verified',
        payment_verified_at: verifiedAt,
        payment_rejected_reason: null,
      })
      .eq('id', teamId)

    if (updateErr) {
      console.error('[services/payments] Approve error:', updateErr)
      return { ok: false, error: `Duyệt thất bại: ${updateErr.message}` }
    }

    // Collect all member IDs (leader + team members)
    const allUserIds = Array.from(
      new Set([
        teamData.leader_id,
        ...(teamData.team_members || []).map((m: any) => m.user_id),
      ].filter(Boolean))
    )

    // Send notification to each team member
    for (const userId of allUserIds) {
      try {
        await createNotification({
          userId,
          title: 'Xác thực đội thi thành công!',
          message: `Đội "${teamData.name}" đã được BTC xác nhận thanh toán lệ phí. Đội của bạn đã nhận được Huy hiệu Verified và sẵn sàng nộp bài!`,
          type: 'system',
          link: '/dashboard',
        })
      } catch (notifErr) {
        console.warn(`[services/payments] Failed to notify user ${userId}:`, notifErr)
      }
    }

    return { ok: true }
  } catch (err: any) {
    console.error('[services/payments] Exception in approveTeamPayment:', err)
    return { ok: false, error: err.message || 'Lỗi không xác định khi duyệt thanh toán' }
  }
}

/**
 * Rejects a team payment:
 * 1. Sets status = 'payment_rejected' and payment_rejected_reason = reason
 * 2. Sends notification to the Team Leader explaining the rejection reason.
 */
export async function rejectTeamPayment(
  teamId: string,
  reason: string,
  adminId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createClient()
  try {
    const trimmedReason = reason.trim() || 'Biên lai thanh toán không hợp lệ hoặc số tiền không khớp.'

    const { data: teamData, error: fetchErr } = await supabase
      .from('teams')
      .select('name, leader_id')
      .eq('id', teamId)
      .single()

    if (fetchErr || !teamData) {
      return { ok: false, error: 'Không tìm thấy thông tin đội thi.' }
    }

    const { error: updateErr } = await supabase
      .from('teams')
      .update({
        status: 'payment_rejected',
        payment_rejected_reason: trimmedReason,
      })
      .eq('id', teamId)

    if (updateErr) {
      console.error('[services/payments] Reject error:', updateErr)
      return { ok: false, error: `Từ chối thất bại: ${updateErr.message}` }
    }

    // Send notification to the Team Leader
    if (teamData.leader_id) {
      try {
        await createNotification({
          userId: teamData.leader_id,
          title: 'Thanh toán lệ phí bị từ chối',
          message: `Lệ phí của đội "${teamData.name}" bị từ chối. Lý do: ${trimmedReason}. Vui lòng kiểm tra và cập nhật lại biên lai tại Bảng điều khiển.`,
          type: 'system',
          link: '/dashboard',
        })
      } catch (notifErr) {
        console.warn(`[services/payments] Failed to notify leader ${teamData.leader_id}:`, notifErr)
      }
    }

    return { ok: true }
  } catch (err: any) {
    console.error('[services/payments] Exception in rejectTeamPayment:', err)
    return { ok: false, error: err.message || 'Lỗi không xác định khi từ chối thanh toán' }
  }
}

export interface SubmitPaymentParams {
  teamId: string
  leaderId: string
  file: File
  expectedAmount: number
  teamName: string
}

/**
 * Submits team payment receipt:
 * 1. Uploads receipt image/PDF to Supabase Storage bucket 'payment-receipts'
 * 2. Updates team status to 'locked_pending_payment'
 * 3. Sends confirmation notification to the leader
 */
export async function submitTeamPayment({
  teamId,
  leaderId,
  file,
  expectedAmount,
  teamName,
}: SubmitPaymentParams): Promise<{ ok: boolean; error?: string; receiptUrl?: string }> {
  try {
    // 1. Validate file size and type
    const maxSizeBytes = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSizeBytes) {
      return { ok: false, error: 'Ảnh biên lai không được vượt quá 2MB.' }
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'application/pdf',
    ]
    if (!allowedTypes.includes(file.type)) {
      return {
        ok: false,
        error: 'Định dạng tệp không hợp lệ. Chỉ chấp nhận ảnh JPG, PNG, WebP, HEIC hoặc PDF.',
      }
    }

    // 2. Ưu tiên: Tải trực tiếp từ Trình duyệt lên Supabase Storage (Bypass 4.5MB Payload limit của Vercel)
    let publicUrl: string | null = null
    const supabase = createClient()
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `receipts/${teamId}_${Date.now()}.${ext}`

    try {
      const { error: uploadErr } = await supabase.storage
        .from('payment-receipts')
        .upload(fileName, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: true,
        })

      if (!uploadErr) {
        const { data: urlData } = supabase.storage
          .from('payment-receipts')
          .getPublicUrl(fileName)
        publicUrl = urlData.publicUrl
      } else {
        console.warn('[services/payments] Direct storage upload failed, will fallback to server proxy:', uploadErr)
      }
    } catch (directUploadErr) {
      console.warn('[services/payments] Direct client upload exception, will fallback to server proxy:', directUploadErr)
    }

    // 3. Gọi Server API (/api/payments/submit)
    try {
      if (publicUrl) {
        // Gửi JSON siêu nhẹ chứa receiptUrl (hoàn toàn tránh được giới hạn 4.5MB và timeout của Vercel)
        const apiRes = await fetch('/api/payments/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamId,
            leaderId,
            teamName,
            expectedAmount,
            receiptUrl: publicUrl,
          }),
        })

        if (apiRes.ok) {
          const json = await apiRes.json()
          if (json.ok) {
            return { ok: true, receiptUrl: json.receiptUrl || publicUrl }
          }
          return { ok: false, error: json.error || 'Gửi biên lai thất bại.' }
        }
      } else {
        // Fallback: Gửi FormData qua Server API (khi client upload trực tiếp thất bại)
        const formData = new FormData()
        formData.append('teamId', teamId)
        formData.append('leaderId', leaderId)
        formData.append('teamName', teamName)
        formData.append('expectedAmount', String(expectedAmount))
        formData.append('file', file)

        const apiRes = await fetch('/api/payments/submit', {
          method: 'POST',
          body: formData,
        })

        if (apiRes.ok) {
          const json = await apiRes.json()
          if (json.ok) {
            return { ok: true, receiptUrl: json.receiptUrl }
          }
          return { ok: false, error: json.error || 'Gửi biên lai thất bại.' }
        }
      }
    } catch (apiErr) {
      console.warn('[services/payments] Server API submit failed, falling back to direct DB update:', apiErr)
    }

    // 4. Fallback cuối cùng: Nếu Server API gặp sự cố, cập nhật trực tiếp DB từ client (nếu đã có publicUrl)
    if (!publicUrl) {
      return { ok: false, error: 'Không thể tải lên ảnh biên lai thanh toán. Vui lòng thử lại.' }
    }

    // 5. Update teams table
    const submittedAt = new Date().toISOString()
    const { error: updateErr } = await supabase
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
      console.error('[services/payments] Update team payment error:', updateErr)
      return { ok: false, error: `Cập nhật thông tin thất bại: ${updateErr.message}` }
    }

    // 6. Create confirmation notification for Leader
    try {
      await createNotification({
        userId: leaderId,
        title: 'Đã gửi biên lai lệ phí',
        message: `Biên lai lệ phí của đội "${teamName}" đã được ghi nhận và đang chờ Ban tổ chức đối soát.`,
        type: 'system',
        link: '/dashboard',
      })
    } catch (notifErr) {
      console.warn('[services/payments] Notification warning:', notifErr)
    }

    return { ok: true, receiptUrl: publicUrl }
  } catch (err: any) {
    console.error('[services/payments] Exception in submitTeamPayment:', err)
    return { ok: false, error: err.message || 'Lỗi không xác định khi gửi biên lai' }
  }
}
