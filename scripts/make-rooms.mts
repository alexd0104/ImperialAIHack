// `pnpm rooms:make`: public/rooms/src/<name>.jpg → public/rooms/<name>.jpg (1194×834, ≤ 400 KB).
// AI_MODE=mock (default) only crops/resizes; AI_MODE=live runs the fal room cleanup first.
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { cleanRoomPhoto } from "@/lib/ai/room-photo";

const dir = path.join(process.cwd(), "public", "rooms");
const sources = (await readdir(path.join(dir, "src"))).filter((f) => /\.(jpe?g|png)$/i.test(f));
if (sources.length === 0) console.error("No photos in public/rooms/src");
for (const file of sources) {
  const name = path.parse(file).name;
  const out = await cleanRoomPhoto(await readFile(path.join(dir, "src", file)));
  await writeFile(path.join(dir, `${name}.jpg`), out);
  console.log(`${name}.jpg  ${Math.round(out.length / 1024)} KB`);
}
