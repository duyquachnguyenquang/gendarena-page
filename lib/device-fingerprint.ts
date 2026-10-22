'use client'

/**
 * Zero-PII Hardware Device Fingerprinting & Anti-Incognito / Anti-Bot Utility.
 * Collects only anonymous hardware/GPU rendering signatures and hashes them
 * one-way with SHA-256 in the browser. No personal data is ever collected.
 */

export interface DeviceSecurityPayload {
  deviceHash: string
  canvasHash: string
  webglHash: string
  audioHash: string
  timezone: string
  timezoneOffset: number
  webrtcAnomaly: boolean
  incognitoSuspected: boolean
}

export interface LocalVoteReceipt {
  teamId: string
  receiptCode: string
  votedAt: string
}

const STORAGE_PREFIX = 'gend_bv_2026_'
const IDB_NAME = 'gend_arena_booth_v1'
const IDB_STORE = 'receipts'
const CACHE_NAME = 'gend-booth-receipt-v1'

async function sha256Hex(input: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoded = new TextEncoder().encode(input)
    const digest = await window.crypto.subtle.digest('SHA-256', encoded)
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }
  // Fallback deterministic FNV-1a 256-bit simulation if SubtleCrypto unavailable
  let h1 = 0x811c9dc5
  let h2 = 0x811c9dc5
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i)
    h1 ^= c
    h1 = Math.imul(h1, 0x01000193)
    h2 ^= c + (i & 0xff)
    h2 = Math.imul(h2, 0x01000193)
  }
  return (
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0')
  ).repeat(4)
}

/**
 * Extracts hardware GPU renderer, vendor, and shader precision parameters.
 * Identical across Normal Mode and Incognito Mode on the same phone/computer.
 */
function getWebGLSignature(): string {
  try {
    const canvas = document.createElement('canvas')
    const gl =
      (canvas.getContext('webgl') as WebGLRenderingContext | null) ||
      (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null)
    if (!gl) return 'no-webgl'

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
    const vendor = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
      : gl.getParameter(gl.VENDOR)
    const renderer = debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER)

    const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE)
    const maxCube = gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE)
    const maxRenderBuf = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE)
    const maxViewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS)
    const maxVertexAttribs = gl.getParameter(gl.MAX_VERTEX_ATTRIBS)
    const maxVarying = gl.getParameter(gl.MAX_VARYING_VECTORS)
    const maxVertexUniforms = gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS)
    const maxFragUniforms = gl.getParameter(gl.MAX_FRAGMENT_UNIFORM_VECTORS)

    const vsHigh = gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT)
    const fsHigh = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT)

    return [
      vendor,
      renderer,
      maxTex,
      maxCube,
      maxRenderBuf,
      Array.isArray(maxViewport) || maxViewport instanceof Int32Array
        ? `${maxViewport[0]}x${maxViewport[1]}`
        : '',
      maxVertexAttribs,
      maxVarying,
      maxVertexUniforms,
      maxFragUniforms,
      vsHigh ? `${vsHigh.precision}:${vsHigh.rangeMin}:${vsHigh.rangeMax}` : '',
      fsHigh ? `${fsHigh.precision}:${fsHigh.rangeMin}:${fsHigh.rangeMax}` : '',
    ].join('|')
  } catch {
    return 'webgl-err'
  }
}

/**
 * Extracts deterministic subpixel & curve rendering signature from the GPU/OS 2D pipeline.
 */
function getCanvasSignature(): string {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 240
    canvas.height = 60
    const ctx = canvas.getContext('2d')
    if (!ctx) return 'no-canvas'

    ctx.textBaseline = 'alphabetic'
    ctx.fillStyle = '#f60'
    ctx.fillRect(100, 1, 62, 20)

    const grad = ctx.createLinearGradient(0, 0, 240, 0)
    grad.addColorStop(0, '#00f0ff')
    grad.addColorStop(0.5, '#7c3aed')
    grad.addColorStop(1, '#ec4899')
    ctx.fillStyle = grad
    ctx.font = '15px Arial, sans-serif'
    ctx.fillText('GenD-Arena-2026-#0811', 2, 18)

    ctx.strokeStyle = 'rgba(120, 220, 80, 0.8)'
    ctx.beginPath()
    ctx.arc(50, 35, 18, 0, Math.PI * 1.65, true)
    ctx.stroke()

    return canvas.toDataURL()
  } catch {
    return 'canvas-err'
  }
}

