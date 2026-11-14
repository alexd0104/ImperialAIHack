import Image from "next/image";
import { Suspense } from "react";
import { HearBack } from "@/components/studio/HearBack";
import { copy } from "@/lib/copy";

type Search = { searchParams: Promise<{ house?: string }> };

// searchParams are read inside <Suspense> (Next 16 cache components), as in B8.
export default function StudioHomePage({ searchParams }: Search) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[1194px] px-5 py-6 sm:px-page">
      <header className="mb-6 flex items-center justify-between">
        <Image src="/brand/memorai-logo.svg" alt={copy.app.name} width={164} height={36} priority />
        <span className="text-14 text-ink/70">{copy.studio.login.title}</span>
      </header>
      <Suspense fallback={null}>
        <Home searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Home({ searchParams }: Search) {
  const { house } = await searchParams;
  return <HearBack houseId={house} />;
}
