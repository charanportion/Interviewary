import { ImageResponse } from 'next/og';
import { SITE_TAGLINE } from '@/lib/seo';

// Branded 1200×630 social-share card, rendered from code (no static asset needed).
export const alt = 'Interviewary — live transcription + AI follow-up questions for technical interviews on Google Meet';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Brand palette (mirrors globals.css design tokens).
const PAPER = '#faf8f4';
const INK = '#1b1814';
const ACCENT = '#1f4e79';
const MUTED = '#6b6258';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: PAPER,
          padding: '72px 80px',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Eyebrow */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', color: PAPER, fontSize: 30, fontWeight: 700 }}>
            I
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: INK, letterSpacing: -0.5 }}>
            Interviewary
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', width: 72, height: 6, background: ACCENT, borderRadius: 999 }} />
          <div style={{ fontSize: 64, fontWeight: 800, color: INK, lineHeight: 1.08, letterSpacing: -1.5, maxWidth: 980 }}>
            Run technical interviews you can&rsquo;t technically run.
          </div>
          <div style={{ fontSize: 30, color: MUTED, lineHeight: 1.35, maxWidth: 900 }}>
            {SITE_TAGLINE}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 24, color: MUTED }}>
          <span style={{ color: ACCENT, fontWeight: 700 }}>Chrome extension</span>
          <span>·</span>
          <span>Local-first</span>
          <span>·</span>
          <span>Bring your own key</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