/**
 * Extracts deterministic OfflineAudioContext DSP oscillator + compressor signature.
 */
async function getAudioSignature(): Promise<string> {
  try {
    const AudioCtx =
      window.OfflineAudioContext ||
      (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext })
        .webkitOfflineAudioContext
    if (!AudioCtx) return 'no-audio'

    const context = new AudioCtx(1, 4500, 44100)
    const oscillator = context.createOscillator()
    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(10000, context.currentTime)

    const compressor = context.createDynamicsCompressor()
    compressor.threshold.setValueAtTime(-50, context.currentTime)
    compressor.knee.setValueAtTime(40, context.currentTime)
    compressor.ratio.setValueAtTime(12, context.currentTime)
    compressor.attack.setValueAtTime(0, context.currentTime)
    compressor.release.setValueAtTime(0.25, context.currentTime)

    oscillator.connect(compressor)
    compressor.connect(context.destination)
    oscillator.start(0)

    const buffer = await Promise.race([
      context.startRendering(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 350)),
    ])

    if (!buffer) return 'audio-timeout'
    const channelData = buffer.getChannelData(0)
    let sum = 0
    for (let i = 4000; i < 4500; i++) {
      sum += Math.abs(channelData[i] || 0)
    }
    return sum.toFixed(6)
  } catch {
    return 'audio-err'
  }
}

/**
 * Checks whether browser storage quota is artificially restricted (a common indicator of Incognito mode).
 */
async function detectIncognitoHint(): Promise<boolean> {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const { quota } = await navigator.storage.estimate()
      // Many mobile/desktop browsers cap storage quota under ~120MB in Incognito
      if (typeof quota === 'number' && quota > 0 && quota < 130 * 1024 * 1024) {
        return true
      }
    }
  } catch {
    // ignore
  }
  return false
}

/**
 * Collects anonymous hardware fingerprint hashes that persist across Normal and Incognito tabs.
 */
export async function computeDeviceSecurityPayload(): Promise<DeviceSecurityPayload> {
  const webglRaw = getWebGLSignature()
  const canvasRaw = getCanvasSignature()
  const [audioRaw, incognitoSuspected] = await Promise.all([
    getAudioSignature(),
    detectIncognitoHint(),
  ])

  const screenMax = Math.max(window.screen?.width || 0, window.screen?.height || 0)
  const screenMin = Math.min(window.screen?.width || 0, window.screen?.height || 0)
  const dpr = Number(window.devicePixelRatio || 1).toFixed(2)
  const colorDepth = window.screen?.colorDepth || 24
  const touchPoints = navigator.maxTouchPoints || 0
  const cores = navigator.hardwareConcurrency || 0
  const devMem = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 0
  const platform = navigator.platform || ''
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
  const timezoneOffset = new Date().getTimezoneOffset()

  const [webglHash, canvasHash, audioHash] = await Promise.all([
    sha256Hex(webglRaw),
    sha256Hex(canvasRaw),
    sha256Hex(audioRaw),
  ])

  // Hardware-stable composite string (excludes volatile browser session IDs so Incognito matches Normal Mode!)
  const compositeHardware = [
    webglHash,
    canvasHash,
    audioHash,
    `${screenMax}x${screenMin}@${dpr}:${colorDepth}`,
    `touch:${touchPoints}|cores:${cores}|mem:${devMem}|plat:${platform}`,
    `tz:${timezone}:${timezoneOffset}`,
  ].join('||')

  const deviceHash = await sha256Hex(compositeHardware)

  return {
    deviceHash,
    canvasHash,
    webglHash,
    audioHash,
    timezone,
    timezoneOffset,
    webrtcAnomaly: false,
    incognitoSuspected,
  }
}

/**
 * Solves a lightweight SHA-256 micro-puzzle (~5ms on mobile) to prevent automated bot scripts.
 */
