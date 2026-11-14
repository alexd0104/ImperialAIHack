import { CarePrivacy } from "@/components/studio/CarePrivacy";
import { StudioPage } from "@/components/studio/StudioPage";

export default async function CarePage({
  searchParams,
}: {
  searchParams: Promise<{ house?: string }>;
}) {
  const { house } = await searchParams;
  return (
    <StudioPage>
      <CarePrivacy houseId={house} />
    </StudioPage>
  );
}
