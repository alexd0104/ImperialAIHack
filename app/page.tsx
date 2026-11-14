import { copy } from "@/lib/copy";

// Placeholder until the Studio and House routes land.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="font-display text-44">{copy.app.name}</h1>
      <p className="max-w-md text-18 text-ink/70">{copy.app.tagline}</p>
    </main>
  );
}
