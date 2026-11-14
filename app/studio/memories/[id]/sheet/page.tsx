import { MemorySheetView } from "@/components/studio/MemorySheetView";
import { StudioPage } from "@/components/studio/StudioPage";

export default async function MemorySheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <StudioPage>
      <MemorySheetView memoryId={id} />
    </StudioPage>
  );
}
