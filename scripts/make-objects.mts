// `pnpm objects:make`: public/objects/src/<name>.{png,jpg} → public/objects/glb/<name>.glb (≤ 3 MB)
// + public/objects/thumbs/<name>.png. AI_MODE=mock (default) writes the mock GLB.
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { defaultObjectName, makeDefaultObject } from "@/lib/ai/object-3d";

const dir = path.join(process.cwd(), "public", "objects");
await mkdir(path.join(dir, "glb"), { recursive: true });
await mkdir(path.join(dir, "thumbs"), { recursive: true });
const sources = (await readdir(path.join(dir, "src"))).filter((f) => /\.(jpe?g|png)$/i.test(f));
if (sources.length === 0) console.error("No photos in public/objects/src");
for (const file of sources) {
  const name = defaultObjectName(file);
  const { glb, thumb } = await makeDefaultObject(await readFile(path.join(dir, "src", file)));
  await writeFile(path.join(dir, "glb", `${name}.glb`), glb);
  await writeFile(path.join(dir, "thumbs", `${name}.png`), thumb);
  console.log(`${name}.glb  ${Math.round(glb.length / 1024)} KB`);
}
