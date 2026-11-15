import { Play } from "lucide-react";
import type * as React from "react";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

// Figma v5 "Polaroid": 200×250 (House) or 150×188 (Studio cards), 6 px radius,
// Caveat caption. `children` replaces the photo, e.g. with a <video>.
const sizes = {
  md: { frame: "w-50 h-62.5 px-3 pt-3 pb-2.5 gap-2", caption: "text-22", badge: "size-12" },
  sm: { frame: "w-37.5 h-47 px-2.25 pt-2.25 pb-2 gap-1.5", caption: "text-17", badge: "size-9" },
} as const;

export type PolaroidProps = Omit<React.ComponentProps<"figure">, "children"> & {
  src?: string;
  alt?: string;
  caption?: string;
  size?: keyof typeof sizes;
  /** Shows the play badge used for Memories that hold a real video or an animated clip. */
  video?: boolean;
  /** Degrees; polaroids fanned around an Object are slightly tilted. */
  tilt?: number;
  children?: React.ReactNode;
};

export function Polaroid({
  src,
  alt = "",
  caption,
  size = "md",
  video = false,
  tilt = 0,
  className,
  style,
  children,
  ...props
}: PolaroidProps) {
  const s = sizes[size];
  return (
    <figure
      className={cn(
        "flex shrink-0 flex-col rounded-sm bg-surface shadow-polaroid",
        s.frame,
        className,
      )}
      style={tilt ? { rotate: `${tilt}deg`, ...style } : style}
      {...props}
    >
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-[2px] bg-surface-muted">
        {children ??
          (src && (
            // Plain <img>: photos come from /api/files and the House preloads them itself.
            // biome-ignore lint/performance/noImgElement: see above.
            <img src={src} alt={alt} className="size-full object-cover" draggable={false} />
          ))}
        {video && (
          <span
            role="img"
            aria-label={copy.ui.videoBadge}
            className={cn(
              "absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-surface/92 text-primary",
              s.badge,
            )}
          >
            <Play className="size-1/2 translate-x-[8%] fill-current" aria-hidden />
          </span>
        )}
      </div>
      {caption && (
        <figcaption
          className={cn("truncate text-center font-hand leading-none text-ink/85", s.caption)}
        >
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
