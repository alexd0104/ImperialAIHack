import { Suspense } from "react";
import { MemoryQuestions } from "@/components/studio/MemoryQuestions";
import { StudioPage } from "@/components/studio/StudioPage";

type Params = { params: Promise<{ id: string }> };

// Params are read inside <Suspense> (Next 16 cache components), as in /house/[token] (B8).
export default function MemoryQuestionsPage({ params }: Params) {
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
  return <MemoryQuestions memoryId={id} />;
}
