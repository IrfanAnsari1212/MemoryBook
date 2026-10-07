import Image from "next/image";
import type { CSSProperties } from "react";
import type { PhotoLayout } from "@/generated/prisma/enums";
import type { StoryMedia } from "@/lib/story/types";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Real aspect ratio from the stored dimensions (fallback 4:3), so space is reserved up front: no layout shift. */
const ratioOf = (m: StoryMedia) => (m.width && m.height && m.width > 0 && m.height > 0 ? m.width / m.height : 4 / 3);

/** `--r` is a number computed from stored dimensions; CSS uses it for aspect-ratio and viewport-fit sizing. */
const withRatio = (r: number) => ({ "--r": String(Math.round(r * 1000) / 1000) }) as CSSProperties;

function Img({ media, alt, priority, sizes }: { media: StoryMedia; alt: string; priority: boolean; sizes: string }) {
  return <Image src={media.url} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" />;
}

type Props = { layout: PhotoLayout; media: StoryMedia | null; alt: string; priority?: boolean };

/**
 * Interprets the stored PhotoLayout. The photo is always the emotional focus: frames are quiet
 * (paper, soft shadow, thin ring) and add no decoration beyond the frame itself. Portrait and
 * landscape photos both fit within the viewport (see the .story-* sizing rules).
 */
export function PhotoFrame({ layout, media, alt, priority = false }: Props) {
  if (!media) return null; // graceful text-only fallback
  const ratio = ratioOf(media);

  switch (layout) {
    case "POLAROID":
      return (
        <div data-layout="POLAROID" className="story-polaroid" style={withRatio(clamp(ratio, 0.8, 1.25))}>
          <div className="story-polaroid-img">
            <Img media={media} alt={alt} priority={priority} sizes="(max-width: 640px) 80vw, 340px" />
          </div>
        </div>
      );
    case "CIRCLE":
      return (
        <div data-layout="CIRCLE" className="story-circle">
          <div className="story-circle-img">
            <Img media={media} alt={alt} priority={priority} sizes="(max-width: 640px) 66vw, 250px" />
          </div>
        </div>
      );
    case "FULLSCREEN":
      return (
        <div data-layout="FULLSCREEN" className="story-full" style={withRatio(clamp(ratio, 0.6, 2))}>
          <Img media={media} alt={alt} priority={priority} sizes="(max-width: 768px) 100vw, 640px" />
        </div>
      );
    case "STACKED":
      return (
        <div data-layout="STACKED" className="story-stack" style={withRatio(clamp(ratio, 0.75, 1.33))}>
          <span aria-hidden="true" className="story-stack-sheet story-stack-sheet-a" />
          <span aria-hidden="true" className="story-stack-sheet story-stack-sheet-b" />
          <div className="story-stack-top">
            <div className="story-stack-img">
              <Img media={media} alt={alt} priority={priority} sizes="(max-width: 640px) 72vw, 300px" />
            </div>
          </div>
        </div>
      );
    case "FLOATING_BUBBLE":
    default:
      return (
        <div data-layout="FLOATING_BUBBLE" className="story-bubble">
          <div className="story-bubble-img">
            <Img media={media} alt={alt} priority={priority} sizes="(max-width: 640px) 72vw, 280px" />
          </div>
        </div>
      );
  }
}
