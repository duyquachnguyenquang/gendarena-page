'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Calendar,
  ShieldCheck,
  Award,
  BookOpen,
  Search,
  UserCheck,
  ExternalLink,
} from 'lucide-react'
import EventistaLogo from './EventistaLogo'

export type ModalTab = 'guide' | 'rules'

interface MinimalRulesModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: ModalTab
}

export default function MinimalRulesModal({
  isOpen,
  onClose,
  initialTab = 'guide',
}: MinimalRulesModalProps) {
  const [activeTab, setActiveTab] = useState<ModalTab>(initialTab)

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab)
    }
  }, [isOpen, initialTab])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 12 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative z-50 w-full max-w-md bg-surface-overlay border border-surface-border rounded-xl shadow-elevation-3 text-text-primary overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header & Tabs */}
          <div className="p-4 pb-3 border-b border-surface-border bg-surface-raised shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-brand-cyan animate-pulse" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary font-mono">
                  {activeTab === 'guide' ? 'Hướng Dẫn Bình Chọn' : 'Thể Lệ & Giải Thưởng'}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="size-7 rounded-[4px] flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-elevated transition-colors cursor-pointer"
                title="Đóng (Esc)"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-[4px] bg-surface-base border border-surface-border text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('guide')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-[3px] font-semibold transition-all cursor-pointer ${
                  activeTab === 'guide'
                    ? 'bg-brand-cyan text-surface-base shadow-[0_0_12px_rgba(0,212,255,0.3)]'
                    : 'text-text-tertiary hover:text-text-primary'
                }`}
              >
                <BookOpen className="size-3.5" />
                <span>3 Bước bình chọn</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('rules')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-[3px] font-semibold transition-all cursor-pointer ${
                  activeTab === 'rules'
                    ? 'bg-brand-cyan text-surface-base shadow-[0_0_12px_rgba(0,212,255,0.3)]'
                    : 'text-text-tertiary hover:text-text-primary'
                }`}
              >
                <ShieldCheck className="size-3.5" />
                <span>Thể lệ & Giải thưởng</span>
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs text-text-secondary leading-relaxed">
            {activeTab === 'guide' ? (
              /* TAB 1: 3 BƯỚC TRỰC QUAN TINH GỌN (THEO MẪU LEMON X PAY) */
              <div className="space-y-2.5">
                {/* Step 1 */}
                <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-surface-raised border border-surface-border hover:border-brand-cyan/40 transition-colors">
                  <div className="size-13 rounded-lg bg-brand-cyan/10 border border-brand-cyan/30 flex items-center justify-center text-brand-cyan shrink-0 shadow-[0_0_12px_rgba(0,212,255,0.2)]">
                    <Search className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-text-primary font-mono">Step.1</span>
                      <span className="text-[11px] text-brand-cyan font-semibold">• Tìm đội thi</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-tight">
                      Chọn đội thi bạn yêu thích trên website và bấm <strong className="text-text-primary">"Vote ngay"</strong>.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-surface-raised border border-surface-border hover:border-semantic-success/40 transition-colors">
                  <div className="size-13 rounded-lg bg-semantic-success/10 border border-semantic-success/30 flex items-center justify-center text-semantic-success shrink-0 shadow-[0_0_12px_rgba(34,208,122,0.2)]">
                    <UserCheck className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-text-primary font-mono">Step.2</span>
                      <span className="text-[11px] text-semantic-success font-semibold">• Xác thực</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-tight">
                      Đăng nhập <strong className="text-text-primary">Google</strong> hoặc <strong className="text-text-primary">Eventista</strong>. Mỗi tài khoản có 01 vote miễn phí.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-surface-raised border border-surface-border hover:border-semantic-warning/40 transition-colors">
                  <div className="size-13 rounded-lg bg-semantic-warning/10 border border-semantic-warning/30 flex items-center justify-center text-semantic-warning shrink-0 shadow-[0_0_12px_rgba(255,176,32,0.2)]">
                    <Award className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-text-primary font-mono">Step.3</span>
                      <span className="text-[11px] text-semantic-warning font-semibold">• Cập nhật tức thì</span>
                    </div>
                    <p className="text-xs text-text-secondary leading-tight">
                      Bấm <strong className="text-text-primary">Bình chọn</strong>. Điểm số và thứ hạng sẽ tự động cập nhật ngay lập tức.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              /* TAB 2: THỂ LỆ & GIẢI THƯỞNG */
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-surface-raised border border-surface-border">
                  <Calendar className="size-4 text-brand-cyan shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-text-primary block">Khung giờ bình chọn</span>
                    <span className="text-[11px] text-text-tertiary">
                      20:00 ngày <strong className="text-text-secondary">25.10.2026</strong> — 20:00 ngày <strong className="text-text-secondary">07.11.2026</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-surface-raised border border-surface-border">
                  <ShieldCheck className="size-4 text-semantic-success shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-text-primary block">Minh bạch & Công bằng</span>
                    <span className="text-[11px] text-text-tertiary">
                      1 tài khoản = 1 lượt vote miễn phí. Công nghệ Eventista tự động loại bỏ spam bot và tài khoản ảo.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-3 rounded-lg bg-surface-raised border border-surface-border">
                  <Award className="size-4 text-semantic-warning shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-text-primary block">Giải thưởng Yêu Thích Nhất</span>
                    <span className="text-[11px] text-text-secondary">
                      Phần thưởng trị giá <strong className="text-text-primary font-bold">1.000.000 VNĐ</strong> và kỷ niệm chương tại Đêm Chung kết.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Thông tin hỗ trợ Eventista */}
            <div className="p-3 rounded-lg bg-surface-raised border border-surface-border flex items-center justify-between text-[11px] text-text-tertiary font-mono">
              <div className="flex items-center gap-2">
                <span>Vận hành:</span>
                <EventistaLogo className="h-4" withLink />
              </div>
              <a
                href="tel:+84832338688"
                className="hover:text-text-primary transition-colors"
              >
                Hotline: (+84) 832 338 688
              </a>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="p-3 px-4 border-t border-surface-border bg-surface-raised flex items-center justify-between shrink-0">
            <a
              href="https://gendarena.1vote.vn/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-cyan hover:underline font-mono inline-flex items-center gap-1"
            >
              <span>gendarena.1vote.vn</span>
              <ExternalLink className="size-3" />
            </a>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-[4px] bg-surface-elevated hover:bg-surface-borderStrong text-text-primary text-xs font-semibold uppercase tracking-wide transition-colors cursor-pointer"
            >
              Đã hiểu
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
