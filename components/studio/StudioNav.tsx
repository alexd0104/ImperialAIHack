"use client";

import { ChevronLeft, LogOut } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { HouseDetail } from "@/lib/contracts";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import { requestStudio } from "./api";
import { fetchMemory } from "./memory-client";
import { useStudioHouseId } from "./studio-house";
import {
  activeSection,
  bankMemoryId,
  flowStep,
  type StudioSection,
  stepLabel,
  studioParent,
  withHouse,
} from "./studio-nav";

const words = copy.studio.nav;
const item =
  "inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-16 transition-colors";

type HeaderProps = { active: StudioSection | null; houseId: string | null; createHref: string };

/** Static header, also the Suspense fallback while the URL is read (cacheComponents). */
export function StudioHeader({ active, houseId, createHref }: HeaderProps) {
  const links: { section: StudioSection; href: string; label: string }[] = [
    { section: "home", href: withHouse("/studio", houseId), label: words.home },
    { section: "create", href: createHref, label: words.create },
    { section: "care", href: withHouse("/studio/care", houseId), label: words.care },
  ];
  return (
    <header className="flex flex-wrap items-center gap-x-2 gap-y-2">
      <Link
        href={withHouse("/studio", houseId)}
        aria-label={words.logo}
        className="mr-auto inline-flex min-h-11 items-center"
      >
        <Image src="/brand/memorai-logo.svg" alt="" width={164} height={36} priority />
      </Link>
      {/* ≤640 px: Sign out stays beside the logo and the links get their own row, which
          scrolls sideways if it must; nothing hides in a menu. */}
      <nav
        aria-label={words.label}
        className="order-last -mx-1 w-full overflow-x-auto px-1 sm:order-none sm:w-auto"
      >
        <ul className="flex items-center gap-1">
          {links.map((link) => (
            <li key={link.section}>
              <Link
                href={link.href}
                aria-current={active === link.section ? "page" : undefined}
                className={cn(
                  item,
                  active === link.section
                    ? "bg-surface font-bold text-ink"
                    : "text-ink/70 hover:text-ink",
                )}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <SignOutButton />
    </header>
  );
}

function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      className={cn(item, "text-ink/70 hover:text-ink disabled:opacity-50")}
      onClick={async () => {
        setPending(true);
        try {
          await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
        } catch {
          // The sign-in page still loads; the proxy decides from the cookie.
        }
        router.replace("/studio/login");
        router.refresh();
      }}
    >
      <LogOut aria-hidden className="size-4.5" />
      {pending ? words.signingOut : words.signOut}
    </button>
  );
}

/** Header + back link + step, from the URL. Must sit inside <Suspense> (reads the URL). */
export function StudioNav() {
  const pathname = usePathname();
  const fromUrl = useSearchParams().get("house") ?? undefined;
  const { houseId } = useStudioHouseId(fromUrl);
  const createHref = useCreateHref(houseId);
  const storyId = useBankStoryId(bankMemoryId(pathname));
  const back = studioParent(pathname, { houseId, storyId });
  const step = flowStep(pathname);
  // Kept compact: the screens below were laid out to fit the 1194×834 tablet without the row.
  return (
    <div className={back || step ? "mb-2" : "mb-6"}>
      <StudioHeader active={activeSection(pathname)} houseId={houseId} createHref={createHref} />
      {(back || step) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {back ? (
            <Link
              href={back.href}
              className="inline-flex min-h-11 items-center gap-2 text-16 font-bold"
            >
              <ChevronLeft aria-hidden className="size-5" />
              {back.label}
            </Link>
          ) : (
            <span />
          )}
          {step && <p className="text-14 font-bold text-ink/70">{stepLabel(step)}</p>}
        </div>
      )}
    </div>
  );
}

/** "Create" opens a new Story in the House's first Room, or makes a House when none exists. */
function useCreateHref(houseId: string | null) {
  const [roomId, setRoomId] = useState<string | null>(null);
  useEffect(() => {
    setRoomId(null);
    if (!houseId) return;
    let live = true;
    requestStudio(`/api/houses/${houseId}`, HouseDetail)
      .then((house) => live && setRoomId(house.rooms[0]?.id ?? null))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [houseId]);
  return roomId ? `/studio/stories/new?roomId=${encodeURIComponent(roomId)}` : "/studio/house/new";
}

/** The Memory bank's parent is its Story's place page, known once the Memory loads. */
function useBankStoryId(memoryId: string | null) {
  const [storyId, setStoryId] = useState<string | null>(null);
  useEffect(() => {
    setStoryId(null);
    if (!memoryId) return;
    let live = true;
    fetchMemory(memoryId)
      .then((memory) => live && setStoryId(memory.storyId))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [memoryId]);
  return storyId;
}
