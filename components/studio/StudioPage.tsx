import Image from "next/image";
import type { ReactNode } from "react";
import { copy } from "@/lib/copy";

/** Shared frame for Studio screens: logo header and the 1194 px column. */
export function StudioPage({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[1194px] px-5 py-6 sm:px-page">
      <header className="mb-6 flex items-center justify-between">
        <Image src="/brand/memorai-logo.svg" alt={copy.app.name} width={164} height={36} priority />
        <span className="text-14 text-ink/70">{copy.studio.login.title}</span>
      </header>
      {children}
    </main>
  );
}
