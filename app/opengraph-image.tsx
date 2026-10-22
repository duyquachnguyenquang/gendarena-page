import { ImageResponse } from 'next/og'

export const runtime = 'nodejs'

export const alt = 'GenD Arena 2026 — Đấu Trường Khởi Nghiệp Công Nghệ'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#050814',
          backgroundImage:
            'radial-gradient(circle at 20% 20%, rgba(17, 46, 129, 0.4) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(0, 240, 255, 0.15) 0%, transparent 50%)',
          fontFamily: 'sans-serif',
          color: 'white',
          padding: '60px',
          boxSizing: 'border-box',
          position: 'relative',
        }}
      >
        {/* Subtle border framing */}
        <div
          style={{
            position: 'absolute',
            inset: '24px',
            border: '1px solid rgba(0, 240, 255, 0.25)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            boxSizing: 'border-box',
            backgroundColor: 'rgba(7, 12, 30, 0.6)',
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(0, 240, 255, 0.1)',
              border: '1px solid rgba(0, 240, 255, 0.4)',
              padding: '8px 20px',
              borderRadius: '9999px',
              fontSize: '14px',
              fontWeight: 700,
              letterSpacing: '0.2em',
              color: '#00F0FF',
              textTransform: 'uppercase',
              marginBottom: '32px',
            }}
          >
            <span>GEN D ARENA • SEASON 2026</span>
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: '64px',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              lineHeight: 1.1,
              textAlign: 'center',
              marginBottom: '20px',
              textTransform: 'uppercase',
              color: '#FFFFFF',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <span>SÀN ĐẤU KHỞI NGHIỆP</span>
            <span
              style={{
                color: '#00F0FF',
                marginTop: '6px',
              }}
            >
              GenD Arena 2026
            </span>
          </div>

          {/* Tagline */}
          <div
            style={{
              fontSize: '22px',
              fontWeight: 700,
              letterSpacing: '0.25em',
              color: '#38BDF8',
              textTransform: 'uppercase',
              marginBottom: '28px',
            }}
          >
            DREAM. DESIGN. DEVELOP.
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '16px',
              color: '#94A3B8',
              textAlign: 'center',
              maxWidth: '750px',
              lineHeight: 1.5,
            }}
          >
            Đấu trường khởi nghiệp công nghệ dành cho sinh viên thế hệ số Việt Nam
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
