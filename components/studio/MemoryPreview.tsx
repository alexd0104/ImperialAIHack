"use client";

import { useMemo, useState } from "react";
import { MemoryPlayer } from "@/components/house/memory-player";
import { Button } from "@/components/ui/button";
import type { AssetView, SceneView } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { buildPreviewMemory } from "@/lib/studio/preview-memory";

const NO_FAILED: ReadonlySet<string> = new Set();

/** "Play full memory": the House player in preview mode, full screen, started by this click. */
export function MemoryPreview({
  memory,
}: {
  memory: { id: string; title: string; scenes: SceneView[]; assets: AssetView[] };
}) {
  const [open, setOpen] = useState(false);
  const bundle = useMemo(() => (open ? buildPreviewMemory(memory) : null), [open, memory]);
  const playable = useMemo(() => buildPreviewMemory(memory) !== null, [memory]);
  const close = () => setOpen(false);
  return (
    <>
      <Button type="button" variant="secondary" disabled={!playable} onClick={() => setOpen(true)}>
        {copy.studio.approve.playFull}
      </Button>
      {bundle && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 bg-overlay">
          <MemoryPlayer
            memory={bundle}
            index={0}
            count={1}
            failedFiles={NO_FAILED}
            onStarted={() => {}}
            onEnded={close}
            onBack={close}
            onReturn={close}
            preview
          />
        </div>
      )}
    </>
  );
}
