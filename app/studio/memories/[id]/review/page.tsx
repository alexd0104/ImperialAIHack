import { Suspense } from "react";
import { ReviewMemory } from "@/components/studio/ReviewMemory";
import { StudioPage } from "@/components/studio/StudioPage";

type Params = { params: Promise<{ id: string }> };

// Params are read inside <Suspense> (Next 16 cache components), as in /house/[token] (B8).
export default function ReviewPage({ params }: Params) {
  return (
    <StudioPage>
      <Suspense fallback={null}>
        <Content params={params} />
      </Suspense>
    </StudioPage>
  );
}

async function Content({ params }: Params) {
  const { id } = await params;
  return <ReviewMemory memoryId={id} />;
}
