"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Music, Plus, Video, X } from "lucide-react";
import Link from "next/link";
import { type ChangeEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ASSET_LIMITS, type AssetView } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { StudioApiError } from "./api";
import { hasVisual, needsResize, visualKind } from "./memory-bank";
import {
  deleteAsset,
  fetchMemory,
  memoryKey,
  patchMemory,
  uploadMemoryAsset,
} from "./memory-client";
import { resizeObjectPhoto } from "./photo";
import { StudioQuery } from "./StudioQuery";

const words = copy.studio.bank;
const visualAccept = [...ASSET_LIMITS.photo.mimes, ...ASSET_LIMITS.video.mimes].join(",");
const audioAccept = ASSET_LIMITS.song.mimes.join(",");

export function MemoryBank({ memoryId }: { memoryId: string }) {
  return (
    <StudioQuery>
      <Bank memoryId={memoryId} />
    </StudioQuery>
  );
}

function Bank({ memoryId }: { memoryId: string }) {
  const client = useQueryClient();
  const memory = useQuery({ queryKey: memoryKey(memoryId), queryFn: () => fetchMemory(memoryId) });
  const [problem, setProblem] = useState<string>();
  const refresh = () => client.invalidateQueries({ queryKey: memoryKey(memoryId) });

  const upload = useMutation({
    mutationFn: async ({ file, kind }: { file: File; kind: AssetView["kind"] }) => {
      // Photos are made smaller on the device (2048 px JPEG) before they leave it.
      const body =
        kind === "photo" && needsResize(file.type) ? await resizeObjectPhoto(file) : file;
      const name = kind === "photo" && body !== file ? "photo.jpg" : file.name;
      const asset = await uploadMemoryAsset(memoryId, kind, body, name);
      // The song and the voice clip are single choices on the Memory sheet.
      if (kind === "song") await patchMemory(memoryId, { answers: { songAssetId: asset.id } });
      if (kind === "voice") await patchMemory(memoryId, { answers: { voiceAssetId: asset.id } });
      return asset;
    },
    onError: (error) =>
      setProblem(error instanceof StudioApiError ? error.message : words.uploadFailed),
    onSettled: refresh,
  });
  const remove = useMutation({ mutationFn: deleteAsset, onSettled: refresh });

  const pick = (kind?: AssetView["kind"]) => async (event: ChangeEvent<HTMLInputElement>) => {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    setProblem(undefined);
    for (const file of files) {
      const chosen = kind ?? visualKind(file.type);
      if (!chosen) {
        setProblem(copy.studio.memory.fileType);
        continue;
      }
      await upload.mutateAsync({ file, kind: chosen }).catch(() => undefined);
    }
  };

  if (memory.isError)
    return (
      <p role="alert" className="rounded-lg bg-warning-surface p-4 text-16">
        {memory.error instanceof StudioApiError ? memory.error.message : copy.studio.memory.error}
      </p>
    );
  const assets = memory.data?.assets ?? [];
  const visuals = assets.filter((asset) => asset.kind === "photo" || asset.kind === "video");
  const song = assets.find((asset) => asset.kind === "song");
  const voice = assets.find((asset) => asset.kind === "voice");
  const ready = hasVisual(assets) && !upload.isPending;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-14 font-bold text-ink/70">{words.eyebrow}</p>
        <h1 className="font-display text-32 sm:text-40">{memory.data?.title ?? words.title}</h1>
        <p className="mt-2 max-w-2xl text-18 text-ink/70">{words.intro}</p>
      </div>

      <Card className="space-y-4 p-5">
        <h2 className="font-display text-22">{words.photosHeading}</h2>
        <p className="text-16 text-ink/70">{words.photosHint}</p>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {visuals.map((asset, i) => (
            <li
              key={asset.id}
              // B18: each photo drops onto a messy pile, then straightens into the grid.
              className="relative aspect-square overflow-hidden rounded-xl bg-ink/5 shadow-polaroid animate-pile-in"
              style={{
                ["--pile-r" as string]: `${[7, -5, 4, -8, 6, -3][i % 6]}deg`,
                animationDelay: `${Math.min(i, 8) * 70}ms`,
              }}
            >
              {asset.kind === "photo" ? (
                // biome-ignore lint/performance/noImgElement: family uploads are served from /api/files, not optimised.
                <img src={asset.url} alt={words.photoAlt} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-16">
                  <Video aria-hidden className="size-8" />
                  {words.videoLabel}
                </div>
              )}
              <RemoveButton onClick={() => remove.mutate(asset.id)} />
            </li>
          ))}
          <li>
            <PickButton label={words.addPhotos} accept={visualAccept} multiple onChange={pick()} />
          </li>
        </ul>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <SoundCard
          heading={words.songHeading}
          hint={words.songHint}
          add={words.addSong}
          asset={song}
          onPick={pick("song")}
          onRemove={(id) => remove.mutate(id)}
        />
        <SoundCard
          heading={words.voiceHeading}
          hint={words.voiceHint}
          add={words.addVoice}
          asset={voice}
          onPick={pick("voice")}
          onRemove={(id) => remove.mutate(id)}
        />
      </div>

      {(problem || upload.isPending) && (
        <p role="status" className="rounded-lg bg-warning-surface p-4 text-16">
          {upload.isPending ? words.uploading : problem}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        {ready ? (
          <Button asChild>
            <Link href={`/studio/memories/${memoryId}/questions`}>{words.continue}</Link>
          </Button>
        ) : (
          <Button disabled>{words.continue}</Button>
        )}
        {!hasVisual(assets) && <p className="text-16 text-ink/70">{words.needOne}</p>}
      </div>
    </div>
  );
}

function PickButton(props: {
  label: string;
  accept: string;
  multiple?: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="flex aspect-square min-h-16 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink/20 p-3 text-center text-16 font-bold">
      <Plus aria-hidden className="size-6" />
      {props.label}
      <input
        type="file"
        className="sr-only"
        accept={props.accept}
        multiple={props.multiple}
        onChange={props.onChange}
      />
    </label>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={words.removeLabel}
      className="absolute right-2 top-2 flex size-12 items-center justify-center rounded-full bg-surface/90"
    >
      <X aria-hidden className="size-5" />
    </button>
  );
}

function SoundCard(props: {
  heading: string;
  hint: string;
  add: string;
  asset?: AssetView;
  onPick: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: (id: string) => void;
}) {
  const { asset } = props;
  return (
    <Card className="space-y-3 p-5">
      <h2 className="flex items-center gap-2 font-display text-22">
        <Music aria-hidden className="size-5" />
        {props.heading}
      </h2>
      <p className="text-16 text-ink/70">{props.hint}</p>
      {asset ? (
        <div className="flex items-center gap-3">
          {/* biome-ignore lint/a11y/useMediaCaption: family recordings have no caption track. */}
          <audio controls src={asset.url} className="w-full" />
          <Button variant="secondary" type="button" onClick={() => props.onRemove(asset.id)}>
            {words.remove}
          </Button>
        </div>
      ) : (
        <label className="inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full border border-ink/20 bg-surface px-5 text-16 font-bold">
          <Plus aria-hidden className="size-5" />
          {props.add}
          <input type="file" className="sr-only" accept={audioAccept} onChange={props.onPick} />
        </label>
      )}
    </Card>
  );
}
