"use client";

import { QueryClient, QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { MovingDots } from "@/components/ui/moving-dots";
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

function Rooms({ initialHouseId }: { initialHouseId?: string }) {
  const { houseId } = useStudioHouseId(initialHouseId);
  const house = useQuery({
    queryKey: ["house", houseId],
    enabled: Boolean(houseId),
    queryFn: () => requestStudio(`/api/houses/${houseId}`, HouseDetail),
  });
  const [open, setOpen] = useState(false);
  if (!houseId) return null;
  const refresh = () => house.refetch();
  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-4">
        <CardTitle>{words.title}</CardTitle>
        <Button size="sm" variant="secondary" onClick={() => setOpen(!open)} aria-expanded={open}>
          {words.open}
        </Button>
      </div>
      {open && (
        <div className="mt-4 space-y-4">
          <p className="text-16 text-ink/70">{words.intro}</p>
          {house.data?.rooms.length === 0 && <p className="text-16">{words.empty}</p>}
          {house.data?.rooms.map((room) => (
            <RoomRow key={room.id} room={room} onChanged={refresh} />
          ))}
          <AddRoom houseId={houseId} onChanged={refresh} />
        </div>
      )}
    </section>
  );
}

async function uploadPhoto(houseId: string, file: File) {
  const body = new FormData();
  body.set("file", file);
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

function RoomRow({ room, onChanged }: { room: Room; onChanged: () => void }) {
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
  const photo = useMutation({
    mutationFn: async (file: File) => {
      const asset = await uploadPhoto(room.houseId, file);
      return requestStudio(`/api/rooms/${room.id}`, Room, {
        method: "PATCH",
        headers: json,
        body: JSON.stringify({ background: { kind: "photo", assetId: asset.id } }),
      });
    },
    onSuccess: onChanged,
  });
  const remove = useMutation({
    mutationFn: () => requestStudio(`/api/rooms/${room.id}`, DeletedResponse, { method: "DELETE" }),
    onSuccess: onChanged,
  });
  const busy = patch.isPending || photo.isPending || remove.isPending;
  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-end gap-3">
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
        <input
          id={`photo-${room.id}`}
          type="file"
          accept="image/jpeg"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) photo.mutate(file);
          }}
        />
        <p className="text-14 text-ink/70">{words.photoHint}</p>
      </div>
      {photo.isPending && (
        <p role="status" className="flex items-center gap-2 text-16">
          <MovingDots /> {words.working}
        </p>
      )}
      {(patch.isError || photo.isError || remove.isError) && (
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

function AddRoom({ houseId, onChanged }: { houseId: string; onChanged: () => void }) {
  const create = useMutation({
    mutationFn: async (input: { name: string; style?: RoomStyle; file?: File }) => {
      const body = input.file
        ? {
            name: input.name,
            source: "photo",
            assetId: (await uploadPhoto(houseId, input.file)).id,
          }
        : { name: input.name, source: "style", style: input.style };
      return requestStudio(`/api/houses/${houseId}/rooms`, Room, {
        method: "POST",
        headers: { ...json, "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify(body),
      });
    },
    onSuccess: onChanged,
  });
  return (
    <Card className="space-y-3 p-4">
      <p className="text-18 font-bold">{words.add}</p>
      <StylePicker
        disabled={create.isPending}
        onPick={(style) => create.mutate({ name: roomStyles[style].name, style })}
      />
      <div className="space-y-1">
        <Label htmlFor="new-room-photo">{words.photoLabel}</Label>
        <input
          id="new-room-photo"
          type="file"
          accept="image/jpeg"
          disabled={create.isPending}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file)
              create.mutate({
                name: file.name.replace(/\.[^.]+$/, "").slice(0, 60) || words.title,
                file,
              });
          }}
        />
      </div>
      {create.isPending && (
        <p role="status" className="flex items-center gap-2 text-16">
          <MovingDots /> {words.working}
        </p>
      )}
      {create.isError && (
        <p role="alert" className="rounded-lg bg-warning-surface p-3 text-16">
          {words.error}
        </p>
      )}
    </Card>
  );
}
