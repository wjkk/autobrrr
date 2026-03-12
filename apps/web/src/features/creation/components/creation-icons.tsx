'use client';

import type { SVGProps } from 'react';

export type CreationIconName =
  | 'brand'
  | 'back'
  | 'crop'
  | 'frames'
  | 'lipsync'
  | 'voice'
  | 'music'
  | 'canvas'
  | 'download'
  | 'replace'
  | 'retry'
  | 'model'
  | 'chevron'
  | 'magic'
  | 'image'
  | 'video'
  | 'close'
  | 'edit'
  | 'copy'
  | 'play';

interface CreationIconProps extends SVGProps<SVGSVGElement> {
  name: CreationIconName;
}

export function CreationIcon({ name, ...props }: CreationIconProps) {
  const viewBox = name === 'brand' ? '0 0 32 32' : '0 0 16 16';

  return (
    <svg viewBox={viewBox} fill="none" aria-hidden="true" {...props}>
      {name === 'brand' ? (
        <>
          <path
            d="m19.78 17.112-4.239 1.887-1.006.448-5.028 2.239a.27.27 0 0 0-.159.209l-.003.04v5.792c0 .197.203.33.384.25l10.273-4.575.035-.018a.27.27 0 0 0 .127-.23V17.36a.273.273 0 0 0-.384-.25"
            fill="currentColor"
          />
          <path
            d="m14.536 18.552 4.912-2.187a1.09 1.09 0 0 1 1.534.996v4.06l1.29.575c.18.08.383-.052.383-.25v-5.791a.27.27 0 0 0-.162-.25l-5.067-2.256-1.006-.447-4.62-2.058-.819-.364-1.252-.557a.273.273 0 0 0-.384.248v5.793c0 .108.064.205.162.249zm-3.555-3.913.003.074zM17.426 12.554 11.8 10.049V8.847l.002-.04a.27.27 0 0 1 .16-.21l10.273-4.573c.18-.08.383.052.383.249v5.792c0 .094-.048.181-.126.23l-.036.02z"
            fill="currentColor"
            fillRule="evenodd"
            clipRule="evenodd"
          />
        </>
      ) : null}
      {name === 'back' ? <path d="M6.6 3.2 2.8 8l3.8 4.8M3.3 8H13.2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'crop' ? <path d="M3 2.5v8a2.5 2.5 0 0 0 2.5 2.5h8M5.5 3H13v7.5M3 6.5h7M6.5 3v7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'frames' ? <path d="M2.5 4.25h11M2.5 8h11M2.5 11.75h7M4.25 2.5v11M11.75 2.5v8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'lipsync' ? <path d="M3.1 7.2c1.45-1.65 3.08-2.48 4.9-2.48 1.82 0 3.45.83 4.9 2.48-1.45 1.02-3.08 1.53-4.9 1.53-1.82 0-3.45-.51-4.9-1.53Zm2.05 1.05c.84.72 1.79 1.08 2.85 1.08 1.06 0 2.01-.36 2.85-1.08" stroke="currentColor" strokeWidth="1.08" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'voice' ? <path d="M3.1 9.1h2.3l2.6 2.2V4.7L5.4 6.9H3.1v2.2Zm7.2-1.15a2.3 2.3 0 0 0 0-3.9m1.55 5.45a4.5 4.5 0 0 0 0-7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'music' ? <path d="M9.7 2.7v7.15a1.95 1.95 0 1 1-1.2-1.8V4.2l4.3-.9v5.4a1.95 1.95 0 1 1-1.2-1.8V2.95L9.7 3.4" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'canvas' ? <path d="M4.15 2.75v2.05M11.85 2.75v2.05M4.15 11.2v2.05M11.85 11.2v2.05M2.75 4.15h2.05M11.2 4.15h2.05M2.75 11.85h2.05M11.2 11.85h2.05M4.95 4.95h6.1v6.1h-6.1z" stroke="currentColor" strokeWidth="1.08" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'download' ? <path d="M8 2.5v7m0 0 2.6-2.45M8 9.5 5.4 7.05M3 12.25h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'replace' ? <path d="M5 4.2h5.75L9.9 2.85M11 11.8H5.25l.85 1.35M11.25 4.75A3.9 3.9 0 0 1 12.1 7 4.1 4.1 0 0 1 8 11.1M4.75 11.25A3.9 3.9 0 0 1 3.9 9 4.1 4.1 0 0 1 8 4.9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'retry' ? <path d="M4.2 5.1A4.3 4.3 0 1 1 3.8 10.8M4.2 5.1V2.75M4.2 5.1h2.35" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'model' ? <path d="M8 2.1 12.6 4.7v6.6L8 13.9l-4.6-2.6V4.7L8 2.1Zm0 0v11.8M3.4 4.7 8 7.3l4.6-2.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'chevron' ? <path d="m4.5 6 3.5 3.75L11.5 6" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'magic' ? <path d="m8 2.3.85 2.35L11.2 5.5l-2.35.85L8 8.7l-.85-2.35L4.8 5.5l2.35-.85L8 2.3Zm4.25 7.15.5 1.35 1.35.5-1.35.5-.5 1.35-.5-1.35-1.35-.5 1.35-.5.5-1.35ZM3.7 9.3l.65 1.7 1.7.65-1.7.65-.65 1.7-.65-1.7-1.7-.65 1.7-.65.65-1.7Z" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'image' ? <path d="M2.75 3.25h10.5v9.5H2.75zM5.1 9.4l1.7-1.8 1.55 1.35 2.2-2.55 1.2 1.4M5.3 5.6h.02" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'video' ? <path d="M3 4.1h6.55c.52 0 .95.42.95.95v5.9c0 .53-.43.95-.95.95H3.95A.95.95 0 0 1 3 10.95V4.1Zm7.5 2.15 2.5-1.55v6.6l-2.5-1.55" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'close' ? <path d="m4 4 8 8M12 4 4 12" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'edit' ? <path d="M10.9 3.2a1.15 1.15 0 0 1 1.62 0l.3.3a1.15 1.15 0 0 1 0 1.62l-5.95 5.95-2.2.26.26-2.2 5.97-5.93Z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'copy' ? <path d="M5.45 4.1h5.05a1.1 1.1 0 0 1 1.1 1.1v5.15a1.1 1.1 0 0 1-1.1 1.1H5.45a1.1 1.1 0 0 1-1.1-1.1V5.2a1.1 1.1 0 0 1 1.1-1.1Zm-1.8 7.35V6.55a1.6 1.6 0 0 1 1.6-1.6" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" /> : null}
      {name === 'play' ? <path d="m6.2 4.6 5 3.4-5 3.4V4.6Z" fill="currentColor" /> : null}
    </svg>
  );
}
