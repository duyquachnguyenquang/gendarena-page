export interface FOHTeamMember {
  id: string
  name: string
  role: 'leader' | 'member'
  institution?: string
  faculty?: string
  activeForSelection?: boolean
}

export interface FOHTeam {
  id: string
  msbc: string
  slug: string
  name: string
  institution: string
  category: string
  slogan: string
  leaderName: string
  posterUrl: string
  members?: FOHTeamMember[]
  // 3 stages (max 50 each, total max 150)
  stage1: number
  stage2: number
  stage3: number
  score: number
  delta: number
  rank: number
  prevRank: number
  // Booth voting data (end of program)
  boothVotes: number
  boothDelta: number
  boothRank: number
  prevBoothRank: number
}

export type FOHDisplayView = 'STAGES' | 'BOOTH_VOTING' | 'TIMER' | 'STAGE3_PICKER'
export type ActiveStageKey = 1 | 2 | 3 | 'ALL'

export type FOHTimerMode = 'STOPPED' | 'RUNNING' | 'PAUSED'

export interface FOHTimerPreset {
  id: string
  label: string
  stageKey: 1 | 2 | 3 | 'QA' | 'SETUP' | 'CUSTOM'
  durationSeconds: number
  description: string
}

export interface FOHTimerState {
  mode: FOHTimerMode
  totalSeconds: number
  remainingSeconds: number
  targetTimestamp: number | null
  activeTeamId: string | null
  roundLabel: string
  soundEnabled: boolean
  warningSeconds: number
  urgentSeconds: number
  showOverlayOnScoreboard: boolean
}

export interface FOHStage3PickerState {
  isActive: boolean
  teamId: string | null
  chosenMemberId: string | null
  chosenMemberName: string | null
  chosenMemberRole: string | null
  chosenMemberInstitution: string | null
  isRolling: boolean
  rollDurationMs: number
  rollStartedAt: number | null
  completedAt: number | null
}

export interface FOHState {
  title: string
  subtitle: string
  roundName: string
  displayView: FOHDisplayView
  activeStage: ActiveStageKey
  stageNames: {
    s1: string
    s2: string
    s3: string
  }
  boothTitle: string
  boothSubtitle: string
  isHidden: boolean
  isFrozen: boolean
  autoSortDisplay: boolean
  hiddenMessage: string
  soundEnabled: boolean
  timer: FOHTimerState
  stage3Picker: FOHStage3PickerState
  teams: FOHTeam[]
  updatedAt: number
}

export type SoundEffect =
  | 'score'
  | 'sort'
  | 'curtain'
  | 'celebrate'
  | 'publish'
  | 'timer_countdown'
  | 'timer_warning'
  | 'times_up'
  | 'roulette_tick'
  | 'roulette_win'

export type FOHMessage =
  | { type: 'STATE_UPDATE'; state: FOHState; sfx?: SoundEffect }
  | { type: 'TRIGGER_FIREWORKS' }
  | { type: 'PING' }
  | { type: 'PONG'; timestamp: number }

export const MAX_STAGE_SCORE = 50
export const MAX_TOTAL_SCORE = 150

export const FOH_TIMER_PRESETS: FOHTimerPreset[] = [
  {
    id: 's1-pitch',
    label: 'Chặng 1: Pitching',
    stageKey: 1,
    durationSeconds: 300,
    description: 'Thuyết trình mở đầu (5 phút)',
  },
  {
    id: 's1-qa',
    label: 'Chặng 1: Q&A BGK',
    stageKey: 1,
    durationSeconds: 180,
    description: 'Hỏi đáp Ban Giám Khảo (3 phút)',
  },
  {
    id: 's2-solution',
    label: 'Chặng 2: Trình bày',
    stageKey: 2,
    durationSeconds: 420,
    description: 'Trình bày giải pháp chi tiết (7 phút)',
  },
  {
    id: 's2-debate',
    label: 'Chặng 2: Phản biện',
    stageKey: 2,
    durationSeconds: 300,
    description: 'Phản biện đối kháng (5 phút)',
  },
  {
    id: 's3-final',
    label: 'Chặng 3: Vấn đáp',
    stageKey: 3,
    durationSeconds: 300,
    description: 'Vấn đáp chung cuộc (5 phút)',
  },
  {
    id: 'prep-setup',
    label: 'Chuẩn bị / Setup',
    stageKey: 'SETUP',
    durationSeconds: 60,
    description: 'Đội thi ổn định sân khấu (1 phút)',
  },
]

