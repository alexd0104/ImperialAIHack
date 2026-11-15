"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { resolveSceneMotion, Scene, type SceneMotion } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { requestStudio } from "./api";

const words = copy.studio.motion;

/** Per-photo movement at review: saved on the scene, seen after "Try again". */
export function MotionPicker({
  scene,
  onSaved,
}: {
  scene: Pick<Scene, "id" | "motion">;
  onSaved?: () => void;
}) {
  return (
    <MotionFields
      initial={resolveSceneMotion(scene)}
      hint={words.hint}
      savedText={words.saved}
      onSaved={onSaved}
      save={(motion) =>
        requestStudio(`/api/scenes/${scene.id}`, Scene, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ motion }),
        })
      }
    />
  );
}

/** "Gentle" (default) or the family's own words, and 5 s / 10 s; where it is saved is the caller's. */
export function MotionFields({
  initial,
  save: persist,
  hint,
  savedText,
  onSaved,
}: {
  initial: SceneMotion;
  save: (motion: SceneMotion) => Promise<unknown>;
  hint: string;
  savedText: string;
  onSaved?: () => void;
}) {
  const current = initial;
  const [preset, setPreset] = useState<SceneMotion["preset"]>(current.preset);
  const [text, setText] = useState(current.text ?? "");
  const [durationSec, setDuration] = useState<SceneMotion["durationSec"]>(current.durationSec);

  const save = useMutation({
    mutationFn: () => {
      const motion: SceneMotion =
        preset === "custom" && text.trim()
          ? { preset, text: text.trim(), durationSec }
          : { preset: "gentle", durationSec };
      return persist(motion);
    },
    onSuccess: onSaved,
  });

  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-16 font-bold">{words.legend}</legend>
      <ToggleGroup
        type="single"
        value={preset}
        onValueChange={(value) => value && setPreset(value as SceneMotion["preset"])}
        aria-label={words.legend}
      >
        <ToggleGroupItem value="gentle">{words.gentle}</ToggleGroupItem>
        <ToggleGroupItem value="custom">{words.custom}</ToggleGroupItem>
      </ToggleGroup>
      {preset === "custom" && (
        <Input
          value={text}
          maxLength={200}
          placeholder={words.placeholder}
          aria-label={words.custom}
          onChange={(event) => setText(event.target.value)}
        />
      )}
      <ToggleGroup
        type="single"
        value={String(durationSec)}
        onValueChange={(value) => value && setDuration(value === "10" ? 10 : 5)}
        aria-label={words.length}
      >
        <ToggleGroupItem value="5">{words.seconds5}</ToggleGroupItem>
        <ToggleGroupItem value="10">{words.seconds10}</ToggleGroupItem>
      </ToggleGroup>
      <p className="text-14 text-ink/70">{hint}</p>
      <Button
        type="button"
        variant="secondary"
        disabled={save.isPending}
        onClick={() => save.mutate()}
      >
        {words.save}
      </Button>
      {save.isSuccess && <p className="text-14 text-success-strong">{savedText}</p>}
      {save.isError && (
        <p role="alert" className="text-14">
          {words.error}
        </p>
      )}
    </fieldset>
  );
}
