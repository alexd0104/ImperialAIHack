import { copy } from "@/lib/copy";

// Placeholder until the Studio and House routes land; styling comes with the tokens (F5).
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-semibold">{copy.app.name}</h1>
      <p className="max-w-md text-lg">{copy.app.tagline}</p>
    </main>
  );
}
