'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ShieldAlert,
  Users,
  Trophy,
  Layers,
  FileText,
  Clock,
  Settings,
  Scale,
  Calendar,
  Mic,
  Handshake,
  BarChart2,
  ChevronRight,
  CreditCard,
  QrCode,
} from 'lucide-react'
import Loading from '@/components/loading'
import DotGridBackground from '@/components/dot-grid-background'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, competitions: 0, teams: 0, submissions: 0, pendingSubmissions: 0 })
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single() as { data: { role: string } | null }

      if (!profile || profile.role !== 'admin') {
        router.push('/dashboard')
        return
      }

      const [users, comps, teams, subs, pendingSubs] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('competitions').select('id', { count: 'exact', head: true }),
        supabase.from('teams').select('id', { count: 'exact', head: true }),
        supabase.from('submissions').select('id', { count: 'exact', head: true }),
        supabase.from('submissions').select('id', { count: 'exact', head: true }).in('status', ['pending', 'submitted']),
      ])

      setStats({
        users: users.count || 0,
        competitions: comps.count || 0,
        teams: teams.count || 0,
        submissions: subs.count || 0,
        pendingSubmissions: pendingSubs.count || 0,
      })
      setLoading(false)
    }
    loadData()
  }, [router, supabase])

  if (loading) return <Loading text="Đang tải dữ liệu quản trị..." />

  const statItems = [
    {
      label: 'Người dùng đăng ký',
      value: stats.users,
      icon: Users,
      color: 'text-brand-cyan',
      href: '/admin/users',
    },
    {
      label: 'Cuộc thi thiết lập',
      value: stats.competitions,
      icon: Trophy,
      color: 'text-semantic-warning',
      href: '/admin/competitions',
    },
    {
      label: 'Đội thi khởi tạo',
      value: stats.teams,
      icon: Layers,
      color: 'text-accent-violet',
      href: null,
    },
    {
      label: 'Tổng bài nộp',
      value: stats.submissions,
      icon: FileText,
      color: 'text-semantic-success',
      href: '/admin/submissions',
    },
    {
      label: 'Bài chờ chấm',
      value: stats.pendingSubmissions,
      icon: Clock,
      color: 'text-semantic-warning',
      href: '/admin/submissions',
    },
  ]

  const navItems = [
    { href: '/admin/booth-voting', icon: QrCode, title: 'Voting Gian hàng Chung kết (08/11)', desc: 'Lấy mã QR riêng cho Top 5 đội thi Chung kết, theo dõi điểm bình chọn Real-time và điều khiển cổng 14:00–15:30' },
    { href: '/admin/payments', icon: CreditCard, title: 'Duyệt lệ phí dự thi', desc: 'Kiểm tra biên lai chuyển khoản và cấp trạng thái Verified cho đội thi' },
    { href: '/admin/competitions', icon: Trophy, title: 'Quản lý cuộc thi', desc: 'Thiết lập, hiệu chỉnh thông số các phân khu đấu trường' },
    { href: '/admin/users', icon: Users, title: 'Quản lý người dùng', desc: 'Giám sát tài khoản và phân quyền quản trị viên, thí sinh' },
    { href: '/admin/submissions', icon: FileText, title: 'Quản lý & Chấm điểm bài nộp', desc: 'Xem bài thi, nhập điểm barem thay cho BGK và quản lý kết quả' },
    { href: '/admin/scoring', icon: Scale, title: 'Cấu hình tiêu chí chấm điểm', desc: 'Quản lý vòng chấm, tiêu chí, trọng số và barem điểm chính thức' },
    { href: '/admin/leaderboard', icon: BarChart2, title: 'Bảng xếp hạng chung', desc: 'Theo dõi bảng xếp hạng điểm trung bình các đội thi' },
    { href: '/admin/phases', icon: Calendar, title: 'Quản lý lịch trình', desc: 'Sắp xếp thời gian và cổng nộp bài các giai đoạn' },
    { href: '/admin/speakers', icon: Mic, title: 'Quản lý diễn giả & chuyên gia', desc: 'Thêm, chỉnh sửa thông tin diễn giả, cố vấn và khách mời' },
    { href: '/admin/sponsors', icon: Handshake, title: 'Quản lý nhà tài trợ', desc: 'Quản lý logo, website và phân cấp đối tác tài trợ' },
  ]

  return (
    <div className="relative min-h-screen bg-surface-base text-text-primary overflow-hidden">
      {/* Background Decor */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <DotGridBackground />
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-cyan/5 blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-accent-violet/5 blur-[120px]" />
      </div>

      {/* Internal Page Header */}
      <header className="relative z-10 border-b border-surface-border bg-surface-base/80 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 py-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="size-5 text-semantic-warning shrink-0" aria-hidden="true" />
                <Badge variant="warning" size="sm">BTC</Badge>
              </div>
              <h1 className="font-display text-2xl font-bold text-text-primary tracking-tight">
                Trung tâm kiểm soát hệ thống
              </h1>
              <p className="mt-1 text-sm text-text-secondary">
                Bảng điều khiển quản trị tổng thể cho Ban tổ chức GenD Arena
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-semantic-danger/30 bg-semantic-danger/10 text-semantic-danger text-xs font-medium">
              <span className="size-2 rounded-full bg-semantic-danger animate-pulse" aria-hidden="true" />
              Bảo mật: Quản trị viên
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-5xl px-4 py-10 space-y-8">
        {/* Stats Grid */}
        <section aria-label="Thống kê hệ thống">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {statItems.map((stat) => {
              const Icon = stat.icon
              const content = (
                <Card
                  key={stat.label}
                  interactive={Boolean(stat.href)}
                  className="flex flex-col justify-between h-32 p-4 transition-all duration-[200ms]"
                >
                  <div className="flex items-center justify-between">
                    <Icon className={`size-5 ${stat.color}`} aria-hidden="true" />
                    {stat.href && <ChevronRight className="size-3.5 text-text-tertiary" aria-hidden="true" />}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-text-tertiary truncate">{stat.label}</p>
                    <p className={`font-mono text-2xl font-bold ${stat.color} leading-none mt-1`}>
                      {stat.value}
                    </p>
                  </div>
                </Card>
              )

              return stat.href ? (
                <Link key={stat.label} href={stat.href} className="block outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan rounded-lg">
                  {content}
                </Link>
              ) : (
                <div key={stat.label}>{content}</div>
              )
            })}
          </div>
        </section>

        {/* Navigation Grid */}
        <section aria-label="Chức năng quản trị">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-tertiary mb-4">
            Phân hệ quản lý
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group block outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan rounded-lg"
                >
                  <Card
                    interactive
                    className="flex items-start gap-4 p-5 transition-all duration-[200ms] group-hover:border-surface-border-strong group-hover:shadow-elevation-2"
                  >
                    <div className="size-10 rounded-lg bg-surface-overlay border border-surface-border flex items-center justify-center shrink-0 text-brand-cyan group-hover:text-brand-cyan-bright transition-colors">
                      <Icon className="size-5" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base group-hover:text-brand-cyan transition-colors">
                          {item.title}
                        </CardTitle>
                        <ChevronRight className="size-4 text-text-tertiary group-hover:text-brand-cyan group-hover:translate-x-0.5 transition-all shrink-0" aria-hidden="true" />
                      </div>
                      <CardDescription className="text-xs mt-1 line-clamp-2">
                        {item.desc}
                      </CardDescription>
                    </div>
                  </Card>
                </Link>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
