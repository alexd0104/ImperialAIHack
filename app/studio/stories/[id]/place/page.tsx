import { PlaceStory } from "@/components/studio/PlaceStory";
import { StudioPage } from "@/components/studio/StudioPage";

export default async function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <StudioPage>
      <PlaceStory storyId={id} />
    </StudioPage>
  );
}
