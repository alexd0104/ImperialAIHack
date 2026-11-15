"use client";

import { ChevronLeft, Home, Pause, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { SegmentedProgress } from "@/components/ui/segmented-progress";
import type { BundleMemory, BundleScene } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { MemoryAudio } from "@/lib/house/audio";
import { sceneStill } from "@/lib/house/scene-still";
import { memoryDuration, sceneIndexAt } from "@/lib/house/timeline";
import { cn } from "@/lib/utils";

// Figma v5 "Story · Memory playing" (20-624). Scenes cross-fade (0.6 s) in family order
// over the song and ambience; the family voice plays once with the music ducked.
// A clip that cannot play becomes the still photo with a slow zoom: never an error.

const TICK_MS = 100;
/** Quiet enough to sit under the song and the family voice. */
const CLIP_AMBIENCE_VOLUME = 0.35;

function SceneLayer({
  scene,
  fallbackUrl,
  active,
  paused,
  failed,
  clipSound,
  onVideoSound,
}: {
  scene: BundleScene;
  fallbackUrl: string;
  active: boolean;
  paused: boolean;
  failed: boolean;
  /** Generated clips carry their own ambience when the Memory has no separate track. */
  clipSound: boolean;
  onVideoSound: (on: boolean) => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [broken, setBroken] = useState(failed);
  const isMotion = scene.kind !== "photo" && !broken;

  useEffect(() => {
    const el = video.current;
    if (!el || !isMotion) return;
    if (active && !paused) {
      const quiet = scene.kind === "clip" && !clipSound;
      el.muted = quiet;
      if (scene.kind === "clip") el.volume = CLIP_AMBIENCE_VOLUME;
      // If the browser refuses sound, play silently rather than fall back to the still.
      el.play().catch(() => {
        el.muted = true;
        el.play().catch(() => setBroken(true));
      });
    } else {
      el.pause();
    }
  }, [active, paused, isMotion, scene.kind, clipSound]);

  // Real family videos keep their own sound, so the music steps aside.
  const sounding = active && scene.kind === "video" && !broken;
  useEffect(() => {
    onVideoSound(sounding);
  }, [sounding, onVideoSound]);

  const still = sceneStill(scene, fallbackUrl);
  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden bg-overlay transition-opacity duration-600 ease-memorai",
        active ? "opacity-100" : "opacity-0",
      )}
    >
      {isMotion ? (
        <video
          ref={video}
          src={scene.url}
          muted={scene.kind === "clip" && !clipSound}
          playsInline
          preload="auto"
          onError={() => setBroken(true)}
          className="size-full object-contain"
        />
      ) : (
        // biome-ignore lint/performance/noImgElement: preloaded by the House, not optimised by Next.
        <img
          src={still}
          alt=""
          draggable={false}
          data-testid="scene-still"
          className="size-full object-contain ease-linear"
          style={{
            // Slow zoom while active; reduced motion makes it an instant, unnoticeable step.
            scale: active ? "1.08" : "1",
            transitionProperty: "scale",
            transitionDuration: `${scene.durationMs + 1200}ms`,
          }}
        />
      )}
    </div>
  );
}

export function MemoryPlayer({
  memory,
  index,
  count,
  failedFiles,
  onStarted,
  onEnded,
  onBack,
  onReturn,
  preview = false,
}: {
  memory: BundleMemory;
  index: number;
  count: number;
  failedFiles: ReadonlySet<string>;
  onStarted: () => void;
  onEnded: () => void;
  onBack: () => void;
  onReturn: () => void;
  /** Studio preview: same mix as the House, but a close button instead of "home". */
  preview?: boolean;
}) {
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const audio = useRef<MemoryAudio | null>(null);
  const duration = memoryDuration(memory);
  const ended = useRef(false);

  // Callbacks change identity every render; the effects below only need the latest.
  const handlers = useRef({ onStarted, onEnded });
  handlers.current = { onStarted, onEnded };

  useEffect(() => {
    const a = new MemoryAudio(memory);
    audio.current = a;
    a.start();
    handlers.current.onStarted();
    return () => a.stop();
  }, [memory]);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => setElapsed((e) => e + TICK_MS), TICK_MS);
    return () => clearInterval(timer);
  }, [paused]);

  useEffect(() => {
    if (elapsed >= duration && !ended.current) {
      ended.current = true;
      handlers.current.onEnded();
    }
  }, [elapsed, duration]);

  const togglePause = () => {
    if (paused) audio.current?.resume();
    else audio.current?.pause();
    setPaused(!paused);
  };

  const setVideoSound = useRef((on: boolean) => audio.current?.setVideoSound(on)).current;
  const current = sceneIndexAt(memory, elapsed);

  return (
    <section data-testid="memory-player" className="relative size-full bg-overlay">
      {memory.scenes.map((scene, i) => (
        <SceneLayer
          // biome-ignore lint/suspicious/noArrayIndexKey: scenes are fixed for the Memory; a URL may repeat.
          key={i}
          scene={scene}
          fallbackUrl={memory.polaroidUrl}
          active={i === current}
          paused={paused}
          failed={failedFiles.has(scene.url)}
          clipSound={!memory.ambienceUrl}
          onVideoSound={setVideoSound}
        />
      ))}

      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-linear-to-b from-overlay/45 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-linear-to-t from-overlay/60 to-transparent" />

      <header className="absolute inset-x-0 top-0 flex items-center gap-6 p-8">
        <IconButton
          label={preview ? copy.house.closePreview : copy.house.returnToRoom}
          size={76}
          tone="glass"
          elevation="house"
          onClick={onReturn}
          data-testid="return-button"
        >
          {preview ? <X aria-hidden /> : <Home aria-hidden />}
        </IconButton>
        {count > 1 && <SegmentedProgress count={count} current={index} tone="media" />}
      </header>

      {memory.caption && (
        <p className="absolute bottom-12 left-page max-w-[560px] font-display text-32 leading-[1.25] text-surface italic">
          {memory.caption}
        </p>
      )}

      <div className="absolute right-page bottom-10 flex items-center gap-6">
        <IconButton
          label={copy.house.back}
          size={92}
          tone="glass"
          elevation="house"
          onClick={onBack}
        >
          <ChevronLeft aria-hidden />
        </IconButton>
        <IconButton
          label={paused ? copy.house.play : copy.house.pause}
          size={124}
          tone="primary"
          elevation="house"
          onClick={togglePause}
          data-testid="pause-button"
        >
          {paused ? (
            <Play aria-hidden className="fill-current" />
          ) : (
            <Pause aria-hidden className="fill-current" />
          )}
        </IconButton>
      </div>
    </section>
  );
}
