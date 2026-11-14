"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DeletedResponse, House, HouseDetail } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { requestStudio } from "./api";
import { readOkAloneDefault, writeOkAloneDefault } from "./dont-show";
import { StudioQuery } from "./StudioQuery";
import { forgetStudioHouse, useStudioHouseId } from "./studio-house";

const words = copy.studio.care;
const Saved = House.pick({ id: true, dontShow: true });

export function CarePrivacy({ houseId }: { houseId?: string }) {
  return (
    <StudioQuery>
      <Care initialHouseId={houseId} />
    </StudioQuery>
  );
}

function Care({ initialHouseId }: { initialHouseId?: string }) {
  const { houseId, ready } = useStudioHouseId(initialHouseId);
  const client = useQueryClient();
  const key = ["house", houseId];
  const house = useQuery({
    queryKey: key,
    enabled: Boolean(houseId),
    queryFn: () => requestStudio(`/api/houses/${houseId}`, HouseDetail),
  });
  const [entry, setEntry] = useState("");
  const [alone, setAlone] = useState(false);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => setAlone(readOkAloneDefault()), []);

  const save = useMutation({
    mutationFn: (dontShow: string[]) =>
      requestStudio(`/api/houses/${houseId}`, Saved, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dontShow }),
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
  const remove = useMutation({
    mutationFn: () =>
      requestStudio(`/api/houses/${houseId}`, DeletedResponse, { method: "DELETE" }),
    onSuccess: forgetStudioHouse,
  });

  if (!ready) return null;
  if (remove.isSuccess)
    return (
      <Card className="space-y-4 p-6">
        <p className="text-18">{words.deleted}</p>
        <Button asChild>
          <Link href="/studio/house/new">{copy.studio.hearBack.newHouse}</Link>
        </Button>
      </Card>
    );
  if (!houseId || house.isError)
    return (
      <p role="alert" className="rounded-lg bg-warning-surface p-4 text-16">
        {houseId ? words.loadError : words.noHouse}
      </p>
    );
  const list = house.data?.dontShow ?? [];
  const add = (event: FormEvent) => {
    event.preventDefault();
    const word = entry.trim();
    if (!word) return;
    save.mutate([...list, word]);
    setEntry("");
  };
  const name = house.data?.firstName ?? "";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/studio?house=${houseId}`}
          className="inline-flex min-h-12 items-center text-16 font-bold"
        >
          {copy.studio.memory.back}
        </Link>
        <h1 className="font-display text-32 sm:text-40">{words.title}</h1>
        <p className="mt-2 max-w-2xl text-18 text-ink/70">{words.intro}</p>
      </div>

      <Card className="space-y-4 p-5">
        <h2 className="font-display text-22">{words.dontShowTitle}</h2>
        <p className="text-16 text-ink/70">{words.dontShowHint}</p>
        <ul className="flex flex-wrap gap-2">
          {list.length === 0 && <li className="text-16 text-ink/70">{words.none}</li>}
          {list.map((word) => (
            <li
              key={word}
              className="flex items-center gap-1 rounded-full bg-ink/5 py-1 pl-4 pr-1 text-16"
            >
              {word}
              <button
                type="button"
                aria-label={`${words.remove} ${word}`}
                className="flex size-12 items-center justify-center rounded-full"
                onClick={() => save.mutate(list.filter((item) => item !== word))}
              >
                <X aria-hidden className="size-4" />
              </button>
            </li>
          ))}
        </ul>
        <form onSubmit={add} className="flex flex-wrap items-end gap-3">
          <div className="min-w-60 flex-1 space-y-2">
            <Label htmlFor="dont-show">{words.dontShowLabel}</Label>
            <Input
              id="dont-show"
              value={entry}
              maxLength={80}
              placeholder={words.dontShowPlaceholder}
              onChange={(event) => setEntry(event.target.value)}
            />
          </div>
          <Button type="submit" variant="secondary" disabled={!entry.trim() || save.isPending}>
            {words.add}
          </Button>
        </form>
        {save.isError && (
          <p role="alert" className="text-16">
            {words.saveError}
          </p>
        )}
      </Card>

      <Card className="flex items-start justify-between gap-4 p-5">
        <div>
          <Label htmlFor="alone-default">{words.aloneTitle}</Label>
          <p className="text-16 text-ink/70">{words.aloneHint}</p>
        </div>
        <Switch
          id="alone-default"
          checked={alone}
          onCheckedChange={(on) => {
            setAlone(on);
            writeOkAloneDefault(on);
          }}
        />
      </Card>

      <Card className="space-y-2 p-5">
        <h2 className="font-display text-22">{words.privacyTitle}</h2>
        <p className="text-16">{words.privacy}</p>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-display text-22">{words.deleteTitle}</h2>
        <p className="text-16 text-ink/70">{words.deleteHint}</p>
        {confirming ? (
          <div
            role="alertdialog"
            aria-labelledby="delete-confirm"
            className="space-y-3 rounded-lg bg-warning-surface p-4"
          >
            <p id="delete-confirm" className="text-18 font-bold">
              {words.deleteConfirmTitle.replace("{name}", name)}
            </p>
            <p className="text-16">{words.deleteConfirmHint}</p>
            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={() => remove.mutate()} disabled={remove.isPending}>
                {words.deleteConfirm}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>
                {words.deleteCancel}
              </Button>
            </div>
            {remove.isError && (
              <p role="alert" className="text-16">
                {words.deleteError}
              </p>
            )}
          </div>
        ) : (
          <Button type="button" variant="secondary" onClick={() => setConfirming(true)}>
            {words.deleteAction}
          </Button>
        )}
      </Card>
    </div>
  );
}
