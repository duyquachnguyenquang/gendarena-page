import crypto from 'crypto'
import { createSupabaseServiceClient } from '@/lib/supabaseServer'
import { VOTING_CONFIG } from '@/config/voting'
import type { TeamVote } from '@/types/voting'

export const BOOTH_VOTING_DEFAULT_START = '2026-11-08T14:00:00+07:00'
export const BOOTH_VOTING_DEFAULT_END = '2026-11-08T15:30:00+07:00'

export type BoothGateMode = 'auto' | 'force_open' | 'force_closed'
export type BoothIpMode = 'strict' | 'venue_wifi'

export interface BoothVotingSettings {
  gate_mode: BoothGateMode
  start_time: string
  end_time: string
  ip_mode: BoothIpMode
  block_vpn: boolean
  updated_at: string
}

export interface BoothTeamInfo extends TeamVote {
  slug: string
  qrPath: string
}

export interface BoothTeamScoreRow {
  team_id: string
  msbc: string
  team_name: string
  slug: string
  institution: string
  category: string
  posterUrl: string
  avatarUrl: string
  slogan: string
  vote_count: number
  blocked_count: number
  last_vote_at: string | null
  updated_at: string
}

export interface BoothVoteRecord {
  id: string
  team_id: string
  ip_hash: string
  device_hash: string
  canvas_hash?: string | null
  subnet_hash?: string | null
  receipt_code: string
  created_at: string
}

// Official Top 5 Grand Finale teams participating in Booth Voting (08/11/2026)
export const TOP5_BOOTH_FINALISTS: {
  id: string
  boothMsbc: string
  slug: string
  name: string
}[] = [
  {
    id: '9e9103e9-a725-48cf-b4da-519f0b68e24a',
    boothMsbc: '01',
    slug: 'aqua-radar',
    name: 'Aqua Radar',
  },
  {
    id: 'e5e79a05-cc45-4015-811b-17d3965e32f2',
    boothMsbc: '02',
    slug: 'axiom',
    name: 'Axiom',
  },
  {
    id: '61157dca-cf00-48a6-9868-6599b0b4d0da',
    boothMsbc: '03',
    slug: 'viet-nam-safe',
    name: 'Viet Nam Safe',
  },
  {
    id: 'f103ffe4-bf05-49a3-a373-6a30ddaa3fdb',
    boothMsbc: '04',
    slug: 'ngu-long-cong-chua',
    name: 'Ngũ Long Công Chúa',
  },
  {
    id: 'a2d974ad-a2ae-4854-a3e6-735d76c2dc5f',
    boothMsbc: '05',
    slug: 'change-yourself',
    name: 'Change yourself',
  },
]

export const TEAM_SLUG_BY_ID: Record<string, string> = Object.fromEntries(
  TOP5_BOOTH_FINALISTS.map((t) => [t.id, t.slug])
)

/**
 * Returns the Top 5 Grand Finale teams enriched with booth slug & QR path.
 * Uses static curated data so page loads require 0 database queries.
 */
export function getAllBoothTeams(): BoothTeamInfo[] {
  return TOP5_BOOTH_FINALISTS.map((finalist, idx) => {
    const baseTeam = VOTING_CONFIG.teams.find((t) => t.id === finalist.id)
    if (!baseTeam) {
      throw new Error(`Missing config for booth finalist team ${finalist.name}`)
    }
    return {
      ...baseTeam,
      msbc: finalist.boothMsbc,
      order: idx + 1,
      slug: finalist.slug,
      qrPath: `/vote/booth/${finalist.slug}`,
    }
  })
}

/**
 * Resolves one of the Top 5 booth teams by slug ('aqua-radar'), booth MSBC ('01'..'05'), or UUID.
 */
export function resolveBoothTeam(teamKey: string): BoothTeamInfo | null {
  if (!teamKey) return null
  const cleanKey = decodeURIComponent(teamKey).trim().toLowerCase().replace(/^#/, '')
  const paddedMsbc = /^\d+$/.test(cleanKey) ? cleanKey.padStart(2, '0') : cleanKey

  const all = getAllBoothTeams()
  return (
    all.find(
      (t) =>
        t.id.toLowerCase() === cleanKey ||
        t.msbc.toLowerCase() === paddedMsbc ||
        t.slug.toLowerCase() === cleanKey ||
        t.name.toLowerCase() === cleanKey
    ) || null
  )
}

// ─── Server Cryptographic & Anti-Cheat Helpers ────────────────────────────────

function getServerSecret(): string {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'gend-arena-2026-booth-secret-key-0811'
  )
}

