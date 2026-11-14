import type { Metadata } from "next";
import { HouseApp } from "@/components/house/house-app";
import { copy } from "@/lib/copy";

export const metadata: Metadata = { title: copy.app.name, robots: { index: false } };

// The private House link. `?mode=alone` is set by the family's "on your own" link.
export default async function HousePage({ params, searchParams }: PageProps<"/house/[token]">) {
  const { token } = await params;
  const { mode } = await searchParams;
  return <HouseApp token={token} mode={mode === "alone" ? "alone" : "together"} />;
}
