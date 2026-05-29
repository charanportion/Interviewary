import { ImageResponse } from 'next/og';

// iOS home-screen icon (180×180), rendered from code.
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1b1814',
          color: '#faf8f4',
          fontSize: 120,
          fontWeight: 700,
          fontFamily: 'serif',
          borderRadius: 40,
        }}
      >
        I
      </div>
    ),
    { ...size },
  );
}
