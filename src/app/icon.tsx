import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { siteBrandAssetFiles } from '@/lib/site-branding';

export const size = {
  width: 512,
  height: 512,
};

export const contentType = 'image/png';

export default async function Icon() {
  try {
    const iconBuffer = await readFile(join(process.cwd(), siteBrandAssetFiles.favicon));
    return new Response(iconBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    // Fall back to the generated icon if the public asset is unavailable.
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#071321',
          borderRadius: 96,
        }}
      >
        <svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="gold" x1="64" y1="52" x2="420" y2="394" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFF2B3"/>
              <stop offset="0.38" stopColor="#E8C75A"/>
              <stop offset="1" stopColor="#B8871F"/>
            </linearGradient>
            <linearGradient id="navy" x1="74" y1="72" x2="319" y2="329" gradientUnits="userSpaceOnUse">
              <stop stopColor="#334D78"/>
              <stop offset="0.58" stopColor="#112543"/>
              <stop offset="1" stopColor="#081426"/>
            </linearGradient>
          </defs>
          <path d="M78 370C132 402 219 420 303 410C365 402 414 382 450 350" stroke="url(#gold)" strokeWidth="18" strokeLinecap="round"/>
          <path d="M84 357C152 386 237 396 315 387C367 381 409 367 441 343" stroke="#9CA8BC" strokeOpacity="0.55" strokeWidth="10" strokeLinecap="round"/>
          <g transform="translate(74 92)">
            <rect x="0" y="88" width="148" height="102" rx="10" fill="url(#navy)" stroke="url(#gold)" strokeWidth="8"/>
            <rect x="8" y="74" width="12" height="30" rx="3" fill="#F7F7F3"/>
            <rect x="130" y="74" width="12" height="30" rx="3" fill="#F7F7F3"/>
            <rect x="0" y="74" width="148" height="14" rx="5" fill="url(#gold)"/>
            <rect x="18" y="94" width="8" height="90" fill="url(#gold)" fillOpacity="0.92"/>
            <rect x="44" y="94" width="8" height="90" fill="url(#gold)" fillOpacity="0.92"/>
            <rect x="70" y="94" width="8" height="90" fill="url(#gold)" fillOpacity="0.92"/>
            <rect x="96" y="94" width="8" height="90" fill="url(#gold)" fillOpacity="0.92"/>
            <path d="M124 80L170 80L194 118L130 118L124 80Z" fill="#1A2F51"/>
            <path d="M142 114H242L278 144L304 182L254 188H125L112 160L121 132L142 114Z" fill="#F6F7F9" stroke="url(#navy)" strokeWidth="7" strokeLinejoin="round"/>
            <path d="M152 120L233 120L255 140H168L152 120Z" fill="#DCE5EF"/>
            <path d="M134 167H186L180 185H135L128 177L134 167Z" fill="url(#gold)"/>
            <path d="M215 128H260L286 142L266 148H208L215 128Z" fill="#0C1B31"/>
            <path d="M210 146H273L263 164H202L188 155L210 146Z" fill="#0C1B31"/>
            <circle cx="147" cy="189" r="22" fill="#0C1B31" stroke="url(#gold)" strokeWidth="7"/>
            <circle cx="147" cy="189" r="9" fill="#F2F4F7"/>
            <circle cx="252" cy="187" r="16" fill="#0C1B31" stroke="url(#gold)" strokeWidth="6"/>
          </g>
          <g transform="translate(292 76)">
            <path d="M0 74L116 16L162 28L42 92L0 74Z" fill="url(#gold)"/>
            <path d="M65 34L130 0L141 17L76 49L65 34Z" fill="#F7F2D1"/>
            <path d="M63 49L112 126L97 131L42 65L63 49Z" fill="url(#gold)"/>
            <path d="M84 40L99 79L86 85L70 45L84 40Z" fill="#A77B1D"/>
            <path d="M35 98C84 122 120 152 140 190" stroke="url(#gold)" strokeWidth="12" strokeLinecap="round"/>
            <path d="M72 109C103 129 126 151 140 176" stroke="#F6E29B" strokeWidth="7" strokeLinecap="round"/>
          </g>
        </svg>
      </div>
    ),
    size
  );
}
