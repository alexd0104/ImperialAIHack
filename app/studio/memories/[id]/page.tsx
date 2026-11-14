import { MemoryBank } from "@/components/studio/MemoryBank";
import { StudioPage } from "@/components/studio/StudioPage";

export default async function MemoryBankPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <StudioPage>
      <MemoryBank memoryId={id} />
    </StudioPage>
  );
}
