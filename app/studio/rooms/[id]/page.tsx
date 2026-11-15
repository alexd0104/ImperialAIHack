import { Suspense } from "react";
import { EditRoomPage } from "@/components/studio/RoomPages";
import { StudioPage } from "@/components/studio/StudioPage";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ house?: string }> };

// Params are read inside <Suspense> (Next 16 cache components), as in /house/[token] (B8).
export default function EditRoomRoute(props: Props) {
  return (
    <StudioPage>
      <Suspense fallback={null}>
        <Content {...props} />
      </Suspense>
    </StudioPage>
  );
}

async function Content({ params, searchParams }: Props) {
  const [{ id }, { house }] = await Promise.all([params, searchParams]);
  return <EditRoomPage roomId={id} houseId={house} />;
}