export const INITIAL_STAGE3_PICKER: FOHStage3PickerState = {
  isActive: false,
  teamId: '9e9103e9-a725-48cf-b4da-519f0b68e24a',
  chosenMemberId: null,
  chosenMemberName: null,
  chosenMemberRole: null,
  chosenMemberInstitution: null,
  isRolling: false,
  rollDurationMs: 4000,
  rollStartedAt: null,
  completedAt: null,
}

export const INITIAL_TIMER_STATE: FOHTimerState = {
  mode: 'STOPPED',
  totalSeconds: 300,
  remainingSeconds: 300,
  targetTimestamp: null,
  activeTeamId: '9e9103e9-a725-48cf-b4da-519f0b68e24a', // Default to first finalist
  roundLabel: 'Chặng 1: Thuyết trình Pitching (5 phút)',
  soundEnabled: true,
  warningSeconds: 60,
  urgentSeconds: 30,
  showOverlayOnScoreboard: true,
}

export function formatTimerSeconds(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const mins = Math.floor(s / 60)
  const rem = s % 60
  return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`
}

// Versioned storage keys for Top 5 Grand Finale (3 Stages + Booth Voting + Member Picker)
export const FOH_STORAGE_KEY = 'GEND_ARENA_FOH_ADMIN_TOP5_V4'
export const FOH_DISPLAY_SNAPSHOT_KEY = 'GEND_ARENA_FOH_DISPLAY_TOP5_V4'
export const FOH_CHANNEL_NAME = 'gend_arena_foh_realtime_top5_v4'

/**
 * Clamps a stage score strictly between 0 and 50 (supports up to 2 decimal places).
 */
export function clampStageScore(val: number): number {
  if (Number.isNaN(val) || val < 0) return 0
  if (val > MAX_STAGE_SCORE) return MAX_STAGE_SCORE
  return Number(val.toFixed(2))
}

/**
 * Official Top 5 Grand Finale Teams from GenD Arena 2026 Database:
 * #01 Aqua Radar (9e9103e9-a725-48cf-b4da-519f0b68e24a)
 * #02 Axiom (e5e79a05-cc45-4015-811b-17d3965e32f2)
 * #03 Viet Nam Safe (61157dca-cf00-48a6-9868-6599b0b4d0da)
 * #04 Ngũ Long Công Chúa (f103ffe4-bf05-49a3-a373-6a30ddaa3fdb)
 * #05 Change yourself (a2d974ad-a2ae-4854-a3e6-735d76c2dc5f)
 */
export const OFFICIAL_TOP5_FINALIST_TEAMS: FOHTeam[] = [
  {
    id: '9e9103e9-a725-48cf-b4da-519f0b68e24a',
    msbc: '01',
    slug: 'aqua-radar',
    name: 'Aqua Radar',
    institution: 'ĐH Văn Lang',
    category: 'Xã hội và Môi trường',
    slogan: 'Từ nông sản Việt – Vì một sức khỏe tốt hơn',
    leaderName: 'Trần Tín Hiền',
    posterUrl: '/images/teams/aqua-radar.webp',
    members: [
      { id: 'ar-1', name: 'Trần Tín Hiền', role: 'leader', institution: 'Đại Học Văn Lang', faculty: 'Khoa Kỹ thuật và Quản lý Công nghiệp' },
      { id: 'ar-2', name: 'Nguyễn Minh Triết', role: 'member', institution: 'Đại Học Văn Lang', faculty: 'Kinh doanh & Marketing' },
      { id: 'ar-3', name: 'Lê Hoàng Phúc', role: 'member', institution: 'Đại Học Văn Lang', faculty: 'Công nghệ Sinh học' },
      { id: 'ar-4', name: 'Phạm Thị Kim Ngân', role: 'member', institution: 'Đại Học Văn Lang', faculty: 'Quản trị Khởi nghiệp' },
      { id: 'ar-5', name: 'Đỗ Thành Đạt', role: 'member', institution: 'Đại Học Văn Lang', faculty: 'Thiết kế & Mỹ thuật số' },
    ],
    stage1: 0,
    stage2: 0,
    stage3: 0,
    score: 0,
    delta: 0,
    rank: 1,
    prevRank: 1,
    boothVotes: 0,
    boothDelta: 0,
    boothRank: 1,
    prevBoothRank: 1,
  },
  {
    id: 'e5e79a05-cc45-4015-811b-17d3965e32f2',
    msbc: '02',
    slug: 'axiom',
    name: 'Axiom',
    institution: 'ĐH Công nghệ Thông tin - ĐHQG TP.HCM',
    category: 'Xã hội và Môi trường',
    slogan: 'SolarOpt — Tối ưu hóa năng lượng mặt trời thông minh vì tương lai xanh',
    leaderName: 'Nguyễn Võ An Vi',
    posterUrl: '/images/teams/axiom.webp',
    members: [
      { id: 'ax-1', name: 'Nguyễn Võ An Vi', role: 'leader', institution: 'ĐH Công nghệ Thông tin - ĐHQG TP.HCM', faculty: 'Khoa học máy tính' },
      { id: 'ax-2', name: 'Trần Khôi Nguyên', role: 'member', institution: 'ĐH Công nghệ Thông tin - ĐHQG TP.HCM', faculty: 'Khoa học Máy tính' },
      { id: 'ax-3', name: 'Nguyễn Hoàng Minh', role: 'member', institution: 'ĐH Công nghệ Thông tin - ĐHQG TP.HCM', faculty: 'Khoa học máy tính' },
      { id: 'ax-4', name: 'Lê Văn Thanh Mạnh', role: 'member', institution: 'ĐH Công nghệ Thông tin - ĐHQG TP.HCM', faculty: 'Khoa học máy tính' },
      { id: 'ax-5', name: 'Lê Thiện', role: 'member', institution: 'ĐH Công nghệ Thông tin - ĐHQG TP.HCM', faculty: 'Khoa học Máy tính' },
    ],
    stage1: 0,
    stage2: 0,
    stage3: 0,
    score: 0,
    delta: 0,
    rank: 2,
    prevRank: 2,
    boothVotes: 0,
    boothDelta: 0,
    boothRank: 2,
    prevBoothRank: 2,
  },
  {
    id: '61157dca-cf00-48a6-9868-6599b0b4d0da',
    msbc: '03',
    slug: 'viet-nam-safe',
    name: 'Viet Nam Safe',
    institution: 'ĐH Văn Lang & ĐH Kinh tế TP.HCM',
    category: 'Xã hội và Môi trường',
    slogan: 'Công nghệ phát triển phải đi cùng an toàn',
    leaderName: 'Hùng Nguyễn',
    posterUrl: '/images/teams/viet-nam-safe.webp',
    members: [
      { id: 'vns-1', name: 'Hùng Nguyễn', role: 'leader', institution: 'Trường Đại Học Văn Lang', faculty: 'Khoa Quản Trị Kinh Doanh' },
      { id: 'vns-2', name: 'Nguyễn Ngọc Hà', role: 'member', institution: 'Đại học Kinh tế TP.HCM', faculty: 'Tài chính' },
      { id: 'vns-3', name: 'Lý Trí Vĩnh', role: 'member', institution: 'ĐH Công Nghệ Kỹ Thuật TPHCM', faculty: 'CNTT' },
      { id: 'vns-4', name: 'Trang Nguyễn Thị Thùy', role: 'member', institution: 'Đại học Kinh Tế', faculty: 'Khoa Du lịch' },
      { id: 'vns-5', name: 'Quân Huỳnh Hoàng', role: 'member', institution: 'Đại học Kinh tế TP.HCM', faculty: 'Khoa Kinh doanh quốc tế - Marketing' },
    ],
    stage1: 0,
    stage2: 0,
    stage3: 0,
    score: 0,
    delta: 0,
    rank: 3,
    prevRank: 3,
    boothVotes: 0,
    boothDelta: 0,
    boothRank: 3,
    prevBoothRank: 3,
  },
  {
    id: 'f103ffe4-bf05-49a3-a373-6a30ddaa3fdb',
    msbc: '04',
    slug: 'ngu-long-cong-chua',
    name: 'Ngũ Long Công Chúa',
    institution: 'ĐH Ngoại Thương TP.HCM & ĐH Khoa học Tự nhiên - ĐHQG TP.HCM',
    category: 'Kinh doanh, Thương mại và Tài chính',
    slogan: 'Bản lĩnh tiên phong, không ngại thử thách bứt phá mọi ranh giới',
    leaderName: 'Trần Thị Ngọc Tuyết',
    posterUrl: '/images/teams/ngu-long-cong-chua.webp',
    members: [
      { id: 'nlcc-1', name: 'Trần Thị Ngọc Tuyết', role: 'leader', institution: 'Trường Đại Học Ngoại Thương TPHCM', faculty: 'Quản trị Kinh doanh' },
      { id: 'nlcc-2', name: 'Trần Phan Gia Hiển', role: 'member', institution: 'Trường Đại học Khoa học tự nhiên', faculty: 'Khoa CNTT' },
      { id: 'nlcc-3', name: 'Nguyễn Hà Bảo Trân', role: 'member', institution: 'Đại học Kinh tế TP.HCM', faculty: 'Viện ISB' },
      { id: 'nlcc-4', name: 'Nguyễn Việt Hải', role: 'member', institution: 'Đại Học Văn Lang', faculty: 'Công Nghệ Thông Tin' },
      { id: 'nlcc-5', name: 'Đỗ Cao Kỳ Duyên', role: 'member', institution: 'Trường Đại học Ngoại Thương', faculty: 'Kinh tế Đối ngoại' },
    ],
    stage1: 0,
    stage2: 0,
    stage3: 0,
    score: 0,
    delta: 0,
    rank: 4,
    prevRank: 4,
    boothVotes: 0,
    boothDelta: 0,
    boothRank: 4,
    prevBoothRank: 4,
  },
  {
    id: 'a2d974ad-a2ae-4854-a3e6-735d76c2dc5f',
    msbc: '05',
    slug: 'change-yourself',
    name: 'Change yourself',
    institution: 'ĐH Giao thông Vận tải TP.HCM & ĐH FPT TP.HCM',
    category: 'Kinh doanh, Thương mại và Tài chính',
    slogan: 'Chủ động xây dựng mạng lưới kết nối và học hỏi cộng tác cùng chuyên gia',
    leaderName: 'Trần Thị Thuỳ Trân',
    posterUrl: '/images/teams/change-yourself.webp',
    members: [
      { id: 'cy-1', name: 'Trần Thị Thuỳ Trân', role: 'leader', institution: 'ĐH Giao thông Vận tải TP.HCM', faculty: 'Viện Đào tạo Chất lượng cao' },
      { id: 'cy-2', name: 'Trần Cao Minh Đạt', role: 'member', institution: 'Trường Đại học FPT TP.HCM', faculty: 'Khoa Công nghệ Thông tin' },
      { id: 'cy-3', name: 'Nguyễn Thị Mai Linh', role: 'member', institution: 'ĐH Giao thông Vận tải TP.HCM', faculty: 'Kinh tế Vận tải' },
      { id: 'cy-4', name: 'Lê Quốc Bảo', role: 'member', institution: 'Trường Đại học FPT TP.HCM', faculty: 'Kỹ thuật Phần mềm' },
      { id: 'cy-5', name: 'Huỳnh Gia Huy', role: 'member', institution: 'ĐH Giao thông Vận tải TP.HCM', faculty: 'Logistics và Chuỗi cung ứng' },
    ],
    stage1: 0,
    stage2: 0,
    stage3: 0,
    score: 0,
    delta: 0,
    rank: 5,
    prevRank: 5,
    boothVotes: 0,
    boothDelta: 0,
    boothRank: 5,
    prevBoothRank: 5,
  },
]

/**
 * Computes synchronized real-time ranks (1..5) for both 3-Stage Competition Score (max 150)
 * and Booth Voting (end-of-show), sorting by the active view if sortArray is true.
 */
export function syncTeamRanks(
  teams: FOHTeam[],
  sortArray = true,
  displayView: FOHDisplayView = 'STAGES'
): FOHTeam[] {
  const normalized = teams.map((t) => {
    const s1 = clampStageScore(Number(t.stage1 ?? 0))
    const s2 = clampStageScore(Number(t.stage2 ?? 0))
    const s3 = clampStageScore(Number(t.stage3 ?? 0))
    const total = Number((s1 + s2 + s3).toFixed(2))
    const votes = Math.max(0, Math.round(Number(t.boothVotes ?? 0)))
    return {
      ...t,
      stage1: s1,
      stage2: s2,
      stage3: s3,
      score: total,
      boothVotes: votes,
    }
  })

  // 1. Rank by 3-stage total score (descending, tie-breaker msbc)
  const stageOrder = [...normalized].sort(
    (a, b) => b.score - a.score || a.msbc.localeCompare(b.msbc)
  )
  const stageRankMap = new Map<string, number>()
  stageOrder.forEach((team, idx) => stageRankMap.set(team.id, idx + 1))

  // 2. Rank by Booth Voting count (descending, tie-breaker msbc)
  const boothOrder = [...normalized].sort(
    (a, b) => b.boothVotes - a.boothVotes || a.msbc.localeCompare(b.msbc)
  )
  const boothRankMap = new Map<string, number>()
  boothOrder.forEach((team, idx) => boothRankMap.set(team.id, idx + 1))

  const updated = normalized.map((team) => {
    const newStageRank = stageRankMap.get(team.id) ?? team.rank
    const newBoothRank = boothRankMap.get(team.id) ?? team.boothRank
    return {
      ...team,
      prevRank: team.rank || newStageRank,
      rank: newStageRank,
      prevBoothRank: team.boothRank || newBoothRank,
      boothRank: newBoothRank,
    }
  })

  if (sortArray) {
    if (displayView === 'BOOTH_VOTING') {
      return [...updated].sort((a, b) => a.boothRank - b.boothRank)
    }
    return [...updated].sort((a, b) => a.rank - b.rank)
  }

  return updated
}

export const INITIAL_FOH_STATE: FOHState = {
  title: 'Đêm Chung Kết GenD Arena: Develop',
  subtitle: 'Bảng xếp hạng điểm số trực tiếp 3 Chặng Thi (Tối đa 150 điểm)',
  roundName: 'VÒNG CHUNG KẾT • 08/11/2026',
  displayView: 'STAGES',
  activeStage: 1,
  stageNames: {
    s1: 'Chặng 1',
    s2: 'Chặng 2',
    s3: 'Chặng 3',
  },
  boothTitle: 'Kết Quả Bình Chọn Gian Hàng — Top 5 Chung Kết',
  boothSubtitle: 'Giải thưởng Đội thi Được Yêu Thích Nhất tại khu vực Gian hàng Triển lãm',
  isHidden: false,
  isFrozen: false,
  autoSortDisplay: true,
  hiddenMessage: 'Hội đồng Ban Giám khảo đang tổng hợp điểm số...',
  soundEnabled: true,
  timer: INITIAL_TIMER_STATE,
  stage3Picker: INITIAL_STAGE3_PICKER,
  updatedAt: Date.now(),
  teams: OFFICIAL_TOP5_FINALIST_TEAMS,
}

export function playFOHSound(type: SoundEffect, enabled = true) {
  if (typeof window === 'undefined' || !enabled) return
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime

    if (type === 'score') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(520, now)
      osc.frequency.exponentialRampToValueAtTime(920, now + 0.12)
      gain.gain.setValueAtTime(0.16, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.15)
    } else if (type === 'sort' || type === 'publish') {
      const notes = [440, 554.37, 659.25, 880]
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        const t = now + idx * 0.055
        osc.frequency.setValueAtTime(freq, t)
        gain.gain.setValueAtTime(0.15, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.24)
      })
    } else if (type === 'curtain') {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(240, now)
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.35)
      gain.gain.setValueAtTime(0.12, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.4)
    } else if (type === 'celebrate') {
      const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5]
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        const t = now + idx * 0.11
        osc.frequency.setValueAtTime(freq, t)
        gain.gain.setValueAtTime(0.2, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.38)
      })
    } else if (type === 'timer_countdown') {
      // 5, 4, 3, 2, 1 short sharp alert beep
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, now)
      gain.gain.setValueAtTime(0.2, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.09)
    } else if (type === 'timer_warning') {
      // Alert chime for 60s / 30s threshold
      const freqs = [659.25, 880]
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        const t = now + idx * 0.09
        osc.frequency.setValueAtTime(freq, t)
        gain.gain.setValueAtTime(0.18, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.16)
      })
    } else if (type === 'times_up') {
      // TV Arena final buzzer gong (resonant sawtooth chord)
      const freqs = [220, 277.18, 329.63]
      freqs.forEach((freq) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sawtooth'
        osc.frequency.setValueAtTime(freq, now)
        osc.frequency.exponentialRampToValueAtTime(freq * 0.82, now + 0.85)
        gain.gain.setValueAtTime(0.26, now)
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(now)
        osc.stop(now + 0.9)
      })
    } else if (type === 'roulette_tick') {
      // High-speed mechanical wheel click
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(1100, now)
      gain.gain.setValueAtTime(0.14, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.035)
    } else if (type === 'roulette_win') {
      // Dramatic ascending fanfare chord when member is locked in
      const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'triangle'
        const t = now + idx * 0.075
        osc.frequency.setValueAtTime(freq, t)
        gain.gain.setValueAtTime(0.22, t)
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.42)
      })
    }
  } catch {
    // Ignore browser autoplay restrictions prior to user gesture
  }
}
