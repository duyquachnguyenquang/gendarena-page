import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// Map from 1Vote candidate ID -> Local Team UUID
const CANDIDATE_ID_MAP: Record<string, string> = {
  aCF8: 'a2236802-2fb9-4a6d-8bb1-bea3874d19ea', // F4ST
  Ei7g: 'a2d974ad-a2ae-4854-a3e6-735d76c2dc5f', // CHANGE YOURSELF
  eryC: 'ba52dec7-75d0-4f06-8153-23d102e3971b', // FROM L TO E
  g71x: 'e5e79a05-cc45-4015-811b-17d3965e32f2', // AXIOM
  JJhB: 'f103ffe4-bf05-49a3-a373-6a30ddaa3fdb', // NGŨ LONG CÔNG CHÚA
  m5fo: '77ccb7ee-7a16-4582-bb07-81d5f2ec892b', // APEX
  ZQyQ: '61157dca-cf00-48a6-9868-6599b0b4d0da', // VIET NAM SAFE
  zzrI: '45289e54-5a98-49d8-9f36-24660b1d6bfe', // VNSN
}

// Fallback name matching
const NAME_KEYWORD_MAP: Array<{ match: RegExp; teamId: string }> = [
  { match: /f4st/i, teamId: 'a2236802-2fb9-4a6d-8bb1-bea3874d19ea' },
  { match: /change\s*yourself/i, teamId: 'a2d974ad-a2ae-4854-a3e6-735d76c2dc5f' },
  { match: /from\s*l\s*to\s*e/i, teamId: 'ba52dec7-75d0-4f06-8153-23d102e3971b' },
  { match: /axiom/i, teamId: 'e5e79a05-cc45-4015-811b-17d3965e32f2' },
  { match: /ng[uũ]\s*long/i, teamId: 'f103ffe4-bf05-49a3-a373-6a30ddaa3fdb' },
  { match: /apex/i, teamId: '77ccb7ee-7a16-4582-bb07-81d5f2ec892b' },
  { match: /viet\s*nam\s*safe|vns\b/i, teamId: '61157dca-cf00-48a6-9868-6599b0b4d0da' },
  { match: /vnsn/i, teamId: '45289e54-5a98-49d8-9f36-24660b1d6bfe' },
]

interface RawCandidate {
  id: string
  name: string
  rank?: number
  voteCount?: number
  totalVoteValue?: number
  imageSrc?: string
}

export async function GET() {
  try {
    const res = await fetch('https://gendarena.1vote.vn/', {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      next: { revalidate: 30 }, // Cache 30s at server level
    })

    if (!res.ok) {
      throw new Error(`Failed to fetch 1Vote page: status ${res.status}`)
    }

    const html = await res.text()
    const match = html.match(/\\"initialCandidates\\":(\[.*?\]),\\"initialCandidateEventId\\"/)

    if (!match || !match[1]) {
      throw new Error('initialCandidates payload not found in 1Vote page')
    }

    const unescaped = match[1].replace(/\\"/g, '"')
    const candidates: RawCandidate[] = JSON.parse(unescaped)

    const votesByTeamId: Record<
      string,
      {
        votes: number
        rank: number
        oneVoteId: string
        name: string
      }
    > = {}

    let totalVotes = 0

    candidates.forEach((c) => {
      let teamId = CANDIDATE_ID_MAP[c.id]
      if (!teamId) {
        const found = NAME_KEYWORD_MAP.find((m) => m.match.test(c.name))
        if (found) teamId = found.teamId
      }

      const votes = typeof c.voteCount === 'number' ? c.voteCount : 0
      const rank = typeof c.rank === 'number' ? c.rank : 99
      totalVotes += votes

      if (teamId) {
        const slug = c.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[đĐ]/g, 'd')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')

        votesByTeamId[teamId] = {
          votes,
          rank,
          oneVoteId: c.id,
          name: c.name,
          candidateUrl: `https://gendarena.1vote.vn/candidate/EVENT_qwCuZ/${slug}-${c.id}`,
          directVoteUrl: `https://gendarena.1vote.vn/?voteEventId=EVENT_qwCuZ&voteCandidateId=${c.id}`,
        }
      }
    })

    return NextResponse.json(
      {
        success: true,
        updatedAt: new Date().toISOString(),
        totalVotes,
        votesByTeamId,
        leaderboard: candidates.map((c) => ({
          id: c.id,
          name: c.name,
          rank: c.rank ?? 0,
          votes: c.voteCount ?? 0,
        })),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
        },
      }
    )
  } catch (error: any) {
    console.error('[API /api/votes] Error scraping 1Vote:', error?.message)
    return NextResponse.json(
      {
        success: false,
        fallback: true,
        updatedAt: new Date().toISOString(),
        totalVotes: 0,
        votesByTeamId: {},
        error: error?.message || 'Failed to fetch live votes',
      },
      { status: 200 }
    )
  }
}
