import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const contentType = 'image/png';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #16C25B, #0FA34B)',
          color: '#ffffff',
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 800 }}>Chust Online Bozor</div>
        <div style={{ marginTop: 18, fontSize: 32, opacity: 0.92 }}>
          Yangi mahsulotlar, tezkor yetkazib berish
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}

