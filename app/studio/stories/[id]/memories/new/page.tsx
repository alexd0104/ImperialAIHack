import { NewMemoryForm } from "@/components/studio/NewMemoryForm";
import { StudioPage } from "@/components/studio/StudioPage";

export default async function NewMemoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <StudioPage>
      <NewMemoryForm storyId={id} />
    </StudioPage>
  );
}
