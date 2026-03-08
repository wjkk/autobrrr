'use client';

import type { SVGProps } from 'react';

export type CreationIconName =
  | 'crop'
  | 'frames'
  | 'lipsync'
  | 'canvas'
  | 'download'
  | 'replace'
  | 'retry'
  | 'model'
  | 'chevron'
  | 'magic'
  | 'image'
  | 'video'
  | 'close';

interface CreationIconProps extends SVGProps<SVGSVGElement> {
  name: CreationIconName;
}

export function CreationIcon({ name, ...props }: CreationIconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      {name === 'crop' ? <path d="M3 2.5v8a2.5 2.5 0 0 0 2.5 2.5h8M5.5 3H13v7.5M3 6.5h7M6.5 3v7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'frames' ? <path d="M2.5 4.25h11M2.5 8h11M2.5 11.75h7M4.25 2.5v11M11.75 2.5v8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'lipsync' ? <path d="M4.5 6.25c.7 1.2 1.85 1.8 3.45 1.8 1.6 0 2.75-.6 3.45-1.8M5.1 10.1c.65.9 1.6 1.35 2.85 1.35 1.25 0 2.2-.45 2.85-1.35M3.25 4.5c.9-1.35 2.45-2.02 4.65-2.02s3.75.67 4.65 2.02" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'canvas' ? <path d="M3 3.5h10v9H3zM5.25 1.75v3.5M10.75 1.75v3.5M5.25 10.75v3.5M10.75 10.75v3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'download' ? <path d="M8 2.5v7m0 0 2.6-2.45M8 9.5 5.4 7.05M3 12.25h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'replace' ? <path d="M5 4.2h5.75L9.9 2.85M11 11.8H5.25l.85 1.35M11.25 4.75A3.9 3.9 0 0 1 12.1 7 4.1 4.1 0 0 1 8 11.1M4.75 11.25A3.9 3.9 0 0 1 3.9 9 4.1 4.1 0 0 1 8 4.9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'retry' ? <path d="M4.2 5.1A4.3 4.3 0 1 1 3.8 10.8M4.2 5.1V2.75M4.2 5.1h2.35" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'model' ? <path d="M8 2.1 12.6 4.7v6.6L8 13.9l-4.6-2.6V4.7L8 2.1Zm0 0v11.8M3.4 4.7 8 7.3l4.6-2.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'chevron' ? <path d="m4.5 6 3.5 3.75L11.5 6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'magic' ? <path d="m8 2.3.85 2.35L11.2 5.5l-2.35.85L8 8.7l-.85-2.35L4.8 5.5l2.35-.85L8 2.3Zm4.25 7.15.5 1.35 1.35.5-1.35.5-.5 1.35-.5-1.35-1.35-.5 1.35-.5.5-1.35ZM3.7 9.3l.65 1.7 1.7.65-1.7.65-.65 1.7-.65-1.7-1.7-.65 1.7-.65.65-1.7Z" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'image' ? <path d="M2.75 3.25h10.5v9.5H2.75zM5.1 9.4l1.7-1.8 1.55 1.35 2.2-2.55 1.2 1.4M5.3 5.6h.02" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'video' ? <path d="M3 4.1h6.55c.52 0 .95.42.95.95v5.9c0 .53-.43.95-.95.95H3.95A.95.95 0 0 1 3 10.95V4.1Zm7.5 2.15 2.5-1.55v6.6l-2.5-1.55" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'close' ? <path d="m4 4 8 8M12 4 4 12" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" /> : null}
    </svg>
  );
}
