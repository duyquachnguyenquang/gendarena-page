'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ShieldCheck, Award, Calendar, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VOTING_CONFIG } from '@/config/voting'
import EventistaLogo from './EventistaLogo'

interface VotingRulesModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function VotingRulesModal({ isOpen, onClose }: VotingRulesModalProps) {
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 15 }}
          className="relative z-50 w-full max-w-2xl bg-surface-overlay border border-surface-border rounded-xl p-6 shadow-elevation-3 text-text-primary"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-surface-border">
            <div className="flex items-center gap-2.5">
              <Award className="size-5 text-brand-cyan" />
              <h3 className="font-display font-bold text-lg text-text-primary">
                Thể Lệ Bình Chọn Vòng 3 - GenD Arena 2026
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="size-8 p-0 text-text-secondary hover:text-text-primary"
            >
              <X className="size-5" />
            </Button>
          </div>

          {/* Body */}
          <div className="py-4 space-y-4 max-h-[70vh] overflow-y-auto pr-1 text-sm text-text-secondary leading-relaxed">
            {/* Timeline */}
            <div className="p-4 rounded-xl bg-surface-overlay border border-surface-border space-y-2">
              <div className="flex items-center gap-2 font-semibold text-text-primary">
                <Calendar className="size-4 text-brand-cyan" />
                <span>Thời gian bình chọn chính thức</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-xs pl-1">
                <li>
                  <strong className="text-text-primary">Bắt đầu:</strong> 20:00 ngày 25/10/2026.
                </li>
                <li>
                  <strong className="text-text-primary">Kết thúc:</strong> 23:59 ngày 02/11/2026.
                </li>
                <li>Hệ thống máy chủ Eventista tự động khóa cổng khi đồng hồ điểm 23:59:59 ngày 02/11/2026.</li>
              </ul>
            </div>

            {/* Rules sections */}
            {VOTING_CONFIG.rules.map((rule, idx) => (
              <div key={idx} className="space-y-1.5">
                <h4 className="font-display font-bold text-text-primary flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-brand-cyan" />
                  <span>{rule.title}</span>
                </h4>
                <ul className="space-y-1 pl-6 list-disc text-xs text-text-secondary">
                  {rule.content.map((item, itemIdx) => (
                    <li key={itemIdx}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Anti fraud note */}
            <div className="p-3.5 rounded-xl bg-surface-overlay border border-semantic-warning/30 flex items-start gap-3 text-xs">
              <ShieldCheck className="size-5 text-brand-cyan shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-text-primary block mb-0.5">
                  Bảo trợ công nghệ bởi Eventista
                </span>
                <span>
                  Mọi hành vi can thiệp phần mềm tự động (Auto-click, Proxy, VPN ảo) sẽ bị thuật toán bảo mật của Eventista tự động hủy bỏ kết quả mà không cần báo trước để bảo vệ tính công bằng cho 10 đội thi.
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-surface-border flex items-center justify-between">
            <EventistaLogo className="h-5" />
            <Button variant="primary" size="sm" onClick={onClose}>
              Đã hiểu thể lệ
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