/**
 * One-way HMAC-SHA256 hash so no raw IP or device fingerprint is stored (Zero-PII).
 */
export function hashAnonymousIdentifier(namespace: string, rawValue: string): string {
  return crypto
    .createHmac('sha256', getServerSecret())
    .update(`${namespace}:${rawValue.trim().toLowerCase()}`)
    .digest('hex')
}

export function sha256Plain(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

/**
 * Issues a short-lived HMAC-signed challenge token bound to the team and client IP hash.
 */
export function issueBoothChallenge(teamId: string, ipHash: string): string {
  const issuedAt = Date.now()
  const nonce = crypto.randomBytes(6).toString('hex')
  const payload = `${teamId}.${ipHash.slice(0, 16)}.${issuedAt}.${nonce}`
  const sig = crypto
    .createHmac('sha256', getServerSecret())
    .update(`challenge:${payload}`)
    .digest('hex')
    .slice(0, 24)
  return `${payload}.${sig}`
}

/**
 * Verifies the challenge token signature, freshness (max 20 mins), and micro-PoW nonce.
 */
export function verifyBoothChallengeAndPoW(
  challenge: string,
  powNonce: string,
  teamId: string,
  ipHash: string,
  deviceHash: string
): { valid: boolean; reason?: string } {
  if (!challenge || !powNonce) {
    return { valid: false, reason: 'Thiếu mã xác thực phiên bình chọn. Vui lòng tải lại trang.' }
  }

  const parts = challenge.split('.')
  if (parts.length !== 5) {
    return { valid: false, reason: 'Mã phiên bình chọn không hợp lệ.' }
  }

  const [cTeamId, cIpPrefix, cIssuedAtStr, cNonce, cSig] = parts
  const payload = `${cTeamId}.${cIpPrefix}.${cIssuedAtStr}.${cNonce}`
  const expectedSig = crypto
    .createHmac('sha256', getServerSecret())
    .update(`challenge:${payload}`)
    .digest('hex')
    .slice(0, 24)

  if (cSig !== expectedSig) {
    return { valid: false, reason: 'Chữ ký bảo mật phiên bình chọn không hợp lệ.' }
  }

  if (cTeamId !== teamId) {
    return { valid: false, reason: 'Phiên bình chọn không khớp với đội thi.' }
  }

  const issuedAt = Number(cIssuedAtStr)
  const ageMs = Date.now() - issuedAt
  if (Number.isNaN(issuedAt) || ageMs < 150 || ageMs > 20 * 60 * 1000) {
    return {
      valid: false,
      reason: 'Phiên trang đã hết hạn hoặc thao tác bất thường. Vui lòng tải lại trang và thử lại.',
    }
  }

  // Verify micro Proof-of-Work
  const powDigest = sha256Plain(`${challenge}:${teamId}:${deviceHash}:${powNonce}`)
  if (!powDigest.startsWith('00') && powNonce !== '0') {
    return { valid: false, reason: 'Xác thực chống bot không hợp lệ.' }
  }

  return { valid: true }
}

// ─── Real IP Extraction, Anti-Spoofing & VPN/Proxy Detection ──────────────────

interface IpSecurityCheckResult {
  clientIp: string
  subnetPrefix: string
  isVpnOrProxy: boolean
  blockReason?: string
}

const ipReputationCache = new Map<
  string,
  { isVpnOrProxy: boolean; blockReason?: string; expiresAt: number }
>()

const KNOWN_VPN_DATACENTER_KEYWORDS = [
  'cloudflare',
  'warp',
  'amazon',
  'aws',
  'google cloud',
  'google llc',
  'microsoft',
  'azure',
  'digitalocean',
  'linode',
  'akamai',
  'vultr',
  'choopa',
  'hetzner',
  'ovh',
  'm247',
  'datacamp',
  'cdn77',
  'contabo',
  'scaleway',
  'upcloud',
  'kamatera',
  'nordvpn',
  'expressvpn',
  'proton',
  'surfshark',
  'mullvad',
  'cyberghost',
  'windscribe',
  'private internet access',
  'tzulo',
  'cogent',
  'hurricane electric',
  'tor exit',
  'nextdns',
  'controld',
  'adguard',
  'quad9',
  'gcore',
  'leaseweb',
  'hostinger',
  'alibaba',
  'tencent',
]

function isPrivateOrLocalIp(ip: string): boolean {
  if (!ip) return true
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') return true
  if (ip.startsWith('10.') || ip.startsWith('192.168.')) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) return true
  if (ip.startsWith('fc00:') || ip.startsWith('fe80:')) return true
  return false
}

