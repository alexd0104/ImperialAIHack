import type { Metadata } from "next";
import { Suspense } from "react";
import { HouseApp } from "@/components/house/house-app";
import { copy } from "@/lib/copy";

export const metadata: Metadata = { title: copy.app.name, robots: { index: false } };

// The private House link. `?mode=alone` is set by the family's "on your own" link.
// Params are read inside <Suspense> (Next 16 cache components); the fallback is the plain
// warm background, the same as during preload, so nothing ever flashes.
export default function HousePage({ params, searchParams }: PageProps<"/house/[token]">) {
  return (
    <Suspense fallback={null}>
      <House params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function House({ params, searchParams }: PageProps<"/house/[token]">) {
  const { token } = await params;
  const { mode } = await searchParams;
  return <HouseApp token={token} mode={mode === "alone" ? "alone" : "together"} />;
}
