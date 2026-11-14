import { MemoryQuestions } from "@/components/studio/MemoryQuestions";
import { StudioPage } from "@/components/studio/StudioPage";

export default async function MemoryQuestionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <StudioPage>
      <MemoryQuestions memoryId={id} />
    </StudioPage>
  );
}
