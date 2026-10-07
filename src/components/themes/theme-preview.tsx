import type { CSSProperties } from "react";
import { PhotoFrame } from "@/components/story/photo-frame";
import { Cover } from "@/components/story/cover";
import { StoryPageRenderer } from "@/components/story/page-renderer";
import { themeCssVars, type ResolvedTheme } from "@/lib/themes/resolve";
import { PHOTO_LAYOUT_LABEL } from "@/lib/pages/registry";
import { PhotoLayout } from "@/generated/prisma/enums";
import { SAMPLE_COVER, samplePages } from "./sample";

const Label = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-2 mt-5 text-xs font-medium uppercase tracking-wider text-slate-400 first:mt-0">{children}</p>
);

/**
 * Renders the REAL story components with sample content, so the preview is exactly what readers
 * see. Pure presentation (no hooks): usable from server and client components.
 */
export function ThemePreview({ theme }: { theme: ResolvedTheme }) {
  const pages = samplePages(theme.defaultPhotoLayout);
  const style = themeCssVars(theme) as CSSProperties;
  const sampleMedia = pages[1].media;

  return (
    <div className="space-y-1" aria-label="Theme preview">
      {[
        ["Cover", <Cover key="c" headingLevel="h2" cover={SAMPLE_COVER} action={<span className="story-open">Open</span>} />],
        ["Text page", <StoryPageRenderer key="t" page={pages[0]} />],
        ["Memory page", <StoryPageRenderer key="m" page={pages[1]} />],
        ["Photo page", <StoryPageRenderer key="p" page={pages[2]} />],
        ["Letter page", <StoryPageRenderer key="l" page={pages[3]} />],
        ["Final page", <StoryPageRenderer key="f" page={pages[4]} />],
      ].map(([label, node]) => (
        <section key={label as string}>
          <Label>{label}</Label>
          <div className="story-root story-preview" style={style} data-texture={theme.texture}>
            <div className="story-stage"><div className="story-motion">{node}</div></div>
          </div>
        </section>
      ))}

      <section>
        <Label>Photo layouts</Label>
        <div className="story-root story-preview" style={style} data-texture={theme.texture}>
          <div className="story-stage">
            <div className="grid w-full grid-cols-2 gap-x-4 gap-y-8 py-4">
              {Object.values(PhotoLayout).map((l) => (
                <div key={l} className="flex flex-col items-center gap-3 overflow-hidden">
                  <div className="w-full max-w-[9rem] [--story-pad:0rem]">
                    <PhotoFrame layout={l} media={sampleMedia} alt="Sample photo" />
                  </div>
                  <p className="text-xs opacity-70">{PHOTO_LAYOUT_LABEL[l]}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <Label>Navigation</Label>
        <div className="story-root story-preview" style={style} data-texture={theme.texture}>
          <div aria-hidden="true" className="story-nav">
            <span className="story-nav-btn" style={{ opacity: 0.22 }}>&larr;</span>
            <div className="story-nav-center">
              <p className="story-count">3 / 12</p>
              <div className="story-progress"><span style={{ width: "25%" }} /></div>
            </div>
            <span className="story-nav-btn">&rarr;</span>
          </div>
        </div>
      </section>
    </div>
  );
}
