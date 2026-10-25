export interface TeamMember {
  name: string
  role: string
  university: string
  avatarUrl?: string
}

export interface TeamVote {
  id: string
  msbc: string // e.g. "#01" -> "#10"
  order: number
  name: string
  slogan: string
  quote: string // Câu nói tâm đắc nhất của đội
  summary: string // Tóm tắt dự án trong 2 câu dễ hiểu
  institution: string // Đơn vị đào tạo / trường đại diện
  category: string
  tags: string[]
  description: string
  problem: string
  solution: string
  techStack: string[]
  members: TeamMember[]
  avatarUrl: string
  posterUrl: string
  videoPitchUrl?: string // Optional embed URL
  videoDuration?: string
  eventistaUrl: string // Link cổng bình chọn Eventista (1Vote)
  votingDisabled?: boolean // Ẩn phần bình chọn nếu đội không đủ điều kiện video
  initialVotes?: number
  viewsCount?: number
  likesCount?: number
}

export type VotingPhaseStatus = 'UPCOMING' | 'ACTIVE' | 'ENDED'

export interface VotingConfig {
  title: string
  roundTitle: string
  competitionName: string
  startDate: string // ISO string: 2026-10-25T20:00:00+07:00
  endDate: string // ISO string: 2026-11-02T23:59:59+07:00
  sponsor: {
    name: string
    brandName: string
    role: string
    description: string
    websiteUrl: string
    logoUrl?: string
    badgeUrl?: string
    facebookUrl?: string
    email?: string
    hotline?: string
  }
  rules: {
    title: string
    content: string[]
  }[]
  teams: TeamVote[]
}
