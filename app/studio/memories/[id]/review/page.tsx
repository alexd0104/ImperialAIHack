import { ReviewMemory } from "@/components/studio/ReviewMemory";
import { StudioPage } from "@/components/studio/StudioPage";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <StudioPage>
      <ReviewMemory memoryId={id} />
    </StudioPage>
  );
}
