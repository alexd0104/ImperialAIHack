"use client";

import { QueryClient, QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import { ArrowRight, Check } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { StepProgress } from "@/components/ui/step-progress";
import { AssetView, CreateStoryRequest, JobView, Room, Story } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { postStudio, requestStudio, StudioApiError } from "./api";
import { type LibraryName, libraryImage, objectLabel, objectLibrary } from "./object-library";
import { resizeObjectPhoto } from "./photo";

const words = copy.studio.createStory;

function errorMessage(error: unknown) {
  if (error instanceof StudioApiError) return error.message;
  if (
    error instanceof Error &&
    [words.fileSize, words.fileType].some((message) => message === error.message)
  )
    return error.message;
  return words.error;
}

export function CreateStoryForm() {
  const [client] = useState(() => new QueryClient());
  const [roomId, setRoomId] = useState<string | null>(null);
  useEffect(() => {
    setRoomId(new URLSearchParams(window.location.search).get("roomId") ?? "");
  }, []);
  if (roomId === null) return null;
  if (!roomId)
    return (
      <Button asChild>
        <Link href="/studio/house/new">{words.newHouse}</Link>
      </Button>
    );
  return (
    <QueryClientProvider client={client}>
      <StoryForm roomId={roomId} />
    </QueryClientProvider>
  );
}

function StoryForm({ roomId }: { roomId: string }) {
  const draftKey = `memorai:create-story:${roomId}`;
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<"library" | "photo">("library");
  const [name, setName] = useState<LibraryName>("watering-can");
  const [asset, setAsset] = useState<AssetView | null>(null);
  const [story, setStory] = useState<Story | null>(null);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const [canSave, setCanSave] = useState(true);
  const [message, setMessage] = useState("");
  const [provisionalSlot, setProvisionalSlot] = useState<string | null>(null);
  const creationKey = useRef("");
  const alert = useRef<HTMLParagraphElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const room = useQuery({
    queryKey: ["room", roomId],
    queryFn: () => requestStudio(`/api/rooms/${encodeURIComponent(roomId)}`, Room),
    retry: false,
  });

  useEffect(() => {
    creationKey.current = crypto.randomUUID();
    try {
      const draft: unknown = JSON.parse(sessionStorage.getItem(draftKey) ?? "null");
      if (draft && typeof draft === "object") {
        if ("title" in draft && typeof draft.title === "string") setTitle(draft.title.slice(0, 80));
        if ("mode" in draft && (draft.mode === "library" || draft.mode === "photo"))
          setMode(draft.mode);
        if ("name" in draft) {
          const savedName = objectLibrary.find((value) => value === draft.name);
          if (savedName) setName(savedName);
        }
        if ("asset" in draft) {
          const parsed = AssetView.safeParse(draft.asset);
          if (parsed.success) setAsset(parsed.data);
        }
        if ("key" in draft && typeof draft.key === "string" && /^[a-f0-9-]{36}$/i.test(draft.key)) {
          creationKey.current = draft.key;
          if ("locked" in draft) setLocked(draft.locked === true);
          if ("slotId" in draft && typeof draft.slotId === "string")
            setProvisionalSlot(draft.slotId);
          if ("story" in draft) {
            const parsed = Story.safeParse(draft.story);
            if (parsed.success && parsed.data.roomId === roomId) setStory(parsed.data);
          }
        }
      }
    } catch {
      setCanSave(false);
    }
    setReady(true);
  }, [draftKey, roomId]);

  function saveDraft(
    next: { locked?: boolean; slotId?: string; story?: Story; asset?: AssetView } = {},
  ) {
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          title,
          mode,
          name,
          asset,
          story,
          key: creationKey.current,
          locked,
          slotId: provisionalSlot,
          ...next,
        }),
      );
    } catch {
      setCanSave(false);
    }
  }
  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          title,
          mode,
          name,
          asset,
          story,
          key: creationKey.current,
          locked,
          slotId: provisionalSlot,
        }),
      );
    } catch {
      setCanSave(false);
    }
  }, [ready, draftKey, title, mode, name, asset, story, locked, provisionalSlot]);

  const upload = useMutation({
    onMutate: () => {
      setAsset(null);
      setMessage("");
    },
    mutationFn: async (file: File) => {
      if (!room.data) throw new Error(words.missingRoom);
      const blob = await resizeObjectPhoto(file);
      const data = new FormData();
      data.append("file", blob, "object.jpg");
      return requestStudio(`/api/houses/${room.data.houseId}/assets`, AssetView, {
        method: "POST",
        body: data,
      });
    },
    onSuccess: (value) => {
      setAsset(value);
      saveDraft({ asset: value });
      setMessage("");
    },
    onError: (error) => setMessage(errorMessage(error)),
  });
  const create = useMutation({
    mutationFn: (input: CreateStoryRequest) =>
      postStudio(
        `/api/rooms/${encodeURIComponent(roomId)}/stories`,
        input,
        Story,
        creationKey.current,
      ),
    onSuccess: (value) => {
      setStory(value);
      saveDraft({ story: value, locked: true });
      setMessage("");
    },
    onError: (error) => setMessage(errorMessage(error)),
  });
  const job = useQuery({
    queryKey: ["object-job", story?.id],
    queryFn: () => requestStudio(`/api/stories/${story?.id}/object-job`, JobView),
    enabled: Boolean(story?.object.jobId),
    retry: false,
    refetchInterval: (query) =>
      query.state.error ||
      (query.state.data && ["done", "fallback", "failed"].includes(query.state.data.status))
        ? false
        : 1000,
  });
  const error = room.error ?? upload.error ?? create.error ?? job.error;
  const expired = error instanceof StudioApiError && error.code === "unauthorized";
  const done = Boolean(
    story &&
      (!story.object.jobId ||
        (job.data && ["done", "fallback", "failed"].includes(job.data.status))),
  );
  useEffect(() => {
    if (message || error) alert.current?.focus();
  }, [message, error]);
  useEffect(() => {
    if (done) heading.current?.focus();
  }, [done]);

  function startAgain() {
    creationKey.current = crypto.randomUUID();
    setLocked(false);
    setStory(null);
    setMessage("");
    setProvisionalSlot(null);
    create.reset();
    upload.reset();
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (create.isPending || upload.isPending || !ready) return;
    const slotId = provisionalSlot ?? room.data?.slots.find((slot) => !slot.storyId)?.id;
    if (!slotId) {
      setMessage(words.noSlot);
      return;
    }
    if (mode === "photo" && !asset) {
      setMessage(words.missingPhoto);
      return;
    }
    const input = CreateStoryRequest.safeParse({
      title,
      slotId,
      object:
        mode === "library" ? { kind: "library", name } : { kind: "photo", assetId: asset?.id },
    });
    if (!input.success) {
      setMessage(words.invalid);
      return;
    }
    saveDraft({ locked: true, slotId });
    setProvisionalSlot(slotId);
    setLocked(true);
    setMessage("");
    create.mutate(input.data);
  }

  return (
    <>
      <h1 ref={heading} tabIndex={-1} className="font-display text-32 sm:text-40">
        {done ? words.ready : story ? words.preparing : words.title}
      </h1>
      <p className="mb-6 mt-2 max-w-2xl text-18 text-ink/70">
        {done ? words.readyHint : words.intro}
      </p>
      {(message || error) && (
        <p
          ref={alert}
          role="alert"
          tabIndex={-1}
          className="mb-4 rounded-lg bg-warning-surface p-4 text-16"
        >
          {message || errorMessage(error)}
        </p>
      )}
      {expired && (
        <Button asChild>
          <Link
            href={`/studio/login?next=${encodeURIComponent(`/studio/stories/new?roomId=${roomId}`)}`}
          >
            {words.signIn}
          </Link>
        </Button>
      )}
      {story ? (
        <Card className="mx-auto flex max-w-lg flex-col items-center gap-5 p-6 text-center">
          {asset && mode === "photo" ? (
            <div className="relative h-60 w-full">
              <Image
                src={asset.url}
                alt={words.photoLabel}
                fill
                sizes="(max-width: 639px) 300px, 400px"
                className="rounded-xl object-contain"
                unoptimized
              />
            </div>
          ) : (
            <div className="relative h-40 w-45">
              <Image
                src={libraryImage(name)}
                alt={objectLabel(name)}
                fill
                sizes="180px"
                className="object-contain"
              />
            </div>
          )}
          <h2 className="font-display text-28">{story.title}</h2>
          {story.object.jobId && !done && (
            <div className="space-y-3">
              <StepProgress
                stepLabel={
                  job.data?.current === 3
                    ? words.compress
                    : job.data?.current === 2
                      ? words.model3d
                      : words.cutout
                }
                done={job.data?.current ?? 0}
                total={4}
                aria-label={words.preparing}
              />
              {job.error && (
                <Button type="button" onClick={() => job.refetch()}>
                  {words.resume}
                </Button>
              )}
            </div>
          )}
          {done && <Check aria-hidden className="size-10 text-success-strong" />}
          {job.data?.status === "done" && <p className="text-14 text-ink/70">{words.sampleHint}</p>}
          {job.data?.status === "fallback" && (
            <p role="status" className="rounded-lg bg-warning-surface p-4 text-16">
              {words.fallback}
            </p>
          )}
          <p className="text-16 text-ink/70">{words.placement}</p>
          {done && (
            <Button asChild>
              <Link href={`/studio/stories/${story.id}/memories/new`}>
                {copy.studio.memory.start.addToStory}
              </Link>
            </Button>
          )}
          {done && (
            <Button variant="secondary" type="button" onClick={startAgain}>
              {words.another}
            </Button>
          )}
        </Card>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <fieldset
            disabled={!ready || locked || upload.isPending || create.isPending || !room.data}
            className="space-y-5"
          >
            <div className="flex flex-wrap gap-3">
              {(["library", "photo"] as const).map((value) => (
                <label
                  key={value}
                  className="flex min-h-12 cursor-pointer items-center gap-2 rounded-full border border-ink/20 bg-surface px-5 text-16 font-bold"
                >
                  <input
                    type="radio"
                    name="object-source"
                    value={value}
                    checked={mode === value}
                    onChange={() => {
                      setMode(value);
                      setMessage("");
                      upload.reset();
                    }}
                    className="accent-primary-strong"
                  />
                  {value === "library" ? words.library : words.photo}
                </label>
              ))}
            </div>
            {mode === "library" ? (
              <fieldset>
                <legend className="sr-only">{words.library}</legend>
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {objectLibrary.map((value) => (
                    <label key={value} className="relative cursor-pointer">
                      <input
                        className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                        type="radio"
                        name="object"
                        checked={name === value}
                        onChange={() => setName(value)}
                      />
                      <Card
                        className={cn(
                          "flex h-full flex-col items-center gap-2 border-2 p-3 text-center peer-focus-visible:outline-3 peer-focus-visible:outline-primary",
                          name === value ? "border-primary-strong" : "border-transparent",
                        )}
                      >
                        <div className="relative h-18 w-full">
                          <Image
                            src={libraryImage(value)}
                            alt=""
                            fill
                            sizes="100px"
                            className="object-contain"
                          />
                        </div>
                        <span className="text-14 font-bold">{objectLabel(value)}</span>
                      </Card>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : (
              <Card className="space-y-3 p-5">
                <Label htmlFor="object-photo">{words.photoLabel}</Label>
                <input
                  id="object-photo"
                  type="file"
                  accept="image/jpeg,image/png"
                  className="block w-full text-16"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      upload.reset();
                      upload.mutate(file);
                    }
                    event.target.value = "";
                  }}
                />
                <Label htmlFor="object-camera">{words.takePhoto}</Label>
                <input
                  id="object-camera"
                  type="file"
                  accept="image/jpeg,image/png"
                  capture="environment"
                  className="block w-full text-16"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      upload.reset();
                      upload.mutate(file);
                    }
                    event.target.value = "";
                  }}
                />
                <p className="text-14 text-ink/70">{words.photoHint}</p>
                {upload.isPending ? (
                  <p role="status">{words.uploading}</p>
                ) : (
                  asset && (
                    <>
                      <Image
                        src={asset.url}
                        alt={words.photoLabel}
                        width={160}
                        height={120}
                        className="h-30 w-40 rounded-lg object-cover"
                        unoptimized
                      />
                      <p role="status" className="text-14 text-success-strong">
                        {words.uploaded}
                      </p>
                    </>
                  )
                )}
              </Card>
            )}
            <div className="max-w-xl space-y-2">
              <Label htmlFor="story-title">{words.titleLabel}</Label>
              <Input
                id="story-title"
                maxLength={80}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={words.titlePlaceholder}
                required
              />
            </div>
          </fieldset>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-14 text-ink/70">{words.placement}</p>
            <Button
              type="submit"
              disabled={
                !ready ||
                !room.data ||
                upload.isPending ||
                create.isPending ||
                (mode === "photo" && !asset)
              }
            >
              {create.isPending ? words.saving : words.submit}
              <ArrowRight aria-hidden />
            </Button>
          </div>
          {locked && create.isError && !expired && (
            <Button type="button" variant="secondary" onClick={startAgain}>
              {words.another}
            </Button>
          )}
        </form>
      )}
      <p className="mt-4 text-13 text-ink/70">{canSave ? words.draft : words.unsaved}</p>
    </>
  );
}
