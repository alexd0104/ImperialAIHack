"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { QueryClient, QueryClientProvider, useMutation } from "@tanstack/react-query";
import { ArrowRight, Check, LockKeyhole } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, Label } from "@/components/ui/input";
import { CreateHouseRequest, House, Room, RoomStyle } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { postStudio, StudioApiError } from "./api";
import { roomStyles } from "./room-styles";

const words = copy.studio.createHouse;
const draftKey = "memorai:create-house:v1";
const nameSchema = CreateHouseRequest.pick({ firstName: true });

export function CreateHouseForm() {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <HouseForm />
    </QueryClientProvider>
  );
}

function HouseForm() {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<Pick<CreateHouseRequest, "firstName">>({
    resolver: zodResolver(nameSchema),
    defaultValues: { firstName: "" },
  });
  const firstName = watch("firstName");
  const [style, setStyle] = useState<RoomStyle>("garden");
  const [consent, setConsent] = useState(false);
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [locked, setLocked] = useState(false);
  const [validation, setValidation] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<Room | null>(null);
  const ids = useRef({ house: "", room: "" });
  const notice = useRef<HTMLParagraphElement>(null);
  const completedHeading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    ids.current = { house: crypto.randomUUID(), room: crypto.randomUUID() };
    try {
      const saved: unknown = JSON.parse(sessionStorage.getItem(draftKey) ?? "null");
      if (saved && typeof saved === "object") {
        if ("firstName" in saved && typeof saved.firstName === "string")
          reset({ firstName: saved.firstName.slice(0, 40) });
        if ("style" in saved) {
          const parsed = RoomStyle.safeParse(saved.style);
          if (parsed.success) setStyle(parsed.data);
        }
        if ("consent" in saved) setConsent(saved.consent === true);
        if ("houseId" in saved && "roomId" in saved) {
          const house = z.uuid().safeParse(saved.houseId);
          const room = z.uuid().safeParse(saved.roomId);
          if (house.success && room.success) {
            ids.current = { house: house.data, room: room.data };
            if ("locked" in saved) setLocked(saved.locked === true);
            if ("createdRoom" in saved) {
              const completed = Room.safeParse(saved.createdRoom);
              if (completed.success) setCreatedRoom(completed.data);
            }
          }
        }
      }
    } catch {
      setStorageAvailable(false);
    }
    setReady(true);
  }, [reset]);

  function saveDraft(submitted = locked) {
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          firstName,
          style,
          consent,
          locked: submitted,
          houseId: ids.current.house,
          roomId: ids.current.room,
          createdRoom,
        }),
      );
    } catch {
      setStorageAvailable(false);
    }
  }

  // The same ids survive reloads and retries, including a lost successful response.
  useEffect(() => {
    if (!ready) return;
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          firstName,
          style,
          consent,
          locked,
          houseId: ids.current.house,
          roomId: ids.current.room,
          createdRoom,
        }),
      );
    } catch {
      setStorageAvailable(false);
    }
  }, [firstName, style, consent, locked, createdRoom, ready]);

  const mutation = useMutation({
    retry: false,
    mutationFn: async (input: CreateHouseRequest) => {
      const house = await postStudio("/api/houses", input, House, ids.current.house);
      return postStudio(
        `/api/houses/${encodeURIComponent(house.id)}/rooms`,
        {
          name: roomStyles[style].name,
          source: "style",
          style,
        },
        Room,
        ids.current.room,
      );
    },
    onSuccess: setCreatedRoom,
  });

  useEffect(() => {
    if (mutation.isError || validation) notice.current?.focus();
  }, [mutation.isError, validation]);
  useEffect(() => {
    if (createdRoom) completedHeading.current?.focus();
  }, [createdRoom]);

  function startAgain() {
    ids.current = { house: crypto.randomUUID(), room: crypto.randomUUID() };
    reset({ firstName: "" });
    setStyle("garden");
    setConsent(false);
    setLocked(false);
    setCreatedRoom(null);
    setValidation(false);
    mutation.reset();
  }

  const expired =
    mutation.error instanceof StudioApiError && mutation.error.code === "unauthorized";
  const cannotRetry =
    mutation.error instanceof StudioApiError &&
    ["not_found", "conflict"].includes(mutation.error.code);

  if (createdRoom)
    return (
      <Card className="mx-auto flex max-w-xl flex-col items-center gap-5 p-8 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-success-surface text-success-strong">
          <Check className="size-8" aria-hidden />
        </span>
        <h1 ref={completedHeading} tabIndex={-1} className="font-display text-32">
          {words.readyTitle}
        </h1>
        <p className="text-18 text-ink/70">{words.readyIntro}</p>
        <Image
          src={roomStyles[createdRoom.style ?? "garden"].image}
          alt=""
          width={1194}
          height={834}
          className="h-auto w-90 max-w-full rounded-card"
        />
        <p className="text-20 font-bold">
          {firstName} · {createdRoom.name}
        </p>
        <p className="text-16 text-ink/70">{words.nextHint}</p>
        <Button type="button" variant="secondary" onClick={startAgain}>
          {words.another}
        </Button>
      </Card>
    );

  return (
    <>
      <div className="mb-4 max-w-2xl">
        <p className="mb-2 text-14 font-bold uppercase tracking-wider text-ink/70">
          {words.eyebrow}
        </p>
        <h1 className="font-display text-32 font-semibold sm:text-40">{words.title}</h1>
        <p className="mt-2 text-18 text-ink/70">{words.intro}</p>
      </div>
      <form
        noValidate
        onSubmit={handleSubmit((values) => {
          const input = CreateHouseRequest.safeParse({ ...values, consent });
          if (!input.success) {
            setValidation(true);
            return;
          }
          if (mutation.isPending) return;
          saveDraft(true);
          setLocked(true);
          setValidation(false);
          mutation.mutate(input.data);
        })}
        className="space-y-4"
      >
        <fieldset disabled={!ready || locked || mutation.isPending} className="space-y-4">
          <div className="max-w-md space-y-2">
            <Label htmlFor="first-name">{words.nameLabel}</Label>
            <Input
              id="first-name"
              size="lg"
              autoComplete="off"
              maxLength={40}
              placeholder={words.namePlaceholder}
              {...register("firstName")}
              aria-invalid={Boolean(errors.firstName)}
              aria-describedby="name-hint name-error"
            />
            <p id="name-hint" className="text-14 text-ink/70">
              {words.nameHint}
            </p>
            <p
              id="name-error"
              hidden={!errors.firstName}
              className="text-14 text-danger"
              role={errors.firstName ? "alert" : undefined}
            >
              {errors.firstName ? words.invalidHouse : ""}
            </p>
          </div>
          <fieldset aria-describedby="room-hint">
            <legend className="text-18 font-bold">{words.roomLegend}</legend>
            <p id="room-hint" className="mb-4 mt-1 text-16 text-ink/70">
              {words.roomHint}
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              {RoomStyle.options.map((value) => (
                <label key={value} className="relative cursor-pointer">
                  <input
                    type="radio"
                    className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                    name="room-style"
                    value={value}
                    checked={style === value}
                    onChange={() => setStyle(value)}
                  />
                  <Card
                    className={cn(
                      "overflow-hidden border-2 p-2 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-primary",
                      style === value ? "border-primary-strong" : "border-transparent",
                    )}
                  >
                    <div className="relative aspect-[1194/834] sm:aspect-[16/7]">
                      <Image
                        src={roomStyles[value].image}
                        alt=""
                        fill
                        sizes="(max-width: 639px) calc(100vw - 60px), 320px"
                        className="rounded-xl object-cover"
                      />
                    </div>
                    <span className="flex items-center justify-between px-3 py-3 text-18 font-bold">
                      {roomStyles[value].name}
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full border",
                          style === value
                            ? "border-primary-strong bg-primary-strong text-white"
                            : "border-ink/45",
                        )}
                      >
                        {style === value && <Check className="size-4" aria-hidden />}
                      </span>
                    </span>
                  </Card>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex max-w-3xl items-start gap-3 rounded-xl bg-surface p-3">
            <Checkbox
              id="consent"
              checked={consent}
              onCheckedChange={(value) => setConsent(value === true)}
              aria-required="true"
            />
            <Label
              htmlFor="consent"
              className="cursor-pointer text-16 font-normal leading-relaxed text-ink"
            >
              {words.consent}
            </Label>
          </div>
        </fieldset>
        {(validation || mutation.isError) && (
          <p
            role="alert"
            ref={notice}
            tabIndex={-1}
            className="rounded-lg bg-warning-surface p-4 text-16 text-ink"
          >
            {validation
              ? words.validation
              : expired
                ? words.signIn
                : cannotRetry
                  ? mutation.error?.message
                  : words.saveError}
          </p>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex max-w-lg items-start gap-2 text-14 text-ink/70">
            <LockKeyhole className="mt-0.5 size-4 shrink-0" aria-hidden />
            {words.privacy}
          </p>
          {expired ? (
            <Button asChild>
              <Link href="/studio/login?next=%2Fstudio%2Fhouse%2Fnew">{words.signInAction}</Link>
            </Button>
          ) : cannotRetry ? (
            <Button type="button" onClick={startAgain}>
              {words.startAgain}
            </Button>
          ) : (
            <Button type="submit" disabled={!ready || mutation.isPending || !consent}>
              {mutation.isPending
                ? words.submitting
                : mutation.isError
                  ? words.retry
                  : words.submit}
              <ArrowRight aria-hidden />
            </Button>
          )}
        </div>
        <p className="text-13 text-ink/70">{storageAvailable ? words.saved : words.unsaved}</p>
      </form>
    </>
  );
}
