'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowUpRight,
  Search,
  UserCheck,
  Award,
  Sparkles,
  ShieldCheck,
  Calendar,
  X,
  ExternalLink,
} from 'lucide-react'
import EventistaLogo from '@/components/voting/EventistaLogo'

export default function VoteGuidePage() {
  const [showRulesModal, setShowRulesModal] = useState(false)

  return (
    <div className="min-h-screen bg-surface-base text-text-primary flex flex-col justify-between py-6 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto space-y-6">
        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between pb-3 border-b border-surface-border">
          <Link
            href="/vote"
            className="size-8 rounded-[4px] flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors"
            title="Quay lại trang bình chọn"
          >
            <ArrowLeft className="size-5" />
          </Link>

          <h1 className="text-sm font-bold uppercase tracking-wider text-text-primary font-mono truncate px-2">
            Hướng Dẫn Bình Chọn 1Vote
          </h1>

          <div className="size-8" /> {/* spacer balance */}
        </div>

        {/* ── Partner & Date Header (tương tự header Lemon x Pay) ── */}
        <div className="flex items-center justify-between px-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-text-primary tracking-tight">GenD Arena</span>
            <span className="text-text-tertiary">×</span>
            <EventistaLogo className="h-4" withLink />
          </div>

          <span className="font-mono text-xs font-semibold text-brand-cyan bg-brand-cyan/10 px-2 py-0.5 rounded-[3px] border border-brand-cyan/25">
            25.10. ~ 02.11.
          </span>
        </div>

        {/* ── 3 Visual Step Cards (chuẩn theo mẫu người dùng cung cấp) ── */}
        <div className="space-y-3.5">
          {/* Step 1 */}
          <div className="flex items-center gap-4 p-4 sm:p-5 rounded-xl bg-surface-raised border border-surface-border hover:border-brand-cyan/40 transition-all duration-200 shadow-elevation-1">
            {/* Visual Icon Box */}
            <div className="relative size-16 sm:size-20 rounded-xl bg-gradient-to-br from-surface-elevated to-surface-overlay border border-surface-border flex items-center justify-center shrink-0">
              <div className="size-11 sm:size-13 rounded-lg bg-brand-cyan/10 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan shadow-[0_0_15px_rgba(0,212,255,0.25)]">
                <Search className="size-6 sm:size-7" />
              </div>
              <span className="absolute -bottom-1 -right-1 font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-[3px] bg-brand-cyan text-surface-base">
                01
              </span>
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-bold text-text-primary tracking-tight font-mono">
                  Step.1
                </span>
                <span className="text-xs text-brand-cyan font-semibold">• Tìm đội thi</span>
              </div>
              <p className="text-xs sm:text-sm text-text-secondary leading-snug">
                Chọn đội thi bạn yêu thích trên website GenD Arena và bấm <strong className="text-text-primary">"Vote ngay"</strong>.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-center gap-4 p-4 sm:p-5 rounded-xl bg-surface-raised border border-surface-border hover:border-brand-cyan/40 transition-all duration-200 shadow-elevation-1">
            {/* Visual Icon Box */}
            <div className="relative size-16 sm:size-20 rounded-xl bg-gradient-to-br from-surface-elevated to-surface-overlay border border-surface-border flex items-center justify-center shrink-0">
              <div className="size-11 sm:size-13 rounded-lg bg-semantic-success/10 border border-semantic-success/30 flex items-center justify-center text-semantic-success shadow-[0_0_15px_rgba(34,208,122,0.25)]">
                <UserCheck className="size-6 sm:size-7" />
              </div>
              <span className="absolute -bottom-1 -right-1 font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-[3px] bg-semantic-success text-surface-base">
                02
              </span>
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-bold text-text-primary tracking-tight font-mono">
                  Step.2
                </span>
                <span className="text-xs text-semantic-success font-semibold">• Xác thực</span>
              </div>
              <p className="text-xs sm:text-sm text-text-secondary leading-snug">
                Đăng nhập bằng <strong className="text-text-primary">Google</strong> hoặc <strong className="text-text-primary">Eventista</strong>. Mỗi tài khoản nhận 01 lượt vote miễn phí.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-center gap-4 p-4 sm:p-5 rounded-xl bg-surface-raised border border-surface-border hover:border-brand-cyan/40 transition-all duration-200 shadow-elevation-1">
            {/* Visual Icon Box */}
            <div className="relative size-16 sm:size-20 rounded-xl bg-gradient-to-br from-surface-elevated to-surface-overlay border border-surface-border flex items-center justify-center shrink-0">
              <div className="size-11 sm:size-13 rounded-lg bg-semantic-warning/10 border border-semantic-warning/30 flex items-center justify-center text-semantic-warning shadow-[0_0_15px_rgba(255,176,32,0.25)]">
                <Award className="size-6 sm:size-7" />
              </div>
              <span className="absolute -bottom-1 -right-1 font-mono text-[10px] font-bold px-1.5 py-0.2 rounded-[3px] bg-semantic-warning text-surface-base">
                03
              </span>
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-base sm:text-lg font-bold text-text-primary tracking-tight font-mono">
                  Step.3
                </span>
                <span className="text-xs text-semantic-warning font-semibold">• Cập nhật tức thì</span>
              </div>
              <p className="text-xs sm:text-sm text-text-secondary leading-snug">
                Bấm <strong className="text-text-primary">Bình chọn</strong>. Điểm số và thứ hạng của đội thi sẽ được cập nhật tự động ngay lập tức.
              </p>
            </div>
          </div>
        </div>

        {/* ── Action Buttons (chuẩn theo layout 2 nút ở ảnh mẫu) ── */}
        <div className="space-y-2.5 pt-4">
          {/* Secondary Button: Xem thể lệ & giải thưởng */}
          <button
            type="button"
            onClick={() => setShowRulesModal(true)}
            className="w-full py-3 px-4 rounded-[6px] bg-surface-elevated border border-surface-border hover:border-surface-borderStrong text-text-secondary hover:text-text-primary text-xs font-bold uppercase tracking-wider transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="size-4 text-brand-cyan" />
            <span>Thể Lệ & Giải Thưởng (1.000.000 VNĐ)</span>
          </button>

          {/* Primary CTA Button: Đi tới trang bình chọn */}
          <Link
            href="/vote"
            className="group/btn relative w-full py-3.5 px-4 rounded-[6px] bg-brand-cyan text-surface-base text-sm font-bold uppercase tracking-wide overflow-hidden transition-all duration-200 hover:bg-brand-cyanBright hover:shadow-[0_0_24px_rgba(0,212,255,0.45)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <span className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform ease-out pointer-events-none" />
            <span className="relative z-10">Bình chọn ngay cho Top 8 Đội thi</span>
            <ArrowUpRight className="relative z-10 size-4 transition-transform duration-200 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
          </Link>
        </div>
      </div>

      {/* ── Minimal Footer Support ── */}
      <footer className="max-w-md w-full mx-auto pt-6 text-center text-[11px] text-text-tertiary font-mono space-y-1">
        <p>Bảo trợ công nghệ: Eventista · Hotline: (+84) 832 338 688</p>
        <p>
          <a
            href="https://doc.eventistax.com/vi/guide/how-to-vote/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand-cyan underline"
          >
            Tài liệu hướng dẫn Eventista Docs ↗
          </a>
        </p>
      </footer>

      {/* ── Modal Thể Lệ & Giải Thưởng Tinh Gọn ── */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowRulesModal(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
          />
          <div className="relative z-10 w-full max-w-sm bg-surface-overlay border border-surface-border rounded-xl p-5 space-y-4 shadow-elevation-3">
            <div className="flex items-center justify-between pb-2 border-b border-surface-border">
              <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary font-mono">
                Thể Lệ Bình Chọn
              </h3>
              <button
                type="button"
                onClick={() => setShowRulesModal(false)}
                className="size-6 rounded flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-elevated"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-text-secondary">
              <div className="flex items-start gap-2.5">
                <Calendar className="size-4 text-brand-cyan shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-text-primary block">Thời gian mở cổng</span>
                  <span>20:00 ngày 25.10.2026 — 23:59 ngày 02.11.2026</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <ShieldCheck className="size-4 text-semantic-success shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-text-primary block">Quy tắc bình chọn</span>
                  <span>1 tài khoản hợp lệ = 1 lượt vote miễn phí. Hệ thống tự động lọc bỏ tài khoản ảo.</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Award className="size-4 text-semantic-warning shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-text-primary block">Giải thưởng Yêu Thích Nhất</span>
                  <span>
                    Đội thi dẫn đầu nhận phần thưởng trị giá <strong className="text-text-primary font-bold">1.000.000 VNĐ</strong> và kỷ niệm chương tại Đêm Chung kết.
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowRulesModal(false)}
              className="w-full py-2 rounded-[4px] bg-surface-elevated hover:bg-surface-borderStrong text-text-primary text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