export async function solveChallengePoW(
  challenge: string,
  teamId: string,
  deviceHash: string
): Promise<string> {
  const prefix = `${challenge}:${teamId}:${deviceHash}:`
  for (let nonce = 0; nonce < 50000; nonce++) {
    const hash = await sha256Hex(prefix + nonce)
    if (hash.startsWith('00')) {
      return String(nonce)
    }
  }
  return '0'
}

/**
 * Multi-layer local receipt persistence (LocalStorage + IndexedDB + CacheStorage + Cookie)
 */
export async function saveLocalVoteReceipt(receipt: LocalVoteReceipt): Promise<void> {
  const key = `${STORAGE_PREFIX}${receipt.teamId}`
  const serialized = JSON.stringify(receipt)

  // 1. LocalStorage & SessionStorage
  try {
    localStorage.setItem(key, serialized)
    sessionStorage.setItem(key, serialized)
  } catch {}

  // 2. First-party Cookie (1 year)
  try {
    document.cookie = `${key}=${encodeURIComponent(receipt.receiptCode)}; path=/; max-age=31536000; SameSite=Lax`
  } catch {}

  // 3. CacheStorage
  try {
    if ('caches' in window) {
      const cache = await caches.open(CACHE_NAME)
      await cache.put(
        new Request(`https://booth-receipt.local/${receipt.teamId}`),
        new Response(serialized, { headers: { 'Content-Type': 'application/json' } })
      )
    }
  } catch {}

  // 4. IndexedDB
  try {
    if ('indexedDB' in window) {
      await new Promise<void>((resolve) => {
        const req = indexedDB.open(IDB_NAME, 1)
        req.onupgradeneeded = () => {
          const db = req.result
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE, { keyPath: 'teamId' })
          }
        }
        req.onsuccess = () => {
          try {
            const db = req.result
            const tx = db.transaction(IDB_STORE, 'readwrite')
            tx.objectStore(IDB_STORE).put(receipt)
            tx.oncomplete = () => {
              db.close()
              resolve()
            }
            tx.onerror = () => resolve()
          } catch {
            resolve()
          }
        }
        req.onerror = () => resolve()
      })
    }
  } catch {}
}

export async function getLocalVoteReceipt(teamId: string): Promise<LocalVoteReceipt | null> {
  const key = `${STORAGE_PREFIX}${teamId}`

  // 1. Check LocalStorage / SessionStorage
  try {
    const raw = localStorage.getItem(key) || sessionStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw) as LocalVoteReceipt
      if (parsed?.receiptCode) return parsed
    }
  } catch {}

  // 2. Check Cookie
  try {
    const match = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${key}=`))
    if (match) {
      const code = decodeURIComponent(match.split('=')[1] || '')
      if (code) {
        return { teamId, receiptCode: code, votedAt: new Date().toISOString() }
      }
    }
  } catch {}

  // 3. Check CacheStorage
  try {
    if ('caches' in window) {
      const cache = await caches.open(CACHE_NAME)
      const res = await cache.match(`https://booth-receipt.local/${teamId}`)
      if (res) {
        const parsed = (await res.json()) as LocalVoteReceipt
        if (parsed?.receiptCode) return parsed
      }
    }
  } catch {}

  // 4. Check IndexedDB
  try {
    if ('indexedDB' in window) {
      const fromIdb = await new Promise<LocalVoteReceipt | null>((resolve) => {
        const req = indexedDB.open(IDB_NAME, 1)
        req.onupgradeneeded = () => {
          const db = req.result
          if (!db.objectStoreNames.contains(IDB_STORE)) {
            db.createObjectStore(IDB_STORE, { keyPath: 'teamId' })
          }
        }
        req.onsuccess = () => {
          try {
            const db = req.result
            const tx = db.transaction(IDB_STORE, 'readonly')
            const getReq = tx.objectStore(IDB_STORE).get(teamId)
            getReq.onsuccess = () => {
              db.close()
              resolve((getReq.result as LocalVoteReceipt) || null)
            }
            getReq.onerror = () => resolve(null)
          } catch {
            resolve(null)
          }
        }
        req.onerror = () => resolve(null)
      })
      if (fromIdb) return fromIdb
    }
  } catch {}

  return null
}