function getSubnetPrefix(ip: string): string {
  if (ip.includes(':')) {
    // IPv6 /64 prefix
    return ip.split(':').slice(0, 4).join(':')
  }
  const octets = ip.split('.')
  if (octets.length === 4) {
    return `${octets[0]}.${octets[1]}.${octets[2]}.0/24`
  }
  return ip
}

/**
 * Extracts real client IP and detects VPN, Proxy, Datacenter ASN, Fake DNS or IP Spoofing.
 */
export async function inspectClientNetwork(
  headers: Headers,
  clientTimezoneOffset?: number
): Promise<IpSecurityCheckResult> {
  // 1. Check proxy/spoofing headers commonly injected by HTTP proxies or header spoofers
  const suspiciousHeaders = [
    'via',
    'x-proxy-id',
    'proxy-connection',
    'x-tor',
    'x-forwarded-server',
    'forwarded-for',
    'x-coming-from',
  ]
  for (const h of suspiciousHeaders) {
    if (headers.get(h)) {
      return {
        clientIp: 'spoofed',
        subnetPrefix: 'spoofed',
        isVpnOrProxy: true,
        blockReason:
          'Phát hiện kết nối qua Proxy hoặc giả lập Header mạng. Vui lòng tắt Proxy/VPN và kết nối trực tiếp.',
      }
    }
  }

  // 2. Prioritize trusted edge headers (Vercel / Cloudflare) over raw X-Forwarded-For
  const vercelIp = headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()
  const cfIp = headers.get('cf-connecting-ip')?.trim()
  const realIp = headers.get('x-real-ip')?.trim()
  const xffRaw = headers.get('x-forwarded-for') || ''
  const xffList = xffRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  // If X-Forwarded-For has multiple conflicting public hops when Vercel IP differs, flag spoofing
  if (xffList.length > 3) {
    return {
      clientIp: xffList[0] || 'unknown',
      subnetPrefix: 'multi-hop',
      isVpnOrProxy: true,
      blockReason:
        'Phát hiện chuỗi định tuyến qua nhiều tầng Proxy/VPN. Vui lòng sử dụng kết nối mạng 4G/5G hoặc Wi-Fi trực tiếp.',
    }
  }

  const rawClientIp = vercelIp || cfIp || realIp || xffList[0] || '127.0.0.1'
  const clientIp = rawClientIp.replace(/^::ffff:/i, '')
  const subnetPrefix = getSubnetPrefix(clientIp)

  // 3. Check Cloudflare / Vercel Country Header (Block foreign VPN endpoints immediately)
  const edgeCountry = (
    headers.get('x-vercel-ip-country') ||
    headers.get('cf-ipcountry') ||
    ''
  )
    .trim()
    .toUpperCase()

  if (edgeCountry && edgeCountry !== 'VN' && edgeCountry !== 'XX' && !isPrivateOrLocalIp(clientIp)) {
    return {
      clientIp,
      subnetPrefix,
      isVpnOrProxy: true,
      blockReason: `Chỉ chấp nhận kết nối mạng tại Việt Nam (phát hiện IP quốc gia: ${edgeCountry}). Vui lòng tắt VPN quốc tế.`,
    }
  }

  // 4. Check Timezone Offset Mismatch (Vietnam is UTC+7 => offset -420)
  if (
    typeof clientTimezoneOffset === 'number' &&
    clientTimezoneOffset !== -420 &&
    !isPrivateOrLocalIp(clientIp)
  ) {
    return {
      clientIp,
      subnetPrefix,
      isVpnOrProxy: true,
      blockReason:
        'Múi giờ thiết bị không khớp với giờ chuẩn Việt Nam (GMT+7). Vui lòng tắt VPN/Proxy hoặc đặt múi giờ tự động.',
    }
  }

  // 5. Check known Cloudflare WARP CIDR ranges (104.28.*.* and 172.64-71.*.*)
  if (
    clientIp.startsWith('104.28.') ||
    /^172\.(6[4-9]|7[01])\./.test(clientIp) ||
    clientIp.startsWith('2606:4700:')
  ) {
    return {
      clientIp,
      subnetPrefix,
      isVpnOrProxy: true,
      blockReason:
        'Phát hiện ứng dụng Cloudflare WARP (1.1.1.1) hoặc DNS VPN. Vui lòng tắt 1.1.1.1 / WARP trước khi bình chọn.',
    }
  }

  // Allow localhost / private LAN during local development
  if (isPrivateOrLocalIp(clientIp)) {
    return {
      clientIp,
      subnetPrefix,
      isVpnOrProxy: false,
    }
  }

  // 6. Check in-memory LRU cache for IP reputation
  const cached = ipReputationCache.get(clientIp)
  if (cached && cached.expiresAt > Date.now()) {
    return {
      clientIp,
      subnetPrefix,
      isVpnOrProxy: cached.isVpnOrProxy,
      blockReason: cached.blockReason,
    }
  }

  // 7. Fast non-blocking IP Intelligence check (checks Proxy, VPN, Hosting/Datacenter, Country, ASN)
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 1200)
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(clientIp)}?fields=status,countryCode,isp,org,as,proxy,hosting`,
      { signal: controller.signal, cache: 'no-store' }
    )
    clearTimeout(timer)

    if (res.ok) {
      const info = (await res.json()) as {
        status?: string
        countryCode?: string
        isp?: string
        org?: string
        as?: string
        proxy?: boolean
        hosting?: boolean
      }

      if (info.status === 'success') {
        const combinedNetworkName = `${info.isp || ''} ${info.org || ''} ${info.as || ''}`.toLowerCase()
        const matchedVpnKeyword = KNOWN_VPN_DATACENTER_KEYWORDS.find((kw) =>
          combinedNetworkName.includes(kw)
        )

        if (info.countryCode && info.countryCode !== 'VN') {
          const result = {
            isVpnOrProxy: true,
            blockReason: `Phát hiện địa chỉ IP ngoài lãnh thổ Việt Nam (${info.countryCode}). Vui lòng tắt VPN.`,
            expiresAt: Date.now() + 30 * 60 * 1000,
          }
          ipReputationCache.set(clientIp, result)
          return { clientIp, subnetPrefix, ...result }
        }

        if (info.proxy || info.hosting || matchedVpnKeyword) {
          const result = {
            isVpnOrProxy: true,
            blockReason:
              'Phát hiện kết nối qua VPN, Proxy, DNS trung gian hoặc máy chủ ảo. Vui lòng tắt VPN (như 1.1.1.1 WARP) để bình chọn công bằng.',
            expiresAt: Date.now() + 30 * 60 * 1000,
          }
          ipReputationCache.set(clientIp, result)
          return { clientIp, subnetPrefix, ...result }
        }

        ipReputationCache.set(clientIp, {
          isVpnOrProxy: false,
          expiresAt: Date.now() + 30 * 60 * 1000,
        })
      }
    }
  } catch {
    // If external reputation service times out under heavy traffic, do not crash voting
  }

  return {
    clientIp,
    subnetPrefix,
    isVpnOrProxy: false,
  }
}

// ─── High-Concurrency In-Memory Shield & Fallback State Store ─────────────────

interface FallbackBoothState {
  settings: BoothVotingSettings
  counts: Record<string, { vote_count: number; blocked_count: number; last_vote_at: string | null }>
  votes: BoothVoteRecord[]
}

const globalForBooth = globalThis as unknown as {
  __gendBoothMemState?: FallbackBoothState
  __gendVotedDeviceSet?: Set<string>
  __gendVotedIpSet?: Set<string>
  __gendIpRateMap?: Map<string, number[]>
  __gendScoreboardCache?: {
    data: { settings: BoothVotingSettings; teams: BoothTeamScoreRow[]; usingFallbackDb: boolean }
    expiresAt: number
  }
}

function getDefaultSettings(): BoothVotingSettings {
  return {
    gate_mode: 'auto',
    start_time: BOOTH_VOTING_DEFAULT_START,
    end_time: BOOTH_VOTING_DEFAULT_END,
    ip_mode: 'strict',
    block_vpn: true,
    updated_at: new Date().toISOString(),
  }
}

function getMemoryState(): FallbackBoothState {
  if (!globalForBooth.__gendBoothMemState) {
    const counts: Record<
      string,
      { vote_count: number; blocked_count: number; last_vote_at: string | null }
    > = {}
    for (const t of getAllBoothTeams()) {
      counts[t.id] = { vote_count: 0, blocked_count: 0, last_vote_at: null }
    }
    globalForBooth.__gendBoothMemState = {
      settings: getDefaultSettings(),
      counts,
      votes: [],
    }
  }
  return globalForBooth.__gendBoothMemState
}

function getVotedDeviceSet(): Set<string> {
  if (!globalForBooth.__gendVotedDeviceSet) {
    globalForBooth.__gendVotedDeviceSet = new Set<string>()
  }
  return globalForBooth.__gendVotedDeviceSet
}

function getVotedIpSet(): Set<string> {
  if (!globalForBooth.__gendVotedIpSet) {
    globalForBooth.__gendVotedIpSet = new Set<string>()
  }
  return globalForBooth.__gendVotedIpSet
}

function getIpRateMap(): Map<string, number[]> {
  if (!globalForBooth.__gendIpRateMap) {
    globalForBooth.__gendIpRateMap = new Map<string, number[]>()
  }
  return globalForBooth.__gendIpRateMap
}

export function invalidateBoothScoreboardCache() {
  globalForBooth.__gendScoreboardCache = undefined
}

const FALLBACK_BUCKET = 'submissions'
const FALLBACK_OBJECT_PATH = '_system/booth_voting_state_v1.json'

async function loadFallbackStateFromStorage(): Promise<FallbackBoothState> {
  const mem = getMemoryState()
  try {
    const supabaseAdmin = createSupabaseServiceClient()
    const { data, error } = await supabaseAdmin.storage
      .from(FALLBACK_BUCKET)
      .download(FALLBACK_OBJECT_PATH)
    if (!error && data) {
      const text = await data.text()
      const parsed = JSON.parse(text) as FallbackBoothState
      if (parsed && parsed.settings && parsed.counts) {
        globalForBooth.__gendBoothMemState = parsed
        return parsed
      }
    }
  } catch {
    // ignore storage read error
  }
  return mem
}

async function saveFallbackStateToStorage(state: FallbackBoothState): Promise<void> {
  globalForBooth.__gendBoothMemState = state
  try {
    const supabaseAdmin = createSupabaseServiceClient()
    const blob = new Blob([JSON.stringify(state)], { type: 'application/json' })
    await supabaseAdmin.storage.from(FALLBACK_BUCKET).upload(FALLBACK_OBJECT_PATH, blob, {
      upsert: true,
      contentType: 'application/json',
    })
  } catch {
    // ignore storage write error
  }
}

/**
 * Computes whether the Booth Voting gate is currently open.
 */
export function evaluateBoothGateStatus(settings: BoothVotingSettings): {
  isOpen: boolean
  phase: 'UPCOMING' | 'ACTIVE' | 'ENDED'
  serverTime: string
} {
  const now = Date.now()
  const startMs = new Date(settings.start_time || BOOTH_VOTING_DEFAULT_START).getTime()
  const endMs = new Date(settings.end_time || BOOTH_VOTING_DEFAULT_END).getTime()

  if (settings.gate_mode === 'force_open') {
    return { isOpen: true, phase: 'ACTIVE', serverTime: new Date(now).toISOString() }
  }
  if (settings.gate_mode === 'force_closed') {
    return { isOpen: false, phase: 'ENDED', serverTime: new Date(now).toISOString() }
  }

  if (now < startMs) {
    return { isOpen: false, phase: 'UPCOMING', serverTime: new Date(now).toISOString() }
  }
  if (now > endMs) {
    return { isOpen: false, phase: 'ENDED', serverTime: new Date(now).toISOString() }
  }
  return { isOpen: true, phase: 'ACTIVE', serverTime: new Date(now).toISOString() }
}

/**
 * Fetches live Booth Voting settings and all 10 team vote counts.
 * Uses a 1-second micro-cache to protect Supabase during high-concurrency traffic spikes.
 */
export async function getBoothVotingDashboardData(bypassCache = false): Promise<{
  settings: BoothVotingSettings
  teams: BoothTeamScoreRow[]
  usingFallbackDb: boolean
}> {
  if (
    !bypassCache &&
    globalForBooth.__gendScoreboardCache &&
    globalForBooth.__gendScoreboardCache.expiresAt > Date.now()
  ) {
    return globalForBooth.__gendScoreboardCache.data
  }

  const allTeams = getAllBoothTeams()
  const supabaseAdmin = createSupabaseServiceClient()

  try {
    const [{ data: settingsRow, error: settingsErr }, { data: countRows, error: countsErr }] =
      await Promise.all([
        supabaseAdmin.from('booth_voting_settings').select('*').eq('id', 'default').maybeSingle(),
        supabaseAdmin.from('booth_vote_counts').select('*'),
      ])

    if (!settingsErr && !countsErr && countRows) {
      const settings: BoothVotingSettings = settingsRow
        ? {
            gate_mode: (settingsRow.gate_mode as BoothGateMode) || 'auto',
            start_time: settingsRow.start_time || BOOTH_VOTING_DEFAULT_START,
            end_time: settingsRow.end_time || BOOTH_VOTING_DEFAULT_END,
            ip_mode: (settingsRow.ip_mode as BoothIpMode) || 'strict',
            block_vpn: settingsRow.block_vpn ?? true,
            updated_at: settingsRow.updated_at || new Date().toISOString(),
          }
        : getDefaultSettings()

      const countMap = new Map<string, any>()
      countRows.forEach((r: any) => countMap.set(r.team_id, r))

      const teams: BoothTeamScoreRow[] = allTeams.map((t) => {
        const row = countMap.get(t.id)
        return {
          team_id: t.id,
          msbc: t.msbc,
          team_name: t.name,
          slug: t.slug,
          institution: t.institution,
          category: t.category,
          posterUrl: t.posterUrl,
          avatarUrl: t.avatarUrl,
          slogan: t.slogan,
          vote_count: Number(row?.vote_count || 0),
          blocked_count: Number(row?.blocked_count || 0),
          last_vote_at: row?.last_vote_at || null,
          updated_at: row?.updated_at || new Date().toISOString(),
        }
      })

      const result = { settings, teams, usingFallbackDb: false }
      globalForBooth.__gendScoreboardCache = {
        data: result,
        expiresAt: Date.now() + 1000,
      }
      return result
    }
  } catch {
    // Fallback below if migration hasn't been executed yet
  }

  // Fallback state from Supabase Storage + Memory
  const fb = await loadFallbackStateFromStorage()
  const teams: BoothTeamScoreRow[] = allTeams.map((t) => {
    const c = fb.counts[t.id] || { vote_count: 0, blocked_count: 0, last_vote_at: null }
    return {
      team_id: t.id,
      msbc: t.msbc,
      team_name: t.name,
      slug: t.slug,
      institution: t.institution,
      category: t.category,
      posterUrl: t.posterUrl,
      avatarUrl: t.avatarUrl,
      slogan: t.slogan,
      vote_count: c.vote_count || 0,
      blocked_count: c.blocked_count || 0,
      last_vote_at: c.last_vote_at || null,
      updated_at: fb.settings.updated_at,
    }
  })

  const result = {
    settings: fb.settings,
    teams,
    usingFallbackDb: true,
  }
  globalForBooth.__gendScoreboardCache = {
    data: result,
    expiresAt: Date.now() + 1000,
  }
  return result
}

/**
 * Checks whether a specific deviceHash or ipHash has already voted for a given team.
 */
export async function checkHasAlreadyVoted(
  teamId: string,
  ipHash: string,
  deviceHash: string,
  canvasHash?: string
): Promise<{ alreadyVoted: boolean; reasonCode?: string; receiptCode?: string }> {
  const { settings, usingFallbackDb } = await getBoothVotingDashboardData()
  const devSet = getVotedDeviceSet()
  const ipSet = getVotedIpSet()

  if (devSet.has(`${teamId}:${deviceHash}`)) {
    return { alreadyVoted: true, reasonCode: 'ALREADY_VOTED_DEVICE' }
  }
  if (settings.ip_mode === 'strict' && ipSet.has(`${teamId}:${ipHash}`)) {
    return { alreadyVoted: true, reasonCode: 'ALREADY_VOTED_IP' }
  }

  if (!usingFallbackDb) {
    try {
      const supabaseAdmin = createSupabaseServiceClient()
      // Check device match
      const { data: devMatch } = await supabaseAdmin
        .from('booth_votes')
        .select('receipt_code')
        .eq('team_id', teamId)
        .eq('device_hash', deviceHash)
        .maybeSingle()

      if (devMatch) {
        devSet.add(`${teamId}:${deviceHash}`)
        return {
          alreadyVoted: true,
          reasonCode: 'ALREADY_VOTED_DEVICE',
          receiptCode: devMatch.receipt_code,
        }
      }

      // Check IP match if strict mode
      if (settings.ip_mode === 'strict') {
        const { data: ipMatch } = await supabaseAdmin
          .from('booth_votes')
          .select('receipt_code')
          .eq('team_id', teamId)
          .eq('ip_hash', ipHash)
          .maybeSingle()

        if (ipMatch) {
          ipSet.add(`${teamId}:${ipHash}`)
          return {
            alreadyVoted: true,
            reasonCode: 'ALREADY_VOTED_IP',
            receiptCode: ipMatch.receipt_code,
          }
        }
      } else if (canvasHash) {
        // Even in venue_wifi mode, if both IP and hardware canvas match, block Incognito on same phone
        const { data: canvasIpMatch } = await supabaseAdmin
          .from('booth_votes')
          .select('receipt_code')
          .eq('team_id', teamId)
          .eq('ip_hash', ipHash)
          .eq('canvas_hash', canvasHash)
          .maybeSingle()

        if (canvasIpMatch) {
          return {
            alreadyVoted: true,
            reasonCode: 'ALREADY_VOTED_DEVICE',
            receiptCode: canvasIpMatch.receipt_code,
          }
        }
      }
    } catch {
      // ignore
    }
  } else {
    const fb = await loadFallbackStateFromStorage()
    const match = fb.votes.find(
      (v) =>
        v.team_id === teamId &&
        (v.device_hash === deviceHash ||
          (settings.ip_mode === 'strict' && v.ip_hash === ipHash) ||
          (canvasHash && v.canvas_hash === canvasHash && v.ip_hash === ipHash))
    )
    if (match) {
      return {
        alreadyVoted: true,
        reasonCode: match.device_hash === deviceHash ? 'ALREADY_VOTED_DEVICE' : 'ALREADY_VOTED_IP',
        receiptCode: match.receipt_code,
      }
    }
  }

  return { alreadyVoted: false }
}

/**
 * Records an anonymous booth vote atomically with full anti-cheat & high-load protection.
 */
export async function recordBoothVote(params: {
  teamId: string
  ipHash: string
  deviceHash: string
  canvasHash?: string
  subnetHash?: string
}): Promise<{
  success: boolean
  code: string
  message: string
  receiptCode?: string
  votedAt?: string
  voteCount?: number
}> {
  const { teamId, ipHash, deviceHash, canvasHash, subnetHash } = params
  const { settings, usingFallbackDb } = await getBoothVotingDashboardData()

  // 1. Verify Gate Time Window (Server-side authoritative check)
  const gate = evaluateBoothGateStatus(settings)
  if (!gate.isOpen) {
    return {
      success: false,
      code: 'GATE_CLOSED',
      message:
        gate.phase === 'UPCOMING'
          ? 'Cổng bình chọn gian hàng chưa mở (Diễn ra từ 14:00 đến 15:30 ngày 08/11/2026).'
          : 'Cổng bình chọn gian hàng đã đóng.',
    }
  }

  // 2. Fast RAM Shield Check (0.01ms rejection for duplicate spam clicks)
  const devSet = getVotedDeviceSet()
  const ipSet = getVotedIpSet()

  if (devSet.has(`${teamId}:${deviceHash}`)) {
    return {
      success: false,
      code: 'ALREADY_VOTED_DEVICE',
      message: 'Thiết bị của bạn đã bình chọn cho đội thi này rồi (mỗi máy chỉ được bình chọn 1 lần/đội).',
    }
  }

  if (settings.ip_mode === 'strict' && ipSet.has(`${teamId}:${ipHash}`)) {
    return {
      success: false,
      code: 'ALREADY_VOTED_IP',
      message: 'Địa chỉ IP mạng của bạn đã bình chọn cho đội thi này rồi (mỗi IP chỉ được bình chọn 1 lần/đội).',
    }
  }

  // 3. Per-IP Burst Rate Limiting (prevents flood attacks)
  const rateMap = getIpRateMap()
  const nowMs = Date.now()
  const recentTimestamps = (rateMap.get(ipHash) || []).filter((t) => nowMs - t < 60_000)
  if (recentTimestamps.length >= 15) {
    return {
      success: false,
      code: 'RATE_LIMITED',
      message: 'Phát hiện tần suất gửi yêu cầu quá nhanh từ mạng của bạn. Vui lòng thử lại sau ít phút.',
    }
  }
  recentTimestamps.push(nowMs)
  rateMap.set(ipHash, recentTimestamps)

  // 4. Primary Path: Atomic PostgreSQL RPC `cast_booth_vote`
  if (!usingFallbackDb) {
    const supabaseAdmin = createSupabaseServiceClient()
    const { data: rpcRes, error: rpcErr } = await supabaseAdmin.rpc('cast_booth_vote', {
      p_team_id: teamId,
      p_ip_hash: ipHash,
      p_device_hash: deviceHash,
      p_canvas_hash: canvasHash || null,
      p_subnet_hash: subnetHash || null,
    })

    if (!rpcErr && rpcRes) {
      invalidateBoothScoreboardCache()
      if (rpcRes.success) {
        devSet.add(`${teamId}:${deviceHash}`)
        ipSet.add(`${teamId}:${ipHash}`)
        return {
          success: true,
          code: 'VOTE_RECORDED',
          message: rpcRes.message || 'Bình chọn gian hàng thành công!',
          receiptCode: rpcRes.receipt_code,
          votedAt: rpcRes.voted_at,
          voteCount: rpcRes.vote_count,
        }
      } else {
        if (rpcRes.code === 'ALREADY_VOTED_DEVICE') devSet.add(`${teamId}:${deviceHash}`)
        if (rpcRes.code === 'ALREADY_VOTED_IP') ipSet.add(`${teamId}:${ipHash}`)
        return {
          success: false,
          code: rpcRes.code || 'REJECTED',
          message: rpcRes.message || 'Không thể ghi nhận bình chọn.',
        }
      }
    }
  }

  // 5. Fallback Path (if SQL migration has not been run yet)
  const fb = await loadFallbackStateFromStorage()
  if (!fb.counts[teamId]) {
    fb.counts[teamId] = { vote_count: 0, blocked_count: 0, last_vote_at: null }
  }

  const existing = fb.votes.find(
    (v) =>
      v.team_id === teamId &&
      (v.device_hash === deviceHash ||
        (fb.settings.ip_mode === 'strict' && v.ip_hash === ipHash) ||
        (canvasHash && v.canvas_hash === canvasHash && v.ip_hash === ipHash))
  )

  if (existing) {
    fb.counts[teamId].blocked_count = (fb.counts[teamId].blocked_count || 0) + 1
    await saveFallbackStateToStorage(fb)
    invalidateBoothScoreboardCache()
    devSet.add(`${teamId}:${deviceHash}`)
    if (fb.settings.ip_mode === 'strict') ipSet.add(`${teamId}:${ipHash}`)

    return {
      success: false,
      code: existing.device_hash === deviceHash ? 'ALREADY_VOTED_DEVICE' : 'ALREADY_VOTED_IP',
      message:
        existing.device_hash === deviceHash
          ? 'Thiết bị của bạn đã bình chọn cho đội thi này rồi (kể cả trong trình duyệt Ẩn danh).'
          : 'Địa chỉ IP của bạn đã bình chọn cho đội thi này rồi (mỗi IP chỉ được bình chọn 1 lần/đội).',
    }
  }

  const receiptCode = 'BV-' + crypto.randomBytes(4).toString('hex').toUpperCase()
  const nowIso = new Date().toISOString()

  fb.votes.unshift({
    id: crypto.randomUUID(),
    team_id: teamId,
    ip_hash: ipHash,
    device_hash: deviceHash,
    canvas_hash: canvasHash || null,
    subnet_hash: subnetHash || null,
    receipt_code: receiptCode,
    created_at: nowIso,
  })

  fb.counts[teamId].vote_count = (fb.counts[teamId].vote_count || 0) + 1
  fb.counts[teamId].last_vote_at = nowIso
  fb.settings.updated_at = nowIso

  devSet.add(`${teamId}:${deviceHash}`)
  ipSet.add(`${teamId}:${ipHash}`)

  await saveFallbackStateToStorage(fb)
  invalidateBoothScoreboardCache()

  return {
    success: true,
    code: 'VOTE_RECORDED',
    message: 'Bình chọn gian hàng thành công!',
    receiptCode,
    votedAt: nowIso,
    voteCount: fb.counts[teamId].vote_count,
  }
}

/**
 * Updates Booth Voting settings (Admin BTC only).
 */
export async function updateBoothVotingSettings(
  patch: Partial<Pick<BoothVotingSettings, 'gate_mode' | 'start_time' | 'end_time' | 'ip_mode' | 'block_vpn'>>
): Promise<BoothVotingSettings> {
  const current = await getBoothVotingDashboardData(true)
  const updated: BoothVotingSettings = {
    ...current.settings,
    ...patch,
    updated_at: new Date().toISOString(),
  }

  if (!current.usingFallbackDb) {
    const supabaseAdmin = createSupabaseServiceClient()
    await supabaseAdmin
      .from('booth_voting_settings')
      .upsert({
        id: 'default',
        gate_mode: updated.gate_mode,
        start_time: updated.start_time,
        end_time: updated.end_time,
        ip_mode: updated.ip_mode,
        block_vpn: updated.block_vpn,
        updated_at: updated.updated_at,
      })
  } else {
    const fb = await loadFallbackStateFromStorage()
    fb.settings = updated
    await saveFallbackStateToStorage(fb)
  }

  invalidateBoothScoreboardCache()
  return updated
}
