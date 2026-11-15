"use client";

import { Camera, ImagePlus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

const words = copy.studio.filePicker;

/**
 * A real button to choose a photo (the bare browser file input is easy to miss), and once
 * chosen, a preview with its name and a Remove button so the family can change their mind.
 */
export function FilePicker(props: {
  id: string;
  accept: string;
  file: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  label?: string;
}) {
  if (props.file)
    return (
      <ChosenPhoto
        src={props.file}
        name={props.file.name}
        disabled={props.disabled}
        onRemove={() => props.onChange(null)}
      />
    );
  return (
    <PickPhotoButton
      id={props.id}
      accept={props.accept}
      disabled={props.disabled}
      label={props.label ?? words.choose}
      onPick={props.onChange}
    />
  );
}

/** The choose button alone, for flows that upload as soon as a photo is picked. */
export function PickPhotoButton(props: {
  id: string;
  accept: string;
  label: string;
  onPick: (file: File) => void;
  disabled?: boolean;
  camera?: boolean;
}) {
  const Icon = props.camera ? Camera : ImagePlus;
  return (
    <label
      htmlFor={props.id}
      className={cn(
        buttonVariants({ variant: "secondary", size: "sm" }),
        "cursor-pointer has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary-strong",
        props.disabled && "pointer-events-none opacity-50",
      )}
    >
      <Icon aria-hidden />
      {props.label}
      <input
        id={props.id}
        type="file"
        className="sr-only"
        accept={props.accept}
        capture={props.camera ? "environment" : undefined}
        disabled={props.disabled}
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Reset so picking the same file again after Remove still fires a change.
          event.target.value = "";
          if (file) props.onPick(file);
        }}
      />
    </label>
  );
}

/** Preview of the chosen photo (a File or an uploaded URL) with a Remove button. */
export function ChosenPhoto(props: {
  src: File | string;
  name?: string;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const url = usePreviewUrl(props.src);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-ink/15 bg-surface p-2">
      {url && (
        // biome-ignore lint/performance/noImgElement: local blob preview or /api/files URL.
        <img src={url} alt="" className="h-16 w-24 rounded-lg object-cover" />
      )}
      <span className="min-w-0 flex-1 truncate text-16">{props.name ?? words.chosen}</span>
      <button
        type="button"
        onClick={props.onRemove}
        disabled={props.disabled}
        aria-label={words.remove}
        className="flex min-h-12 items-center gap-1 rounded-full px-3 text-16 font-bold hover:bg-surface-muted disabled:opacity-50"
      >
        <X aria-hidden className="size-5" />
        <span className="hidden sm:inline">{words.remove}</span>
      </button>
    </div>
  );
}

function usePreviewUrl(src: File | string): string | null {
  const [url, setUrl] = useState<string | null>(typeof src === "string" ? src : null);
  useEffect(() => {
    if (typeof src === "string") {
      setUrl(src);
      return;
    }
    const blob = URL.createObjectURL(src);
    setUrl(blob);
    return () => URL.revokeObjectURL(blob);
  }, [src]);
  return url;
}
