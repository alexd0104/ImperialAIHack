import { Suspense } from "react";
import { NewRoomPage } from "@/components/studio/RoomPages";
import { StudioPage } from "@/components/studio/StudioPage";

type Search = { searchParams: Promise<{ house?: string }> };

// searchParams are read inside <Suspense> (Next 16 cache components), as in B8.
export default function NewRoomRoute({ searchParams }: Search) {
  return (
    <StudioPage>
      <Suspense fallback={null}>
        <Content searchParams={searchParams} />
      </Suspense>
    </StudioPage>
  );
}

async function Content({ searchParams }: Search) {
  const { house } = await searchParams;
  return <NewRoomPage houseId={house} />;
}
