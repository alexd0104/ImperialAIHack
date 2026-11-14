import { Suspense } from "react";
import { CarePrivacy } from "@/components/studio/CarePrivacy";
import { StudioPage } from "@/components/studio/StudioPage";

type Search = { searchParams: Promise<{ house?: string }> };

// searchParams are read inside <Suspense> (Next 16 cache components), as in B8.
export default function CarePage({ searchParams }: Search) {
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
  return <CarePrivacy houseId={house} />;
}
