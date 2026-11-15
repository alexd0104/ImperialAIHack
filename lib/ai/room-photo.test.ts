import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { cleanRoomPhoto, ROOM_HEIGHT, ROOM_MAX_BYTES, ROOM_WIDTH } from "./room-photo";

describe("cleanRoomPhoto (mock mode)", () => {
  it("crops to 1194×834 jpeg under 400 KB", async () => {
    const src = await sharp({
      create: { width: 3000, height: 1500, channels: 3, background: "#a86" },
    })
      .jpeg()
      .toBuffer();
    const out = await cleanRoomPhoto(src);
    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([ROOM_WIDTH, ROOM_HEIGHT, "jpeg"]);
    expect(out.length).toBeLessThanOrEqual(ROOM_MAX_BYTES);
  });
});
