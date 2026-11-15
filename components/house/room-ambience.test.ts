import { describe, expect, it } from "vitest";
import { ambienceKind, lightPhase } from "./room-ambience";

describe("room ambience (B18)", () => {
  it("matches particles to the Room from its photo or name", () => {
    expect(ambienceKind({ background: "/rooms/garden.jpg", name: "Garden" })).toBe("pollen");
    expect(ambienceKind({ background: "/api/files/h/r.jpg", name: "Grandma's kitchen" })).toBe(
      "steam",
    );
    expect(ambienceKind({ background: "/rooms/living-room.jpg", name: "Living room" })).toBe(
      "dust",
    );
  });
  it("picks a light for each part of the day", () => {
    expect(lightPhase(7)).toBe("morning");
    expect(lightPhase(13)).toBe("day");
    expect(lightPhase(19)).toBe("evening");
    expect(lightPhase(23)).toBe("night");
    expect(lightPhase(3)).toBe("night");
  });
});
