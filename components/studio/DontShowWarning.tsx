import { copy } from "@/lib/copy";

/** SH3: a gentle warning, never a block; the family decides. */
export function DontShowWarning({ mentions }: { mentions: string[] }) {
  return (
    <div role="status" className="rounded-lg bg-warning-surface p-4 text-16">
      <p className="font-bold">{copy.studio.care.warnTitle}</p>
      <p>{mentions.join(", ")}</p>
    </div>
  );
}
