'use client'

import Link from 'next/link'
import Image from 'next/image'
import DotGridBackground from '@/components/dot-grid-background'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { OFFICIAL_TOP5_FINALIST_TEAMS } from '@/lib/foh-sync'
import {
  Monitor,
  Sliders,
  Radio,
  ArrowRight,
  ExternalLink,
  Trophy,
  ShieldCheck,
} from 'lucide-react'

export default function FOHPortalPage() {
  const openBothScreens = () => {
    window.open(
      '/foh/display',
      'GenDArenaProjectorWindow',
      'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no'
    )
    window.location.href = '/foh/admin'
  }

  return (
    <div className="relative min-h-screen bg-surface-base text-text-primary flex flex-col justify-between overflow-hidden select-none">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <DotGridBackground />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[650px] h-96 rounded-full bg-brand-cyan/5 blur-[150px]" />
      </div>

      {/* Top Brand Bar */}
      <header className="relative z-10 border-b border-surface-border bg-surface-base/85 backdrop-blur-md">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo/gendarena-logo.png"
              alt="GenD Arena 2026"
              width={32}
              height={32}
              className="object-contain"
              priority
            />
            <span className="font-display text-base font-bold tracking-wider text-text-primary">
              GEND ARENA 2026
            </span>
            <Badge variant="info" size="sm">
              FOH STAGE SYSTEM
            </Badge>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-semantic-success">
            <Radio className="size-3.5" />
            <span>Offline-First BroadcastChannel</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-5xl w-full px-6 py-12 space-y-10 my-auto">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-surface-raised border border-surface-border text-xs font-mono text-brand-cyan">
            <Trophy className="size-3.5" />
            <span>ĐÊM CHUNG KẾT GEND ARENA: DEVELOP • TOP 5 CHUNG KẾT</span>
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-bold text-text-primary tracking-tight">
            Hệ Thống Điều Hành Điểm Số FOH
          </h1>
          <p className="text-base text-text-secondary">
            Vận hành độc lập trên một máy tính FOH duy nhất. Đồng bộ thời gian thực giữa bàn nhập điểm
            và màn hình LED sân khấu mà không phụ thuộc kết nối Internet.
          </p>
        </div>

        {/* 2 Dedicated Flows */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/foh/admin"
            className="group bg-surface-raised border border-surface-border hover:border-brand-cyan rounded-xl p-6 transition-all duration-200 flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-cyan/10 border border-brand-cyan/30 text-brand-cyan text-xs font-medium">
                  <Sliders className="size-3.5" />
                  Luồng 1 • Bàn Điều Khiển FOH
                </span>
                <span className="font-mono text-xs text-text-tertiary">/foh/admin</span>
              </div>

              <h2 className="font-display text-2xl font-semibold text-text-primary group-hover:text-brand-cyan transition-colors">
                Giao Diện Người Nhập Điểm
              </h2>

              <p className="text-sm text-text-secondary leading-relaxed">
                Nhập điểm trực tiếp cho Top 5 đội thi Chung kết, tự động tính toán và đồng bộ thứ hạng
                theo thời gian thực, hỗ trợ đóng băng màn hình LED (nhập nháp), màn chờ BGK và hoàn tác.
              </p>
            </div>

            <div className="pt-2 border-t border-surface-border flex items-center justify-between text-sm font-semibold text-brand-cyan">
              <span>Mở Bàn Điều Khiển Nhập Điểm</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>

          <Link
            href="/foh/display"
            target="_blank"
            className="group bg-surface-raised border border-surface-border hover:border-brand-cyan rounded-xl p-6 transition-all duration-200 flex flex-col justify-between space-y-6"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-violet/15 border border-accent-violet/30 text-accent-violet text-xs font-medium">
                  <Monitor className="size-3.5" />
                  Luồng 2 • Màn Hình LED / Máy Chiếu
                </span>
                <span className="font-mono text-xs text-text-tertiary">/foh/display</span>
              </div>

              <h2 className="font-display text-2xl font-semibold text-text-primary group-hover:text-brand-cyan transition-colors">
                Giao Diện Màn Chiếu Sân Khấu
              </h2>

              <p className="text-sm text-text-secondary leading-relaxed">
                Giao diện trình chiếu 16:9 chuẩn bộ nhận diện GenD Arena 2026. Tự động nhảy điểm, trượt
                đổi thứ hạng mượt mà và hiển thị pháo hoa vinh danh mà không lộ thanh công cụ quản trị.
              </p>
            </div>

            <div className="pt-2 border-t border-surface-border flex items-center justify-between text-sm font-semibold text-brand-cyan">
              <span>Mở Cửa Sổ Màn Chiếu Sân Khấu</span>
              <ExternalLink className="size-4" />
            </div>
          </Link>
        </div>

        {/* Official Top 5 Finalists Preview */}
        <div className="bg-surface-overlay border border-surface-border rounded-xl p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-mono text-text-secondary">
              <ShieldCheck className="size-4 text-brand-cyan" />
              <span>DANH SÁCH 5 ĐỘI THI CHUNG KẾT ĐÃ ĐƯỢC TÍCH HỢP SẴN (OFFLINE READY)</span>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={openBothScreens}
              rightIcon={<ArrowRight className="size-4" />}
            >
              Khởi động đồng thời Admin &amp; Màn Chiếu LED
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-1">
            {OFFICIAL_TOP5_FINALIST_TEAMS.map((team) => (
              <div
                key={team.id}
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-surface-raised border border-surface-border"
              >
                <div className="relative size-9 rounded-md overflow-hidden border border-surface-border shrink-0">
                  <Image
                    src={team.posterUrl}
                    alt={team.name}
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="font-mono text-[11px] font-bold text-brand-cyan">#{team.msbc}</div>
                  <div className="font-display text-xs font-semibold text-text-primary truncate">
                    {team.name}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="relative z-10 border-t border-surface-border py-4 px-6 text-center text-xs text-text-tertiary">
        GenD Arena 2026 — Đấu Trường Khởi Nghiệp Công Nghệ • FOH Offline Broadcast System
      </footer>
    </div>
  )
}
