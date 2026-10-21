'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, ShieldCheck, Award } from 'lucide-react'
import { VOTING_CONFIG } from '@/config/voting'
import EventistaLogo from './EventistaLogo'

interface MinimalRulesModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function MinimalRulesModal({ isOpen, onClose }: MinimalRulesModalProps) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          className="relative z-50 w-full max-w-md bg-surface-overlay border border-surface-border rounded-[6px] p-5 shadow-elevation-3 text-text-primary space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 border-b border-surface-border">
            <h3 className="text-sm font-bold uppercase tracking-wide text-text-primary">
              Thể Lệ Bình Chọn Vòng 3
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="size-6 rounded-[4px] flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-elevated transition-colors"
            >
              <X className="size-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-2.5 text-xs text-text-secondary leading-relaxed">
            <div className="flex items-start gap-2.5 p-3 rounded-[4px] bg-surface-raised border border-surface-border">
              <Calendar className="size-3.5 text-brand-cyan shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary font-semibold block mb-0.5">Thời gian</span>
                <span>20:00 ngày <strong className="text-text-primary">25.10.2026</strong> — 23:59 ngày <strong className="text-text-primary">02.11.2026</strong></span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-[4px] bg-surface-raised border border-surface-border">
              <ShieldCheck className="size-3.5 text-semantic-success shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary font-semibold block mb-0.5">Xác thực</span>
                <span>Mỗi tài khoản hợp lệ được 1 lượt vote miễn phí trên Eventista. Hệ thống tự động loại bỏ tài khoản ảo.</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-[4px] bg-surface-raised border border-surface-border">
              <Award className="size-3.5 text-brand-cyan shrink-0 mt-0.5" />
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary font-semibold block mb-0.5">Giải thưởng</span>
                <span><strong className="text-text-primary">15.000.000 VNĐ</strong> + cúp danh dự tại Đêm Chung kết. Kết quả độc lập với điểm Ban Giám khảo.</span>
              </div>
            </div>

            {/* Eventista Provider & Support info */}
            <div className="p-3 rounded-[4px] bg-surface-raised border border-surface-border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-tertiary font-semibold">
                  Nền tảng bảo trợ & vận hành
                </span>
                <a
                  href="https://eventistax.com/vi/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-85 transition-opacity"
                >
                  <EventistaLogo className="h-4" />
                </a>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] pt-1.5 border-t border-surface-border/50 text-text-tertiary">
                <a href="tel:+84832338688" className="hover:text-text-primary transition-colors flex items-center gap-1">
                  <span>Hotline:</span>
                  <span className="text-text-secondary font-mono">(+84) 832 338 688</span>
                </a>
                <a href="mailto:Contact@eventista.vn" className="hover:text-text-primary transition-colors flex items-center gap-1">
                  <span>Email:</span>
                  <span className="text-text-secondary font-mono truncate">Contact@eventista.vn</span>
                </a>
                <a href="https://eventistax.com/vi/" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition-colors">
                  Website: <span className="text-text-secondary">eventistax.com ↗</span>
                </a>
                <a href="https://www.facebook.com/eventista.vn/" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition-colors">
                  Facebook: <span className="text-text-secondary">eventista.vn ↗</span>
                </a>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2.5 border-t border-surface-border flex items-center justify-between">
            <EventistaLogo className="h-4" withLink />
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-[4px] bg-surface-elevated hover:bg-surface-borderStrong text-text-primary text-xs font-semibold uppercase tracking-wide transition-colors"
            >
              Đã hiểu
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
