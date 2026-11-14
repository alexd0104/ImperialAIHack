import Image from "next/image";
import { CreateHouseForm } from "@/components/studio/CreateHouseForm";
import { copy } from "@/lib/copy";

export default function CreateHousePage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-[1194px] px-5 py-6 sm:px-page">
      <header className="mb-4 flex items-center justify-between">
        <Image src="/brand/memorai-logo.svg" alt={copy.app.name} width={164} height={36} priority />
        <span className="text-14 font-semibold text-ink/70">{copy.studio.login.title}</span>
      </header>
      <CreateHouseForm />
    </main>
  );
}
