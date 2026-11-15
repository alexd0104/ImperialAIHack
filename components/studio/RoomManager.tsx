"use client";

import { QueryClient, QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { MovingDots } from "@/components/ui/moving-dots";
import { ShimmerBar } from "@/components/ui/shimmer-bar";
import {
  AssetView,
  DeletedResponse,
  HouseDetail,
  Room,
  type RoomBackgroundInput,
  RoomStyle,
} from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { requestStudio } from "./api";
import { FilePicker } from "./FilePicker";
import { PHOTO_ACCEPT, resizeObjectPhoto } from "./photo";
import { RoomDoors } from "./RoomDoors";
import { roomStyles } from "./room-styles";
import { useStudioHouseId } from "./studio-house";

const words = copy.studio.rooms;
const json = { "Content-Type": "application/json" };

export function RoomManager({ houseId }: { houseId?: string }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <Rooms initialHouseId={houseId} />
    </QueryClientProvider>
  );
}

/**
 * Room carousel on the Studio home: one door per Room (opens /studio/rooms/:id to edit the Room
 * and move its Objects) and a "+" doorway (/studio/rooms/new). AddRoom and RoomRow are reused there.
 */
function Rooms({ initialHouseId }: { initialHouseId?: string }) {
  const { houseId } = useStudioHouseId(initialHouseId);
  const house = useQuery({
    queryKey: ["house", houseId],
    enabled: Boolean(houseId),
    queryFn: () => requestStudio(`/api/houses/${houseId}`, HouseDetail),
  });
  if (!houseId) return null;
  const rooms = house.data?.rooms ?? [];
  return (
    <section className="mt-8 space-y-4">
      <div>
        <CardTitle>{words.title}</CardTitle>
        <p className="text-16 text-ink/70">{words.pickerIntro}</p>
      </div>
      <RoomDoors rooms={rooms} houseId={houseId} />
    </section>
  );
}

/** B17 pipeline route: generates in the request (~10–20 s live); a failure returns a standard Room. */
function generateRoom(
  houseId: string,
  body: { name?: string; description: string; roomId?: string },
) {
  return requestStudio(`/api/houses/${houseId}/rooms/generate`, Room, {
    method: "POST",
    headers: { ...json, "Idempotency-Key": crypto.randomUUID() },
    body: JSON.stringify(body),
  });
}
const DESCRIPTION_MIN = 3;
/** Text-to-image takes ~20 s: the bar creeps towards 90 % over that, then waits. */
const DESCRIBE_EXPECTED_MS = 20_000;

/**
 * Shown while a Room or its background is being made, in place of the form, so the family
 * sees something is happening (the description path takes ~20 s).
 */
function RoomMaking({ kind }: { kind: Background["kind"] }) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (kind !== "description") return;
    const t0 = Date.now();
    const timer = setInterval(
      () => setProgress(Math.min(0.9, ((Date.now() - t0) / DESCRIBE_EXPECTED_MS) * 0.9)),
      250,
    );
    return () => clearInterval(timer);
  }, [kind]);
  const hint =
    kind === "description"
      ? words.makingDescribe
      : kind === "photo"
        ? words.makingPhoto
        : words.makingStyle;
  return (
    <div role="status" aria-live="polite" className="space-y-4">
      <div className="relative aspect-[1194/834] w-full overflow-hidden rounded-xl bg-surface-muted">
        <div
          aria-hidden
          className="absolute inset-0 animate-pulse bg-surface/40 motion-reduce:hidden"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <MovingDots />
        </div>
      </div>
      <div className="space-y-2">
        <p className="font-display text-22">{words.makingTitle}</p>
        <p className="text-16 text-ink/70">{hint}</p>
        <ShimmerBar value={kind === "description" ? progress : undefined} />
      </div>
    </div>
  );
}

/** Shrunk and turned into a JPEG on the device first: the route accepts JPEG only. */
async function uploadPhoto(houseId: string, file: File) {
  const body = new FormData();
  body.set("file", await resizeObjectPhoto(file), "room.jpg");
  return requestStudio(`/api/houses/${houseId}/assets`, AssetView, { method: "POST", body });
}

