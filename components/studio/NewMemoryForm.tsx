"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { copy } from "@/lib/copy";
import { StudioApiError } from "./api";
import { createMemory } from "./memory-client";
import { StudioQuery } from "./StudioQuery";

const words = copy.studio.memory;

export function NewMemoryForm({ storyId }: { storyId: string }) {
  return (
    <StudioQuery>
      <NewMemory storyId={storyId} />
    </StudioQuery>
  );
}

function NewMemory({ storyId }: { storyId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const create = useMutation({
    mutationFn: () => createMemory(storyId, title.trim()),
    onSuccess: (memory) => router.push(`/studio/memories/${memory.id}`),
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (title.trim()) create.mutate();
  };
  return (
    <Card className="mx-auto max-w-lg space-y-5 p-6">
      <h1 className="font-display text-32">{words.start.title}</h1>
      <p className="text-18 text-ink/70">{words.start.intro}</p>
      <form onSubmit={submit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="memory-title">{words.start.nameLabel}</Label>
          <Input
            id="memory-title"
            value={title}
            maxLength={80}
            placeholder={words.start.namePlaceholder}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>
        {create.isError && (
          <p role="alert" className="rounded-lg bg-warning-surface p-4 text-16">
            {create.error instanceof StudioApiError ? create.error.message : words.error}
          </p>
        )}
        <Button type="submit" disabled={!title.trim() || create.isPending}>
          {create.isPending ? words.start.saving : words.start.submit}
        </Button>
      </form>
    </Card>
  );
}
