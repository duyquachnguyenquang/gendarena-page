'use client'

import React, { useRef } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  Play,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { VOTING_CONFIG } from '@/config/voting'
import EventistaLogo from '@/components/voting/EventistaLogo'
import { Card, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import CursorCardGlow from '@/components/motion/cursor-card-glow'

export default function VotingShowcaseSection() {
  const teams = VOTING_CONFIG.teams
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollLeft = () => {
    if (!scrollRef.current) return
    const cardWidth = scrollRef.current.firstElementChild?.clientWidth || 360
    scrollRef.current.scrollBy({ left: -(cardWidth + 24), behavior: 'smooth' })
  }

  const scrollRight = () => {
    if (!scrollRef.current) return
    const cardWidth = scrollRef.current.firstElementChild?.clientWidth || 360
    scrollRef.current.scrollBy({ left: cardWidth + 24, behavior: 'smooth' })
  }

  return (
    <section className="relative py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 border-t border-surface-border/60 overflow-hidden bg-surface-base">
      {/* Ambient background light matching other landing sections */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] bg-brand-cyan/4 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 space-y-10 sm:space-y-12">
        {/* ─── Centered Section Header ─── */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
          <Badge variant="brand" size="md" className="mb-3">
            VÒNG 3: CHUNG KẾT
          </Badge>
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-text-primary mb-3">
            Triển Lãm &amp; Bình Chọn Top 10 Đội Thi
          </h2>
          <p className="text-text-secondary text-sm md:text-base leading-relaxed">
            Khám phá các đề án công nghệ đột phá, tìm hiểu câu chuyện của các đội thi và bình chọn cho dự án xuất sắc nhất bước vào Đêm Chung Kết.
          </p>
        </div>

        {/* ─── Navigation Header Controls ─── */}
        <div className="flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-raised border border-surface-border text-xs font-mono text-text-secondary">
            <Sparkles className="size-3.5 text-brand-cyan" />
            <span>Top {teams.length} Đội thi xuất sắc</span>
          </div>

          {/* Prev / Next buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={scrollLeft}
              aria-label="Cuộn sang trái"
              className="size-8 p-0 flex items-center justify-center rounded-lg"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={scrollRight}
              aria-label="Cuộn sang phải"
              className="size-8 p-0 flex items-center justify-center rounded-lg"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        {/* ─── Carousel: 3 Cards per view on Desktop (calc(33.333% - 16px)) ─── */}
        <div
          ref={scrollRef}
          className="flex gap-5 sm:gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 pt-1 px-1 -mx-1"
        >
          {teams.map((team) => (
            <Link
              key={team.id}
              href={`/vote?team=${team.id}`}
              className="w-[85vw] sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] shrink-0 snap-start block group h-auto outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan rounded-xl"
            >
              <Card
                interactive
                className="card-hover-glow flex flex-col justify-between h-full relative overflow-hidden group transition-all duration-300 p-5 sm:p-6 bg-surface-raised/80 hover:bg-surface-raised border-surface-border hover:border-brand-cyan/40"
              >
                <CursorCardGlow />

                <div className="relative z-10 flex-1 flex flex-col">
                  {/* Top squircle number + category pill */}
                  <div className="flex items-center justify-between gap-2 mb-3.5">
                    <div className="size-10 sm:size-11 rounded-lg bg-surface-overlay border border-surface-border group-hover:border-brand-cyan/40 group-hover:scale-105 flex items-center justify-center transition-all duration-300 shadow-sm shrink-0 font-mono text-sm font-bold text-brand-cyan">
                      {team.msbc}
                    </div>
                    <Badge
                      variant="brand"
                      size="sm"
                      className="bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 max-w-[170px] sm:max-w-[200px] px-2.5 py-0.5 text-[11px]"
                    >
                      <span className="truncate">{team.category}</span>
                    </Badge>
                  </div>

                  {/* 16:9 Widescreen Team Avatar / Photo */}
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-surface-overlay border border-surface-border/60 group-hover:border-brand-cyan/30 transition-all duration-300 mb-4 shrink-0">
                    <img
                      src={team.avatarUrl || team.posterUrl}
                      alt={team.name}
                      className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-raised/80 via-transparent to-transparent pointer-events-none" />

                  </div>

                  {/* Team Title - Prominent */}
                  <CardTitle className="text-xl sm:text-2xl font-bold text-text-primary group-hover:text-brand-cyan transition-colors mb-1.5 leading-snug">
                    {team.name}
                  </CardTitle>

                  {/* Institution with icon */}
                  <div className="flex items-center gap-1.5 text-xs text-text-tertiary font-mono">
                    <GraduationCap className="size-3.5 text-brand-cyan/70 shrink-0" />
                    <span className="truncate">{team.institution}</span>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="relative z-10 mt-5 pt-3.5 border-t border-surface-border flex items-center justify-between text-xs font-semibold text-brand-cyan group-hover:text-brand-cyanBright transition-colors uppercase tracking-wider">
                  <span>Chi tiết đội thi &amp; Vote</span>
                  <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Card>
            </Link>
          ))}
        </div>

        {/* ─── Call to Action & Eventista Endorsement Footer ─── */}
        <div className="pt-6 border-t border-surface-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-tertiary">
          <div className="flex items-center gap-2">
            <span>Bảo trợ công nghệ cổng bình chọn:</span>
            <EventistaLogo className="h-4.5" withLink />
          </div>

          <Button asChild variant="secondary" size="sm" className="w-full sm:w-auto">
            <Link
              href="/vote"
              className="inline-flex items-center justify-center gap-1.5 text-text-primary hover:text-brand-cyan transition-colors font-medium"
            >
              <span>Xem trọn bộ {teams.length} đội thi &amp; Bình chọn</span>
              <ArrowUpRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}