function StylePicker({ onPick, disabled }: { onPick: (s: RoomStyle) => void; disabled: boolean }) {
  return (
    <fieldset className="flex flex-wrap gap-2">
      <legend className="sr-only">{words.styleLabel}</legend>
      {RoomStyle.options.map((style) => (
        <Button
          key={style}
          size="sm"
          variant="secondary"
          disabled={disabled}
          onClick={() => onPick(style)}
        >
          {roomStyles[style].name}
        </Button>
      ))}
    </fieldset>
  );
}

export function RoomRow({
  room,
  onChanged,
  onDeleted,
}: {
  room: Room;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(room.name);
  const [confirming, setConfirming] = useState(false);
  const patch = useMutation({
    mutationFn: async (body: { name?: string; background?: RoomBackgroundInput }) =>
      requestStudio(`/api/rooms/${room.id}`, Room, {
        method: "PATCH",
        headers: json,
        body: JSON.stringify(body),
      }),
    onSuccess: onChanged,
  });
  const [chosen, setChosen] = useState<File | null>(null);
  const photo = useMutation({
    mutationFn: async (file: File) => {
      const asset = await uploadPhoto(room.houseId, file);
      return requestStudio(`/api/rooms/${room.id}`, Room, {
        method: "PATCH",
        headers: json,
        body: JSON.stringify({ background: { kind: "photo", assetId: asset.id } }),
      });
    },
    onSuccess: () => {
      setChosen(null);
      onChanged();
    },
  });
  const [description, setDescription] = useState("");
  const describe = useMutation({
    mutationFn: () =>
      generateRoom(room.houseId, { roomId: room.id, description: description.trim() }),
    onSuccess: () => {
      setDescription("");
      onChanged();
    },
  });
  const remove = useMutation({
    mutationFn: () => requestStudio(`/api/rooms/${room.id}`, DeletedResponse, { method: "DELETE" }),
    onSuccess: onDeleted,
  });
  const busy = patch.isPending || photo.isPending || describe.isPending || remove.isPending;
  const thumb = room.backgroundPath.startsWith("/")
    ? room.backgroundPath
    : `/api/files/${room.backgroundPath}`;
  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-end gap-3">
        {/* B18: a new background appears as a pencil sketch, then gets coloured in. */}
        {/* biome-ignore lint/performance/noImgElement: Room picture from /rooms or /api/files. */}
        <img
          key={thumb}
          src={thumb}
          alt=""
          className="aspect-[1194/834] w-28 rounded-lg object-cover animate-sketch-in"
        />
        <div className="space-y-1">
          <Label htmlFor={`room-${room.id}`}>{words.nameLabel}</Label>
          <Input
            id={`room-${room.id}`}
            value={name}
            maxLength={60}
            onChange={(event) => setName(event.target.value)}
          />
        </div>
        <Button
          size="sm"
          disabled={busy || !name.trim() || name.trim() === room.name}
          onClick={() => patch.mutate({ name: name.trim() })}
        >
          {words.rename}
        </Button>
      </div>
      <StylePicker
        disabled={busy}
        onPick={(style) => patch.mutate({ background: { kind: "style", style } })}
      />
      <div className="space-y-1">
        <Label htmlFor={`photo-${room.id}`}>{words.photoLabel}</Label>
        <FilePicker
          id={`photo-${room.id}`}
          accept={PHOTO_ACCEPT}
          file={chosen}
          disabled={busy}
          onChange={setChosen}
        />
        {chosen && (
          <Button size="sm" disabled={busy} onClick={() => photo.mutate(chosen)}>
            {copy.studio.filePicker.use}
          </Button>
        )}
        <p className="text-14 text-ink/70">{words.photoHint}</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor={`describe-${room.id}`}>{words.describeLabel}</Label>
        <Textarea
          id={`describe-${room.id}`}
          value={description}
          maxLength={300}
          placeholder={words.describePlaceholder}
          disabled={busy}
          onChange={(event) => setDescription(event.target.value)}
        />
        <Button
          size="sm"
          variant="secondary"
          disabled={busy || description.trim().length < DESCRIPTION_MIN}
          onClick={() => describe.mutate()}
        >
          {words.describeSubmit}
        </Button>
      </div>
      {(photo.isPending || describe.isPending) && (
        <RoomMaking kind={describe.isPending ? "description" : "photo"} />
      )}
      {(patch.isError || photo.isError || describe.isError || remove.isError) && (
        <p role="alert" className="rounded-lg bg-warning-surface p-3 text-16">
          {words.error}
        </p>
      )}
      {confirming ? (
        <div className="space-y-2" role="alertdialog" aria-label={words.delete}>
          <p className="text-16">{words.deleteConfirm}</p>
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => remove.mutate()}>
              {words.deleteYes}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>
              {words.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => setConfirming(true)}>
          {words.delete}
        </Button>
      )}
    </Card>
  );
}

