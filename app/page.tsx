import Link from "next/link";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";

// Landing page: the family's way into the Studio (the House is opened by its own token link).
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="font-display text-44">{copy.app.name}</h1>
      <p className="max-w-md text-18 text-ink/70">{copy.app.tagline}</p>
      <Button asChild>
        <Link href="/studio">{copy.app.openStudio}</Link>
      </Button>
    </main>
  );
}
