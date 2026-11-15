import { Suspense } from "react";
import { HearBack } from "@/components/studio/HearBack";
import { RoomManager } from "@/components/studio/RoomManager";
import { StudioPage } from "@/components/studio/StudioPage";

type Search = { searchParams: Promise<{ house?: string }> };

// searchParams are read inside <Suspense> (Next 16 cache components), as in B8.
export default function StudioHomePage({ searchParams }: Search) {
  return (
    <StudioPage>
      <Suspense fallback={null}>
        <Home searchParams={searchParams} />
      </Suspense>
    </StudioPage>
  );
}

async function Home({ searchParams }: Search) {
  const { house } = await searchParams;
  return (
    <>
      <HearBack houseId={house} />
      <RoomManager houseId={house} />
    </>
  );
}