type Background =
  | { kind: "photo"; file: File }
  | { kind: "style"; style: RoomStyle }
  | { kind: "description"; text: string };

export function AddRoom({ houseId, onCreated }: { houseId: string; onCreated: () => void }) {
  const [name, setName] = useState("");
  // A photo or a familiar Room wins; otherwise a description long enough is used.
  const [picked, setBackground] = useState<Background | null>(null);
  const [description, setDescription] = useState("");
  const [tried, setTried] = useState(false);
  const create = useMutation({
    mutationFn: async (input: { name: string; background: Background }) => {
      if (input.background.kind === "description")
        return generateRoom(houseId, { name: input.name, description: input.background.text });
      const body =
        input.background.kind === "photo"
          ? {
              name: input.name,
              source: "photo",
              assetId: (await uploadPhoto(houseId, input.background.file)).id,
            }
          : { name: input.name, source: "style", style: input.background.style };
      return requestStudio(`/api/houses/${houseId}/rooms`, Room, {
        method: "POST",
        headers: { ...json, "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify(body),
      });
    },
    onSuccess: onCreated,
  });
  const trimmed = name.trim();
  const text = description.trim();
  const background: Background | null =
    picked ?? (text.length >= DESCRIPTION_MIN ? { kind: "description", text } : null);
  const missing = !trimmed ? words.needName : !background ? words.needBackground : null;
  const busy = create.isPending;
  if (busy && create.variables)
    return (
      <Card className="p-5">
        <RoomMaking kind={create.variables.background.kind} />
      </Card>
    );
  return (
    <Card className="space-y-4 p-5">
      <p className="text-18 font-bold">{words.addTitle}</p>
      <div className="space-y-1">
        <Label htmlFor="new-room-name">{words.newNameLabel}</Label>
        <Input
          id="new-room-name"
          value={name}
          maxLength={60}
          placeholder={words.newNamePlaceholder}
          disabled={busy}
          onChange={(event) => setName(event.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="new-room-photo">{words.newPhotoLabel}</Label>
        <FilePicker
          id="new-room-photo"
          accept={PHOTO_ACCEPT}
          file={picked?.kind === "photo" ? picked.file : null}
          disabled={busy}
          onChange={(file) => setBackground(file ? { kind: "photo", file } : null)}
        />
        <p className="text-14 text-ink/70">{words.newPhotoHint}</p>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-16 font-bold">{words.newStyleLabel}</legend>
        <div className="flex flex-wrap gap-2">
          {RoomStyle.options.map((style) => {
            const chosen = picked?.kind === "style" && picked.style === style;
            return (
              <Button
                key={style}
                size="sm"
                variant={chosen ? "primary" : "secondary"}
                aria-pressed={chosen}
                disabled={busy || picked?.kind === "photo"}
                onClick={() => setBackground(chosen ? null : { kind: "style", style })}
              >
                {roomStyles[style].name}
              </Button>
            );
          })}
        </div>
      </fieldset>
      <div className="space-y-1">
        <Label htmlFor="new-room-description">{words.describeLabel}</Label>
        <Textarea
          id="new-room-description"
          value={description}
          maxLength={300}
          placeholder={words.describePlaceholder}
          disabled={busy || picked !== null}
          onChange={(event) => setDescription(event.target.value)}
        />
        <p className="text-14 text-ink/70">{words.describeHint}</p>
      </div>
      {tried && missing && (
        <p role="alert" className="text-16">
          {missing}
        </p>
      )}
      {create.isError && (
        <p role="alert" className="rounded-lg bg-warning-surface p-3 text-16">
          {words.error}
        </p>
      )}
      <Button
        disabled={busy}
        onClick={() => {
          setTried(true);
          if (background && trimmed) create.mutate({ name: trimmed, background });
        }}
      >
        {busy ? (
          <>
            <MovingDots /> {words.creating}
          </>
        ) : (
          words.create
        )}
      </Button>
    </Card>
  );
}
