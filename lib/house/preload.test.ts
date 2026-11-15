import { describe, expect, it } from "vitest";
import { fileKind, preloadFiles } from "./preload";

describe("fileKind", () => {
  it("reads the extension before the query string", () => {
    expect(fileKind("/rooms/garden.svg")).toBe("image");
    expect(fileKind("/api/files/h/a/animate.mp4?t=x")).toBe("video");
    expect(fileKind("/api/files/h/voice.M4A?t=x")).toBe("audio");
    expect(fileKind("/api/files/h/object.glb")).toBe("model");
    expect(fileKind("/api/files/h/noext")).toBe("other");
  });
});

describe("preloadFiles", () => {
  it("loads each unique file once and reports failures without throwing", async () => {
    const seen: string[] = [];
    const failed = await preloadFiles(["/a.png", "/b.mp4", "/a.png", "/c.mp3"], async (url) => {
      seen.push(url);
      if (url === "/b.mp4") throw new Error("404");
    });
    expect(seen.sort()).toEqual(["/a.png", "/b.mp4", "/c.mp3"]);
    expect([...failed]).toEqual(["/b.mp4"]);
  });

  it("gives up on a file that hangs", async () => {
    const failed = await preloadFiles(["/slow.mp4"], () => new Promise(() => {}), 10);
    expect([...failed]).toEqual(["/slow.mp4"]);
  });
});
