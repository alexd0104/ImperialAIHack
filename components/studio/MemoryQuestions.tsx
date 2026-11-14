"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import type { AssetView } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { StudioApiError } from "./api";
import { type AnswerDraft, toDraft, toPatch } from "./memory-answers";
import { fetchMemory, memoryKey, patchMemory } from "./memory-client";
import { StudioQuery } from "./StudioQuery";

const words = copy.studio.questions;
const colours = ["keep_bw", "colourise", "already_colour"] as const;
const AUTOSAVE_MS = 700;

export function MemoryQuestions({ memoryId }: { memoryId: string }) {
  return (
    <StudioQuery>
      <Questions memoryId={memoryId} />
    </StudioQuery>
  );
}

function Questions({ memoryId }: { memoryId: string }) {
  const memory = useQuery({ queryKey: memoryKey(memoryId), queryFn: () => fetchMemory(memoryId) });
  if (memory.isError)
    return (
      <p role="alert" className="rounded-lg bg-warning-surface p-4 text-16">
        {memory.error instanceof StudioApiError ? memory.error.message : copy.studio.memory.error}
      </p>
    );
  if (!memory.data) return null;
  return (
    <Form
      memoryId={memoryId}
      initial={toDraft(memory.data)}
      songs={memory.data.assets.filter((asset) => asset.kind === "song")}
    />
  );
}

function Form(props: { memoryId: string; initial: AnswerDraft; songs: AssetView[] }) {
  const [draft, setDraft] = useState(props.initial);
  const dirty = useRef(false);
  const save = useMutation({
    mutationFn: (next: AnswerDraft) => patchMemory(props.memoryId, toPatch(next)),
  });
  const { mutate } = save;
  const router = useRouter();
  // Save the latest answers before the sheet reads them, so it never shows stale rows.
  const next = async () => {
    if (dirty.current) await save.mutateAsync(draft).catch(() => undefined);
    router.push(`/studio/memories/${props.memoryId}/sheet`);
  };

  // Autosave: every pause in typing sends the whole draft; the server merges it.
  useEffect(() => {
    if (!dirty.current) return;
    const timer = setTimeout(() => mutate(draft), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [draft, mutate]);

  const set = <K extends keyof AnswerDraft>(key: K, value: AnswerDraft[K]) => {
    dirty.current = true;
    setDraft((current) => ({ ...current, [key]: value }));
  };
  const text = (key: Exclude<keyof AnswerDraft, "colour" | "okAlone">) => ({
    id: `field-${key}`,
    value: draft[key],
    onChange: (event: { target: { value: string } }) => set(key, event.target.value),
  });

  const status = save.isPending
    ? copy.studio.memory.saving
    : save.isError
      ? copy.studio.memory.error
      : save.isSuccess
        ? copy.studio.memory.saved
        : words.autosave;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-14 font-bold text-ink/70">{words.eyebrow}</p>
        <h1 className="font-display text-32 sm:text-40">{words.title}</h1>
        <p className="mt-2 max-w-2xl text-18 text-ink/70">{words.intro}</p>
      </div>

      <Card className="space-y-6 p-5">
        <Field id="field-title" label={words.title_.label}>
          <Input {...text("title")} maxLength={80} placeholder={words.title_.placeholder} />
        </Field>
        <Field id="field-people" label={words.people.label} help={words.people.help}>
          <Input {...text("people")} placeholder={words.people.placeholder} />
        </Field>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field id="field-place" label={words.place.label}>
            <Input {...text("place")} maxLength={120} placeholder={words.place.placeholder} />
          </Field>
          <Field id="field-when" label={words.when.label}>
            <Input {...text("when")} maxLength={40} placeholder={words.when.placeholder} />
          </Field>
        </div>
        <Field id="field-soundOfPlace" label={words.soundOfPlace.label}>
          <Input
            {...text("soundOfPlace")}
            maxLength={160}
            placeholder={words.soundOfPlace.placeholder}
          />
        </Field>
        <Field id="field-songAssetId" label={words.song.label}>
          <select
            {...text("songAssetId")}
            className="min-h-12 w-full rounded-lg border border-ink/20 bg-surface px-4 text-16"
          >
            <option value="">{words.song.none}</option>
            {props.songs.map((song, index) => (
              <option key={song.id} value={song.id}>
                {`${copy.studio.bank.songHeading} ${index + 1}`}
              </option>
            ))}
          </select>
        </Field>
        <Field id="field-message" label={words.message.label} help={words.message.help}>
          <Textarea
            {...text("message")}
            maxLength={400}
            rows={3}
            placeholder={words.message.placeholder}
          />
        </Field>
        <fieldset id="field-colour" className="space-y-2">
          <legend className="mb-2 text-16 font-bold">{words.colour.label}</legend>
          <div className="flex flex-wrap gap-3">
            {colours.map((value) => (
              <label
                key={value}
                className={cn(
                  "flex min-h-12 cursor-pointer items-center gap-2 rounded-full border border-ink/20 bg-surface px-5 text-16 font-bold",
                  draft.colour === value && "border-primary-strong",
                )}
              >
                <input
                  type="radio"
                  name="colour"
                  className="accent-primary-strong"
                  checked={draft.colour === value}
                  onChange={() => set("colour", value)}
                />
                {words.colour[value]}
              </label>
            ))}
          </div>
        </fieldset>
        <div id="field-okAlone" className="flex items-start justify-between gap-4">
          <div>
            <Label htmlFor="ok-alone">{words.okAlone.label}</Label>
            <p className="text-14 text-ink/70">{words.okAlone.help}</p>
          </div>
          <Switch
            id="ok-alone"
            checked={draft.okAlone}
            onCheckedChange={(on) => set("okAlone", on)}
          />
        </div>
        <Field id="field-freeText" label={words.freeTextLabel} help={words.freeTextHelp}>
          <Textarea
            {...text("freeText")}
            maxLength={500}
            rows={3}
            placeholder={words.freeTextPlaceholder}
          />
        </Field>
      </Card>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="button" onClick={next}>
          {words.continue}
        </Button>
        <Button asChild variant="secondary">
          <Link href={`/studio/memories/${props.memoryId}`}>{copy.studio.memory.back}</Link>
        </Button>
        <p role="status" className="text-14 text-ink/70">
          {status}
        </p>
      </div>
    </div>
  );
}

function Field(props: { id: string; label: string; help?: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={props.id}>{props.label}</Label>
      {props.help && <p className="text-14 text-ink/70">{props.help}</p>}
      {props.children}
    </div>
  );
}
